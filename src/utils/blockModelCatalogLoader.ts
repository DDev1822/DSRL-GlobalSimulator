import {
  parseBlockModelCsv,
  reconcileBlockModelCatalog,
  type BlockModelCatalog,
  type BlockModelDataset,
  type BlockModelManifest,
  type BlockModelManifestFile,
} from './blockModelParser';

export interface BlockModelCatalogCacheState {
  status: 'empty' | 'loading' | 'ready' | 'error';
  loadCount: number;
  hitCount: number;
  loadedAtIso: string | null;
  manifestUrl: string | null;
  error: string | null;
}

interface CatalogCache {
  manifestUrl: string | null;
  promise: Promise<BlockModelCatalog> | null;
  value: BlockModelCatalog | null;
  state: BlockModelCatalogCacheState;
}

const cache: CatalogCache = {
  manifestUrl: null,
  promise: null,
  value: null,
  state: {
    status: 'empty',
    loadCount: 0,
    hitCount: 0,
    loadedAtIso: null,
    manifestUrl: null,
    error: null,
  },
};

function candidateToPublicUrl(candidate: string): string {
  const normalized = candidate.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('public/')) {
    return `/${normalized.slice('public/'.length)}`;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function looksLikeHtml(text: string, contentType: string | null): boolean {
  const prefix = text.trimStart().slice(0, 256).toLowerCase();
  return (
    contentType?.toLowerCase().includes('text/html') === true ||
    prefix.startsWith('<!doctype html') ||
    prefix.startsWith('<html') ||
    prefix.includes('<head>') ||
    prefix.includes('<script type="module"')
  );
}

async function loadCandidate(
  url: string,
  sourceName: string,
): Promise<BlockModelDataset> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  if (looksLikeHtml(text, response.headers.get('content-type'))) {
    throw new Error('La ruta devolvió HTML en lugar de CSV.');
  }

  const dataset = parseBlockModelCsv(text, {
    sourceName,
    sourcePath: url,
  });

  if (dataset.report.missingRequiredHeaders.length > 0) {
    throw new Error(
      `No cumple contrato CSV: faltan ${dataset.report.missingRequiredHeaders.join(', ')}.`,
    );
  }

  if (dataset.report.headerCount < 13) {
    throw new Error(
      `Respuesta incompatible: solo ${dataset.report.headerCount} encabezados.`,
    );
  }

  return dataset;
}

async function loadFirstValidCandidate(
  definition: BlockModelManifestFile,
): Promise<BlockModelDataset> {
  const attempted: string[] = [];
  const reasons: string[] = [];

  for (const candidate of definition.expectedPathCandidates) {
    const url = candidateToPublicUrl(candidate);
    if (attempted.includes(url)) continue;
    attempted.push(url);

    try {
      return await loadCandidate(url, definition.fileName);
    } catch (reason: unknown) {
      reasons.push(
        `${url}: ${reason instanceof Error ? reason.message : 'respuesta inválida'}`,
      );
    }
  }

  throw new Error(
    `No se encontró un CSV válido para ${definition.fileName}. ` +
      `Rutas intentadas: ${attempted.join(', ')}. ` +
      `Detalle: ${reasons.join(' | ')}.`,
  );
}

async function loadCatalogUncached(
  manifestUrl: string,
): Promise<BlockModelCatalog> {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar el manifiesto del modelo: HTTP ${response.status}.`,
    );
  }

  const manifestText = await response.text();
  if (looksLikeHtml(manifestText, response.headers.get('content-type'))) {
    throw new Error('La ruta del manifiesto devolvió HTML en lugar de JSON.');
  }

  let manifest: BlockModelManifest;
  try {
    manifest = JSON.parse(manifestText) as BlockModelManifest;
  } catch {
    throw new Error('El manifiesto del modelo no contiene JSON válido.');
  }

  const [primary, control] = await Promise.all([
    loadFirstValidCandidate(manifest.primaryModel),
    loadFirstValidCandidate(manifest.controlModel),
  ]);

  return {
    contractVersion: manifest.contractVersion,
    primary,
    control,
    reconciliation: reconcileBlockModelCatalog(primary, control),
  };
}

export function getBlockModelCatalogCacheState(): BlockModelCatalogCacheState {
  return { ...cache.state };
}

export function invalidateBlockModelCatalogCache(): void {
  cache.manifestUrl = null;
  cache.promise = null;
  cache.value = null;
  cache.state = {
    status: 'empty',
    loadCount: cache.state.loadCount,
    hitCount: cache.state.hitCount,
    loadedAtIso: null,
    manifestUrl: null,
    error: null,
  };
}

export async function loadBlockModelCatalog(
  manifestUrl = '/data/block-model/block-model-manifest.json',
  forceReload = false,
): Promise<BlockModelCatalog> {
  if (forceReload) invalidateBlockModelCatalogCache();

  if (cache.value && cache.manifestUrl === manifestUrl) {
    cache.state.hitCount += 1;
    return cache.value;
  }

  if (cache.promise && cache.manifestUrl === manifestUrl) {
    cache.state.hitCount += 1;
    return cache.promise;
  }

  cache.manifestUrl = manifestUrl;
  cache.state = {
    ...cache.state,
    status: 'loading',
    loadCount: cache.state.loadCount + 1,
    manifestUrl,
    error: null,
  };

  cache.promise = loadCatalogUncached(manifestUrl)
    .then((catalog) => {
      cache.value = catalog;
      cache.state = {
        ...cache.state,
        status: 'ready',
        loadedAtIso: new Date().toISOString(),
        error: null,
      };
      return catalog;
    })
    .catch((reason: unknown) => {
      const message =
        reason instanceof Error ? reason.message : 'Error desconocido de catálogo.';
      cache.promise = null;
      cache.value = null;
      cache.state = {
        ...cache.state,
        status: 'error',
        error: message,
      };
      throw reason;
    });

  return cache.promise;
}
