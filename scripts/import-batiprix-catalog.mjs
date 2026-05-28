import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_FILES = [
  {
    filePath: '/Users/alex/Desktop/Batiprix_Plomberie_Extraction_Complete.xlsx',
    famille: 'plomberie',
  },
  {
    filePath: '/Users/alex/Desktop/Batiprix_Energie_Extraction_Complete.xlsx',
    famille: 'energie',
  },
];

function parseEnvFile(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadSupabaseEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const contents = await fs.readFile(envPath, 'utf8');
  const env = parseEnvFile(contents);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(`Variables Supabase manquantes dans ${envPath}`);
  }

  return { url, key };
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\uE000-\uF8FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let normalized = raw.replace(/[€\s]/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectColumns(headerRow) {
  const headers = headerRow.map(normalizeHeader);
  const columns = {
    code: headers.indexOf('code'),
    ouvrage: headers.findIndex((value) => value === 'ouvrage'),
    unite: headers.findIndex((value) => value.startsWith('uni')),
    prixAchat: headers.findIndex((value) => value.includes('prix achat ht')),
    prixVente: headers.findIndex((value) => value.includes('prix vente ht')),
    descriptionCctp: headers.findIndex(
      (value) => value.includes('description / infos cctp') || value.includes('infos cctp') || value.includes('description')
    ),
  };

  return columns;
}

function buildId(code, sheetName, description) {
  const hashInput = `${code}${sheetName}${description.slice(0, 20)}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
}

function parseWorkbook({ filePath, famille }) {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const rowsToInsert = [];
  const sheetStats = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rows.length) continue;

    const headerIndex = rows.findIndex((row) => {
      const cols = detectColumns(row);
      return cols.code >= 0 && cols.ouvrage >= 0 && cols.unite >= 0 && cols.prixAchat >= 0 && cols.prixVente >= 0;
    });

    if (headerIndex < 0) {
      sheetStats.push({ sheetName, imported: 0, skipped: rows.length, reason: 'missing_required_columns' });
      continue;
    }

    const cols = detectColumns(rows[headerIndex]);
    let imported = 0;
    let skipped = 0;

    for (let idx = headerIndex + 1; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const code = sanitizeText(row[cols.code]);
      const description = sanitizeText(row[cols.ouvrage]);
      const unite = sanitizeText(row[cols.unite]);
      const prixAchat = parseNumber(row[cols.prixAchat]);
      const prixVente = parseNumber(row[cols.prixVente]);
      const descriptionCctp =
        cols.descriptionCctp >= 0
          ? sanitizeText(row[cols.descriptionCctp])
          : '';

      if (!code || !description) {
        skipped += 1;
        continue;
      }

      rowsToInsert.push({
        id: buildId(code, sheetName, description),
        ref: code,
        description,
        unite,
        prix_achat: prixAchat,
        prix_vente: prixVente,
        fournisseur: 'Batiprix',
        famille,
        source_sheet: sheetName,
        description_cctp: descriptionCctp,
      });
      imported += 1;
    }

    sheetStats.push({ sheetName, imported, skipped, reason: null });
  }

  return { rowsToInsert, sheetStats };
}

async function verifyTargetSchema(supabase) {
  const { error } = await supabase
    .from('catalog_products')
    .select('id, ref, description, unite, prix_achat, prix_vente, fournisseur, famille, source_sheet, description_cctp', {
      head: true,
      count: 'exact',
    });

  if (error) {
    throw new Error(`Verification du schema Supabase impossible: ${error.message}`);
  }
}

async function countRowsForFamilies(supabase, families) {
  const { count, error } = await supabase
    .from('catalog_products')
    .select('id', { head: true, count: 'exact' })
    .in('famille', families);

  if (error) {
    throw new Error(`Comptage Supabase impossible: ${error.message}`);
  }

  return count ?? 0;
}

async function insertRows(supabase, rows) {
  const chunkSize = 500;

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const { error } = await supabase
      .from('catalog_products')
      .upsert(chunk, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(`Echec import lot ${Math.floor(start / chunkSize) + 1}: ${error.message}`);
    }
  }
}

function printSummary(parsedFiles) {
  const totalRows = parsedFiles.reduce((sum, file) => sum + file.rowsToInsert.length, 0);
  console.log(`Total lignes preparees: ${totalRows}`);
  for (const file of parsedFiles) {
    console.log(`- ${path.basename(file.filePath)} (${file.famille}): ${file.rowsToInsert.length} lignes`);
    for (const stat of file.sheetStats) {
      const suffix = stat.reason ? `, raison=${stat.reason}` : '';
      console.log(`  - onglet "${stat.sheetName}": ${stat.imported} importees, ${stat.skipped} ignorees${suffix}`);
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { url, key } = await loadSupabaseEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const parsedFiles = DEFAULT_FILES.map(({ filePath, famille }) => {
    const parsed = parseWorkbook({ filePath, famille });
    return { filePath, famille, ...parsed };
  });

  printSummary(parsedFiles);

  const rows = parsedFiles.flatMap((item) => item.rowsToInsert);
  if (!rows.length) {
    throw new Error('Aucune ligne a importer.');
  }

  if (dryRun) {
    return;
  }

  await verifyTargetSchema(supabase);

  const families = [...new Set(parsedFiles.map((item) => item.famille))];
  const beforeCount = await countRowsForFamilies(supabase, families);
  await insertRows(supabase, rows);
  const afterCount = await countRowsForFamilies(supabase, families);

  console.log(`Lignes deja presentes avant import (familles ${families.join(', ')}): ${beforeCount}`);
  console.log(`Lignes presentes apres import (familles ${families.join(', ')}): ${afterCount}`);
  console.log(`Nouvelles lignes ajoutees estimees: ${Math.max(0, afterCount - beforeCount)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
