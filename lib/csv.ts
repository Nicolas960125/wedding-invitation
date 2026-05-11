import Papa from 'papaparse';
import { csvRowSchema, type CsvRow, type ImportGroupPayload } from './schemas/csvRow';

export type CsvParseError = { line: number; message: string };

export type CsvParseResult =
  | { ok: true; rows: CsvRow[]; payloads: ImportGroupPayload[]; warnings: string[] }
  | { ok: false; errors: CsvParseError[] };

export function parseGuestsCsv(content: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
    transformHeader: (h) => h.trim(),
  });

  const errors: CsvParseError[] = [];

  for (const e of parsed.errors) {
    errors.push({
      line: (e.row ?? 0) + 2,
      message: `${e.code}: ${e.message}`,
    });
  }

  const rows: CsvRow[] = [];
  for (let i = 0; i < parsed.data.length; i++) {
    const result = csvRowSchema.safeParse(parsed.data[i]);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const formErrors = result.error.flatten().formErrors;
      const messages = [
        ...formErrors,
        ...Object.entries(fieldErrors).flatMap(([f, msgs]) =>
          (msgs ?? []).map((m) => `${f}: ${m}`),
        ),
      ];
      errors.push({ line: i + 2, message: messages.join('; ') || 'Fila invalida' });
    } else {
      rows.push(result.data);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const payloads: ImportGroupPayload[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    try {
      payloads.push(expandRowToPayload(row));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ line: rows.indexOf(row) + 2, message: msg });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows, payloads, warnings };
}

export function expandRowToPayload(row: CsvRow): ImportGroupPayload {
  const provided: string[] = row.companionNames
    ? row.companionNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (provided.length > row.companionCount) {
    throw new Error(
      `"${row.name}": tiene ${provided.length} nombres de acompañantes pero Acompañante=${row.companionCount}`,
    );
  }

  const companions: string[] = [...provided];
  while (companions.length < row.companionCount) {
    companions.push(`Acompañante ${companions.length + 1}`);
  }

  return {
    display_name: row.name,
    relationship: row.relationship,
    max_attendees: 1 + row.companionCount,
    primary_name: row.name,
    primary_title: row.title,
    companion_names: companions,
  };
}

export const CSV_HEADERS = [
  'Nombre',
  'Parentezco',
  'Acompañante',
  'Nombre acompañantes',
  'Título',
] as const;

export function generateCsvTemplate(): string {
  const example = [
    'Nombre,Parentezco,Acompañante,Nombre acompañantes,Título',
    '"Paola Rivas","mamá del novio",3,"Fabio Reyes, Sebastián Rivas, Andrés Felipe Rivas",Sra.',
    '"Erick Gonzalez","Amigo",0,,Sr.',
    '"Valeria Llanos","Amigo",1,"Karol",Srita.',
    '"Shalma Urazán","Amigo",1,,',
  ];
  return example.join('\n');
}
