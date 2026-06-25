export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((value) => value.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

export async function fetchCsv(path: string): Promise<CsvRow[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo leer el recurso ${path}`);
  }
  return parseCsv(await response.text());
}
