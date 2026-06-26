import {
  parseBlockModelCsv,
  reconcileBlockModelCatalog,
  type BlockModelCatalog,
  type BlockModelDataset,
  type BlockModelManifest,
  type BlockModelManifestFile,
} from './blockModelParser';

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

export async function loadBlockModelCatalog(
  manifestUrl = '/data/block-model/block-model-manifest.json',
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
