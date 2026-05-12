import Papa from 'papaparse';
import type { ArtboardSpec } from '../types';

/**
 * Expected columns: name, width, height
 * Extra columns (e.g. headline, cta) are kept on the artboard as text overrides
 * and applied to text nodes matching the column name (case-insensitive).
 */
export type ParsedCsv = {
  artboards: ArtboardSpec[];
  /** artboard id → { layerName: newText } */
  overrides: Record<string, Record<string, string>>;
};

export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const artboards: ArtboardSpec[] = [];
        const overrides: ParsedCsv['overrides'] = {};
        data.forEach((row, i) => {
          const id = `ab_${i}`;
          const name = row.name?.trim() || `${row.width}x${row.height}`;
          const width = Number(row.width);
          const height = Number(row.height);
          if (!width || !height) return;
          artboards.push({ id, name, width, height });

          const reserved = new Set(['name', 'width', 'height']);
          const o: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            if (reserved.has(k.toLowerCase()) || v == null) continue;
            o[k] = v;
          }
          if (Object.keys(o).length) overrides[id] = o;
        });
        resolve({ artboards, overrides });
      },
      error: reject,
    });
  });
}
