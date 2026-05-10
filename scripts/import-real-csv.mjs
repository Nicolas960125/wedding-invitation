// Import del CSV real de invitados via RPC import_guest_groups.
// Uso:
//   node --env-file=.env.local scripts/import-real-csv.mjs [path-to-csv]
// Default path: tests/fixtures/invitados-real.csv

import Papa from 'papaparse';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = process.argv[2] ?? 'tests/fixtures/invitados-real.csv';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const text = await readFile(CSV_PATH, 'utf-8');

const parsed = Papa.parse(text, {
  header: true,
  skipEmptyLines: 'greedy',
  transform: (v) => (typeof v === 'string' ? v.trim() : v),
  transformHeader: (h) => h.trim(),
});

if (parsed.errors.length > 0) {
  console.error('CSV parse errors:', parsed.errors);
  process.exit(1);
}

const payloads = [];
const errors = [];

parsed.data.forEach((row, i) => {
  const line = i + 2;
  const name = (row['Nombre'] || '').trim();
  const relationship = (row['Parentezco'] || '').trim() || null;
  const rawCount = (row['Acompañante'] || '0').toString().trim();
  const companionCount = Number.parseInt(rawCount, 10);
  const companionNamesRaw = (row['Nombre acompañantes'] || '').trim();

  if (!name) {
    errors.push(`Linea ${line}: Nombre vacio`);
    return;
  }
  if (Number.isNaN(companionCount) || companionCount < 0) {
    errors.push(`Linea ${line} ("${name}"): Acompañante invalido (${rawCount})`);
    return;
  }
  if (companionCount === 0 && companionNamesRaw.length > 0) {
    errors.push(`Linea ${line} ("${name}"): Acompañante=0 pero hay nombres`);
    return;
  }

  const provided = companionNamesRaw
    ? companionNamesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  if (provided.length > companionCount) {
    errors.push(
      `Linea ${line} ("${name}"): ${provided.length} nombres de acompañantes pero Acompañante=${companionCount}`,
    );
    return;
  }

  const companions = [...provided];
  while (companions.length < companionCount) {
    companions.push(`Acompañante ${companions.length + 1}`);
  }

  payloads.push({
    display_name: name,
    relationship,
    max_attendees: 1 + companionCount,
    primary_name: name,
    companion_names: companions,
  });
});

if (errors.length > 0) {
  console.error(`Errores en CSV (${errors.length}):`);
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log(`Parsing OK: ${payloads.length} grupos listos para importar.`);
const totalPersonas = payloads.reduce((acc, g) => acc + g.max_attendees, 0);
console.log(`Total personas (primarios + acompañantes): ${totalPersonas}`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.rpc('import_guest_groups', {
  groups_data: payloads,
});

if (error) {
  console.error('RPC error:', error);
  process.exit(1);
}

console.log(`\nImportados: ${data.length} grupos\n`);

// Exportar tokens.csv para distribuir links por WhatsApp
const csvLines = [
  'Nombre,Parentezco,Aforo,Token,Link',
  ...data.map(
    (g) =>
      `"${g.display_name}","${g.relationship ?? ''}",${g.max_attendees},"${g.token}","${SITE_URL}/invite/${g.token}"`,
  ),
];
const tokensPath = 'tokens.csv';
await writeFile(tokensPath, csvLines.join('\n') + '\n', 'utf-8');
console.log(`Tokens exportados a ${tokensPath}`);

// Tabla preview
console.table(
  data.slice(0, 10).map((g) => ({
    Nombre: g.display_name,
    Parentezco: g.relationship,
    Aforo: g.max_attendees,
    Token: g.token,
  })),
);
if (data.length > 10) console.log(`... y ${data.length - 10} mas en ${tokensPath}`);
