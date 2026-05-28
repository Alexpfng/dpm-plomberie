import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const KEY = 'dpm_catalog';
const TABLE = 'catalog_products';
const MAX_LOCAL_CACHE_PRODUCTS = 5000;
// Champs légers pour l'affichage seul (sans description_cctp/search_text qui alourdissent les pages)
const DB_DISPLAY_FIELDS = 'id,ref,description,unite,prix_achat,prix_vente,fournisseur,famille,source,source_sheet';
// Champs complets pour le matching DPGF/CCTP (TenderMatchScreen)
const DB_MATCH_FIELDS = 'id,ref,description,unite,prix_achat,prix_vente,fournisseur,famille,description_cctp,search_text,source,source_sheet';
let memoryCatalog = null;
let memoryCatalogHasMatchFields = false;

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const EXTRA_FIELDS = ['source', 'sourceSheet', 'prixVente', 'descriptionCctp', 'searchText'];

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

function formatCatalogError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  if (message.includes(`Could not find the table 'public.${TABLE}'`)) {
    return 'La table Supabase "catalog_products" est absente. Exécute le schéma SQL mis à jour avant de réimporter le catalogue.';
  }

  return message;
}

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────

function isRealProduct(p) {
  return p.prixAchat > 0 || (p.description && p.description.trim()) || (p.ref && p.ref.trim());
}

function saveLocal(products) {
  // Ne pas persister les lignes fantômes créées par addRow mais jamais validées
  const toSave = products.filter(isRealProduct);
  // Catalogue trop volumineux pour localStorage → on n'écrit rien plutôt que de tronquer
  // (un cache partiel fausserait le matching DPGF la session suivante)
  if (toSave.length > MAX_LOCAL_CACHE_PRODUCTS) {
    try { localStorage.removeItem(KEY); } catch { /* localStorage indisponible */ }
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* localStorage indisponible */ }
  }
}

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    // Rétro-compat : ancien format = tableau direct, ou objet { products: [...] } d'une version intermédiaire
    const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.products) ? raw.products : []);
    return data.filter(isRealProduct);
  } catch { return []; }
}

function mergeCatalogMetadata(products) {
  const previous = loadLocal();
  const byId = new Map(previous.map((product) => [product.id, product]));
  const byRef = new Map(previous.filter((product) => product.ref).map((product) => [product.ref, product]));

  return products.map((product) => {
    const previousProduct = byId.get(product.id) || (product.ref ? byRef.get(product.ref) : null);
    if (!previousProduct) return product;

    const extras = {};
    EXTRA_FIELDS.forEach((field) => {
      if (previousProduct[field]) extras[field] = previousProduct[field];
    });
    return Object.keys(extras).length ? { ...product, ...extras } : product;
  });
}

function setCatalogCache(products, hasMatchFields = false) {
  memoryCatalog = products;
  memoryCatalogHasMatchFields = hasMatchFields;
  saveLocal(products);
}

export function catalogHasMatchFields() { return memoryCatalogHasMatchFields; }

// ─── SUPABASE PERSISTENCE ─────────────────────────────────────────────────────

function mapCatalogRows(rows) {
  return rows.map(r => ({
    id: r.id,
    ref: r.ref,
    description: r.description,
    unite: r.unite,
    prixAchat: parseFloat(r.prix_achat),
    prixVente: parseFloat(r.prix_vente) || 0,
    fournisseur: r.fournisseur,
    famille: r.famille,
    descriptionCctp: r.description_cctp || '',
    searchText: r.search_text || '',
    source: r.source || '',
    sourceSheet: r.source_sheet || '',
  }));
}

export async function loadCatalogFromDB(onProgress, { matchFields = true } = {}) {
  const fields = matchFields ? DB_MATCH_FIELDS : DB_DISPLAY_FIELDS;

  // Si l'affichage seul est demandé mais que le catalogue complet est déjà en mémoire, on évite un aller-retour
  if (!matchFields && memoryCatalog && memoryCatalogHasMatchFields) {
    if (typeof onProgress === 'function') onProgress(memoryCatalog, { done: true });
    return memoryCatalog;
  }

  const PAGE = 1000;
  const { data: firstPage, error: firstError } = await supabase
    .from(TABLE)
    .select(fields)
    // Tri sur la clé primaire (indexée) plutôt que created_at (potentiellement non indexé)
    .order('id', { ascending: true })
    .range(0, PAGE - 1);

  if (firstError) {
    throw new Error(formatCatalogError(firstError, 'Chargement du catalogue impossible.'));
  }

  let allData = firstPage || [];
  let mergedProducts = mergeCatalogMetadata(mapCatalogRows(allData));
  setCatalogCache(mergedProducts, matchFields);
  if (typeof onProgress === 'function') {
    onProgress(mergedProducts, { done: allData.length < PAGE });
  }

  if (allData.length >= PAGE) {
    let from = PAGE;
    while (true) {
      const { data, error } = await supabase
        .from(TABLE)
        .select(fields)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) {
        throw new Error(formatCatalogError(error, 'Chargement du catalogue impossible.'));
      }
      if (!data?.length) break;

      allData = allData.concat(data);
      mergedProducts = mergeCatalogMetadata(mapCatalogRows(allData));
      setCatalogCache(mergedProducts, matchFields);
      if (typeof onProgress === 'function') {
        onProgress(mergedProducts, { done: data.length < PAGE });
      }

      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  return mergedProducts;
}

const toRow = p => ({
  id: p.id,
  ref: p.ref || '',
  description: p.description || '',
  unite: p.unite || '',
  prix_achat: p.prixAchat || 0,
  prix_vente: p.prixVente || 0,
  fournisseur: p.fournisseur || '',
  famille: p.famille || '',
  description_cctp: p.descriptionCctp || '',
  search_text: p.searchText || '',
  source: p.source || '',
  source_sheet: p.sourceSheet || '',
});

export async function upsertProductsToDB(products) {
  if (!products.length) return;
  const failures = [];

  // Chunking par 500 pour ne pas dépasser la taille max des requêtes Supabase
  const CHUNK = 500;
  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(TABLE)
      .upsert(chunk.map(toRow), { onConflict: 'id' });
    if (error) {
      failures.push(`lot ${Math.floor(i / CHUNK) + 1}: ${formatCatalogError(error, 'Sauvegarde du catalogue impossible.')}`);
    }
  }

  if (failures.length) {
    throw new Error(`Échec de sauvegarde catalogue (${failures.length} lot${failures.length > 1 ? 's' : ''}) : ${failures[0]}`);
  }
}

export async function deleteProductsFromDB(ids) {
  if (!ids.length) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .in('id', ids);
  if (error) throw new Error(formatCatalogError(error, 'Suppression catalogue impossible.'));
}

export async function clearCatalogDB() {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .neq('id', '');
  if (error) throw new Error(formatCatalogError(error, 'Vidage catalogue impossible.'));
}

// Compatibilité synchrone (cache local uniquement)
export function saveCatalog(products) { setCatalogCache(products); }
export function loadCatalog() { return memoryCatalog ?? loadLocal(); }

// ─── EXCEL IMPORT ─────────────────────────────────────────────────────────────

function detectColumns(headerRow) {
  const cols = { ref: -1, desc: -1, unite: -1, prixAchat: -1, fournisseur: -1, famille: -1 };
  headerRow.forEach((cell, i) => {
    const c = String(cell ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if      (c.match(/^ref|^code|^article$|^n[°o]/))               cols.ref = i;
    else if (c.match(/design|libel|description|produit|nature/))    cols.desc = i;
    else if (c.match(/^uni?t/))                                     cols.unite = i;
    else if (c.match(/achat|pa\b|p\.a\.|cout|coût|net|tarif/))      cols.prixAchat = i;
    else if (c.match(/fourn|supplier|fabricant/))                   cols.fournisseur = i;
    else if (c.match(/famil|categ|type/))                           cols.famille = i;
  });
  return cols;
}

function detectBatiprixColumns(headerRow) {
  const cols = { code: -1, ouvrage: -1, unite: -1, prixAchat: -1, prixVente: -1, descriptionCctp: -1 };
  headerRow.forEach((cell, i) => {
    const c = String(cell ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (c === 'code') cols.code = i;
    else if (c.includes('ouvrage')) cols.ouvrage = i;
    else if (c.startsWith('uni')) cols.unite = i;
    else if (c.includes('prix achat')) cols.prixAchat = i;
    else if (c.includes('prix vente')) cols.prixVente = i;
    else if (c.includes('description') || c.includes('infos cctp')) cols.descriptionCctp = i;
  });
  return cols;
}

function makeStableId(ref, desc, fallbackIndex) {
  const base = String(ref || desc || fallbackIndex || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `catalog-${fallbackIndex}`;
}

function cleanBatiprixText(value) {
  return String(value ?? '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/Plus d['’]infos/gi, ' ')
    .replace(/Corps d[’']etat/gi, ' ')
    .replace(/Plus de filtres/gi, ' ')
    .replace(/\b\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\b/g, ' ')
    .replace(/Batiprix Web - Recherche ouvrages/gi, ' ')
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/[þ↑]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBatiprixDescription(value) {
  return cleanBatiprixText(value)
    .replace(/\bDescription\s*:.*$/i, ' ')
    .replace(/\b\d{2}(?:\s\d{2}){5}\b.*$/g, '')
    .replace(/\d+[,.]\d{2}\s*€.*$/g, ' ')
    .replace(/\b\d+\s*\/\s*\d+\b.*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBatiprixLabel(value) {
  return cleanBatiprixDescription(value)
    .replace(/\bDescription\s*:.*$/i, ' ')
    .replace(/\b\d{2}(?:\s\d{2}){5}\b.*$/g, '')
    .replace(/\d+[,.]\d{2}\s*€.*$/g, ' ')
    .replace(/\b(?:m²|m3|m²|ml|u|ens|h)\b.*$/i, '')
    .trim();
}

function inferBatiprixFamily(code) {
  const prefix = String(code || '').trim().slice(0, 2);
  return prefix ? `Batiprix ${prefix}` : 'Batiprix';
}

function parseBatiprixWorkbook(wb) {
  const sheetName = wb.SheetNames.find((name) => /ouvrages/i.test(name)) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false });
  const cctpSheetName = wb.SheetNames.find((name) => /cctp/i.test(name));
  const cctpRows = cctpSheetName
    ? XLSX.utils.sheet_to_json(wb.Sheets[cctpSheetName], { header: 1, defval: '', raw: false })
    : [];

  const headerIndex = rows.findIndex((row) => {
    const cols = detectBatiprixColumns(row);
    return cols.code >= 0 && cols.ouvrage >= 0 && cols.prixAchat >= 0;
  });

  if (headerIndex === -1) {
    throw new Error('Format Batiprix non reconnu dans la feuille Ouvrages.');
  }

  const cols = detectBatiprixColumns(rows[headerIndex]);
  const cctpHeaderIndex = cctpRows.findIndex((row) => {
    const detected = detectBatiprixColumns(row);
    return detected.code >= 0 && detected.ouvrage >= 0;
  });
  const cctpCols = cctpHeaderIndex >= 0 ? detectBatiprixColumns(cctpRows[cctpHeaderIndex]) : null;

  const toNum = (v) => {
    const normalized = String(v ?? '')
      .replace(/\s/g, '')
      .replace(/€/g, '')
      .replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const cctpByCode = new Map();
  if (cctpCols) {
    for (let r = cctpHeaderIndex + 1; r < cctpRows.length; r++) {
      const row = cctpRows[r];
      const code = String(row[cctpCols.code] ?? '').trim();
      if (!code) continue;
      const descriptionCctp = cleanBatiprixDescription(row[cctpCols.descriptionCctp] ?? '');
      if (descriptionCctp) cctpByCode.set(code, descriptionCctp);
    }
  }

  const products = [];
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const code = String(row[cols.code] ?? '').trim();
    const ouvrage = cleanBatiprixLabel(row[cols.ouvrage] ?? '');
    const prixAchat = toNum(row[cols.prixAchat]);
    if (!code || !ouvrage || prixAchat <= 0) continue;

    const descriptionCctp = cctpByCode.get(code) || cleanBatiprixDescription(row[cols.descriptionCctp] ?? '');
    const prixVente = cols.prixVente >= 0 ? toNum(row[cols.prixVente]) : 0;
    const searchText = [ouvrage, descriptionCctp].filter(Boolean).join(' ');

    products.push({
      id: `batiprix-${makeStableId(code, ouvrage, r)}`,
      ref: code,
      description: ouvrage,
      unite: cols.unite >= 0 ? String(row[cols.unite] ?? '').trim() : '',
      prixAchat,
      fournisseur: 'Batiprix',
      famille: inferBatiprixFamily(code),
      prixVente,
      descriptionCctp,
      searchText,
      source: 'batiprix',
      sourceSheet: sheetName,
    });
  }

  if (!products.length) {
    throw new Error('Aucun ouvrage Batiprix exploitable trouvé dans le fichier.');
  }

  return products;
}

export function parseCatalogExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

        const isBatiprixWorkbook = wb.SheetNames.some((name) => /ouvrages/i.test(name))
          || rows.slice(0, 6).some((row) => {
            const cols = detectBatiprixColumns(row);
            return cols.code >= 0 && cols.ouvrage >= 0 && cols.prixAchat >= 0;
          });

        if (isBatiprixWorkbook) {
          resolve(parseBatiprixWorkbook(wb));
          return;
        }

        // Find header row (first row that has a price column)
        let hi = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const cols = detectColumns(rows[i]);
          if (cols.prixAchat >= 0 && (cols.desc >= 0 || cols.ref >= 0)) { hi = i; break; }
        }
        if (hi === -1) {
          reject(new Error('Colonnes non reconnues. Vérifiez que le fichier contient des colonnes "Désignation" et "Prix achat".'));
          return;
        }

        const cols = detectColumns(rows[hi]);
        const toNum = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };

        const products = [];
        for (let r = hi + 1; r < rows.length; r++) {
          const row = rows[r];
          const desc = cols.desc >= 0 ? String(row[cols.desc] ?? '').trim() : '';
          const ref  = cols.ref >= 0  ? String(row[cols.ref]  ?? '').trim() : '';
          if (!desc && !ref) continue;
          const pa = toNum(row[cols.prixAchat]);
          if (pa <= 0) continue; // skip rows with no price

          products.push({
            id: `catalog-${makeStableId(ref, desc, r)}`,
            ref,
            description: desc || ref,
            unite:       cols.unite      >= 0 ? String(row[cols.unite]      ?? '').trim() : '',
            prixAchat:   pa,
            fournisseur: cols.fournisseur >= 0 ? String(row[cols.fournisseur] ?? '').trim() : '',
            famille:     cols.famille    >= 0 ? String(row[cols.famille]    ?? '').trim() : '',
          });
        }
        if (!products.length) reject(new Error('Aucun produit avec prix trouvé.'));
        else resolve(products);
      } catch (err) {
        reject(new Error('Erreur lecture : ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsArrayBuffer(file);
  });
}

function readPdfArrayBuffer(file) {
  if (file && typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().catch(() => readPdfArrayBufferFallback(file));
  }
  return readPdfArrayBufferFallback(file);
}

function readPdfArrayBufferFallback(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Impossible de lire le fichier PDF.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── PDF IMPORT ───────────────────────────────────────────────────────────────

export async function parseCatalogPdf(file) {
  const arrayBuffer = await readPdfArrayBuffer(file);
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  const toNum = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };

  // Extract all rows as joined strings, grouped by Y coordinate across all pages
  const allRows = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const byY = new Map();
    for (const item of content.items) {
      const y = Math.round(item.transform[5] / 4) * 4;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y).push({ x: item.transform[4], str: item.str.trim() });
    }
    const sorted = [...byY.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of sorted) {
      const rowStr = items
        .filter(it => it.str)
        .sort((a, b) => a.x - b.x)
        .map(it => it.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (rowStr) allRows.push(rowStr);
    }
  }

  const products = [];
  let inDataSection = false;

  for (const rowStr of allRows) {
    // Detect page footer → reset so next page header is re-detected
    if (/page\s+\d+\s+sur\s+\d+/i.test(rowStr)) {
      inDataSection = false;
      continue;
    }

    // Detect data section header row (contains "design/libel" AND "prix/net/achat")
    if (!inDataSection) {
      const lower = rowStr.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if ((lower.includes('design') || lower.includes('libel') || lower.includes('descr')) &&
          (lower.includes('prix') || lower.includes('net') || lower.includes('achat'))) {
        inDataSection = true;
      }
      continue;
    }

    // Pattern 1 — PUM / distributor format: "NNN - NNNNN  DESIGNATION  PRIX,XX"
    // Ref is digits-dash-digits, description is text, price is last decimal number
    const m1 = rowStr.match(/^(\*?\d+\s*-\s*\d+)\s+(.+)\s+(\d+[,.]\d{2})\s*$/);
    if (m1) {
      const price = toNum(m1[3]);
      if (price > 0) {
        products.push({
          id: `pdf-${products.length}-${Date.now()}`,
          ref: m1[1].replace(/\s+/g, ' ').trim(),
          description: m1[2].trim().replace(/^\*\s*/, ''),
          unite: '',
          prixAchat: price,
          fournisseur: '',
          famille: '',
        });
      }
      continue;
    }

    // Pattern 2 — generic: "REF  DESIGNATION  PRIX,XX" with double-space separators
    const m2 = rowStr.match(/^(.+?)\s{2,}(.+)\s+(\d+[,.]\d{2})\s*$/);
    if (m2) {
      const price = toNum(m2[3]);
      if (price > 0 && m2[2].trim().length > 2) {
        products.push({
          id: `pdf-${products.length}-${Date.now()}`,
          ref: m2[1].trim(),
          description: m2[2].trim(),
          unite: '',
          prixAchat: price,
          fournisseur: '',
          famille: '',
        });
      }
      continue;
    }

    // Pattern 3 — fallback: just description + price at end
    const m3 = rowStr.match(/^(.+?)\s+(\d+[,.]\d{2})\s*$/);
    if (m3) {
      const price = toNum(m3[2]);
      if (price > 0 && m3[1].trim().length > 3) {
        products.push({
          id: `pdf-${products.length}-${Date.now()}`,
          ref: '',
          description: m3[1].trim(),
          unite: '',
          prixAchat: price,
          fournisseur: '',
          famille: '',
        });
      }
    }
  }

  if (!products.length) throw new Error('Aucun produit avec prix trouvé dans le PDF. Vérifiez que le fichier contient un tableau avec colonnes désignation et prix.');
  return products;
}

// ─── MATCHING ─────────────────────────────────────────────────────────────────

const normStr = s => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/([a-z]+)(\d+)/g, '$1 $2')
  .replace(/(\d+)([a-z]+)/g, '$1 $2')
  .replace(/(\d)\s*-\s*(\d)/g, '$1 $2')
  .replace(/dn\s*(\d+)/g, 'dn $1')
  .replace(/fi\s*(\d+)/g, 'fi $1')
  .replace(/ep\s*(\d+)/g, 'ep $1')
  .replace(/lave[\s-]?mains?/g, ' lavabo ')
  .replace(/lavabos?/g, ' lavabo ')
  .replace(/vasques?/g, ' lavabo ')
  .replace(/robinetterie/g, ' robinet ')
  .replace(/mitigeurs?/g, ' robinet ')
  .replace(/robinets?/g, ' robinet ')
  .replace(/cuvettes?/g, ' wc ')
  .replace(/toilettes?/g, ' wc ')
  .replace(/suspendu(?:e|s)?/g, ' suspendu ')
  .replace(/sur[eé]lev[eé](?:e|es|s)?/g, ' rehausse ')
  .replace(/handicap[eé]s?/g, ' pmr ')
  .replace(/accessible?s?/g, ' pmr ')
  .replace(/laiton chrom[eé]/g, ' chrome ')
  .replace(/monotrou/g, ' mono ')
  .replace(/autoportant(?:e|s)?/g, ' sur colonne ')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const STOP = new Set(['de','du','des','le','la','les','en','et','au','aux','un','une','par','sur','sous','dans','pour','avec','sans','ou','a','l','d','est','sont','cette','tout','tous']);
const IMPORTANT_SHORT_TERMS = new Set(['dn', 'ep', 'ef', 'ec', 'eu', 'ev', 'fi', 'nf', 'bs', 'pm', 'mm', 'cm', 'ml', 'pc', 'u']);
const TERM_ALIASES = new Map([
  ['lavabo', ['lavabo', 'vasque', 'lave', 'mains']],
  ['robinet', ['robinet', 'robinetterie', 'mitigeur', 'melangeur', 'mixer']],
  ['wc', ['wc', 'toilette', 'cuvette']],
  ['pmr', ['pmr', 'handicape', 'accessible']],
  ['vidage', ['vidage', 'bonde', 'siphon']],
  ['fixation', ['fixation', 'support', 'bati', 'console']],
  ['evacuation', ['evacuation', 'tubulure', 'tube', 'pvc']],
]);

function keywords(s) {
  const base = normStr(s).split(' ').filter((w) => {
    if (STOP.has(w)) return false;
    if (IMPORTANT_SHORT_TERMS.has(w)) return true;
    return w.length > 2 || /^\d+$/.test(w);
  });
  const expanded = new Set(base);

  base.forEach((word) => {
    TERM_ALIASES.forEach((aliases, canonical) => {
      if (aliases.includes(word) || canonical === word) {
        expanded.add(canonical);
        aliases.forEach((alias) => expanded.add(alias));
      }
    });
  });

  return [...expanded].filter((w) => !STOP.has(w) && (IMPORTANT_SHORT_TERMS.has(w) || w.length > 2 || /^\d+$/.test(w)));
}

function tokenWeight(token) {
  if (!token) return 0;
  if (/^\d+$/.test(token)) return 3.5;
  if (IMPORTANT_SHORT_TERMS.has(token)) return 2.8;
  if (token.length >= 10) return 3;
  if (token.length >= 7) return 2.4;
  if (token.length >= 5) return 1.8;
  return 1.2;
}

function weightedTokenMap(text) {
  const map = new Map();
  keywords(text).forEach((token) => {
    map.set(token, Math.max(map.get(token) || 0, tokenWeight(token)));
  });
  return map;
}

function normalizedIncludesToken(text, token) {
  return normStr(text).split(' ').includes(token);
}

function countSharedWeighted(queryMap, productMap) {
  let shared = 0;
  queryMap.forEach((weight, token) => {
    if (productMap.has(token)) shared += weight;
  });
  return shared;
}

function getCatalogKeywordIndex(catalog) {
  const buckets = new Map();
  catalog.forEach((product, idx) => {
    const terms = [...new Set(keywords(product.searchText || product.description))];
    terms.forEach((term) => {
      if (!buckets.has(term)) buckets.set(term, []);
      buckets.get(term).push(idx);
    });
  });
  return buckets;
}

// Score similarity between two descriptions (0–1)
function similarity(a, b) {
  const normalizedA = normStr(a);
  const normalizedB = normStr(b);
  const qa = weightedTokenMap(a);
  const qb = weightedTokenMap(b);
  if (!qa.size || !qb.size) return 0;

  const sharedQueryWeight = countSharedWeighted(qa, qb);
  const queryTotal = [...qa.values()].reduce((sum, value) => sum + value, 0);
  const productTotal = [...qb.values()].reduce((sum, value) => sum + value, 0);

  let score = (sharedQueryWeight / queryTotal) * 0.78 + (sharedQueryWeight / productTotal) * 0.22;

  const phraseA = normalizedA.split(' ').filter(Boolean);
  const phraseB = normalizedB.split(' ').filter(Boolean);
  const exactSequence = phraseA.filter((token, index) => token === phraseB[index]).length;
  if (phraseA.length > 1) score += Math.min(0.12, exactSequence / phraseA.length * 0.12);

  qa.forEach((weight, token) => {
    if (normalizedIncludesToken(normalizedB, token)) score += Math.min(0.05, weight * 0.01);
  });

  TERM_ALIASES.forEach((aliases, canonical) => {
    const aHas = aliases.some((term) => normalizedA.includes(term)) || normalizedA.includes(canonical);
    const bHas = aliases.some((term) => normalizedB.includes(term)) || normalizedB.includes(canonical);
    if (aHas && bHas) score += 0.08;
  });

  if (normalizedA.includes('lavabo') && normalizedB.includes('lavabo')) score += 0.08;
  if (normalizedA.includes('robinet') && normalizedB.includes('robinet')) score += 0.08;
  if (normalizedA.includes('wc') && normalizedB.includes('wc')) score += 0.08;
  if (normalizedA.includes('pmr') && normalizedB.includes('pmr')) score += 0.05;

  return Math.min(1, score);
}

export function searchCatalogOptions(query, catalog, limit = 20, context = '', keywordIndex = null) {
  const needle = String(query || '').trim();
  const contextNeedle = String(context || '').trim();
  const effectiveNeedle = [needle, contextNeedle].filter(Boolean).join(' — ').trim();
  if (!effectiveNeedle || !catalog.length) return [];

  const effectiveKeywordIndex = keywordIndex || getCatalogKeywordIndex(catalog);
  const queryKeywords = [...new Set(keywords(needle))];
  const contextKeywords = [...new Set(keywords(contextNeedle))];
  const needleKeywords = [...new Set([...queryKeywords, ...contextKeywords])];
  const candidateIds = new Set();

  needleKeywords.forEach((term) => {
    const matches = effectiveKeywordIndex.get(term);
    if (!matches) return;
    for (const idx of matches) {
      candidateIds.add(idx);
      if (candidateIds.size >= 400) break;
    }
  });

  const candidates = candidateIds.size
    ? [...candidateIds].map((idx) => catalog[idx])
    : catalog.slice(0, 400);

  const hasShortTechnicalQuery = queryKeywords.length > 0 && queryKeywords.length <= 2;
  const minScore = hasShortTechnicalQuery ? 0.08 : 0.12;

  return candidates
    .map((product) => {
      const haystack = product.searchText || product.description;
      const queryScore = needle ? similarity(needle, haystack) : 0;
      const contextScore = contextNeedle ? similarity(contextNeedle, haystack) : 0;
      const combinedScore = similarity(effectiveNeedle, haystack);

      let score = combinedScore;
      if (hasShortTechnicalQuery) {
        score = Math.max(queryScore, combinedScore * 0.92, contextScore * 0.55);
      } else if (needle && contextNeedle) {
        score = Math.max(combinedScore, queryScore * 0.82, contextScore * 0.45);
      }

      return {
        product,
        score,
        source: product.source === 'batiprix' ? 'batiprix' : 'catalog',
      };
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.product.description || '').localeCompare(b.product.description || '', 'fr');
    })
    .slice(0, limit);
}

// Pré-calcule par produit : texte normalisé + carte pondérée des tokens.
// Évite de recalculer normStr/keywords/weightedTokenMap pour chaque comparaison
// (sur 20k+ produits × 600+ lignes, c'est la différence entre 3 minutes et 3 secondes).
function buildProductMatchIndex(catalog) {
  return catalog.map((product) => {
    const text = product.searchText || product.description || '';
    return {
      product,
      normalized: normStr(text),
      tokenMap: weightedTokenMap(text),
    };
  });
}

// Index de mots-clés calculé à partir des données déjà normalisées
function buildKeywordIndexFromMatchIndex(matchIndex) {
  const buckets = new Map();
  matchIndex.forEach((entry, idx) => {
    const terms = [...new Set(entry.tokenMap.keys())];
    terms.forEach((term) => {
      if (!buckets.has(term)) buckets.set(term, []);
      buckets.get(term).push(idx);
    });
  });
  return buckets;
}

// Version rapide de similarity qui consomme directement les structures pré-calculées
function similarityWithMaps(aNormalized, aTokenMap, bNormalized, bTokenMap) {
  if (!aTokenMap.size || !bTokenMap.size) return 0;

  let sharedQueryWeight = 0;
  aTokenMap.forEach((weight, token) => {
    if (bTokenMap.has(token)) sharedQueryWeight += weight;
  });

  let queryTotal = 0;
  aTokenMap.forEach((value) => { queryTotal += value; });
  let productTotal = 0;
  bTokenMap.forEach((value) => { productTotal += value; });

  let score = (sharedQueryWeight / queryTotal) * 0.78 + (sharedQueryWeight / productTotal) * 0.22;

  const phraseA = aNormalized.split(' ').filter(Boolean);
  const phraseB = bNormalized.split(' ').filter(Boolean);
  let exactSequence = 0;
  for (let i = 0; i < phraseA.length; i++) {
    if (phraseA[i] === phraseB[i]) exactSequence++;
  }
  if (phraseA.length > 1) score += Math.min(0.12, exactSequence / phraseA.length * 0.12);

  const bTokenSet = new Set(phraseB);
  aTokenMap.forEach((weight, token) => {
    if (bTokenSet.has(token)) score += Math.min(0.05, weight * 0.01);
  });

  TERM_ALIASES.forEach((aliases, canonical) => {
    const aHas = aliases.some((term) => aNormalized.includes(term)) || aNormalized.includes(canonical);
    const bHas = aliases.some((term) => bNormalized.includes(term)) || bNormalized.includes(canonical);
    if (aHas && bHas) score += 0.08;
  });

  if (aNormalized.includes('lavabo') && bNormalized.includes('lavabo')) score += 0.08;
  if (aNormalized.includes('robinet') && bNormalized.includes('robinet')) score += 0.08;
  if (aNormalized.includes('wc') && bNormalized.includes('wc')) score += 0.08;
  if (aNormalized.includes('pmr') && bNormalized.includes('pmr')) score += 0.05;

  return Math.min(1, score);
}

// Renvoie les top N matchs (avec score) à partir d'un index pré-calculé
function pickTopFromMatchIndex(lineNormalized, lineTokenMap, lineKeywords, matchIndex, keywordIndex, limit = 3) {
  if (!matchIndex.length) return [];

  const candidateIds = new Set();
  lineKeywords.forEach((term) => {
    const matches = keywordIndex.get(term);
    if (!matches) return;
    for (const idx of matches) {
      candidateIds.add(idx);
      if (candidateIds.size >= 250) break;
    }
  });

  const candidates = candidateIds.size
    ? [...candidateIds]
    : Array.from({ length: Math.min(250, matchIndex.length) }, (_, i) => i);

  const scored = [];
  for (const idx of candidates) {
    const entry = matchIndex[idx];
    const score = similarityWithMaps(lineNormalized, lineTokenMap, entry.normalized, entry.tokenMap);
    if (score > 0) scored.push({ product: entry.product, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// Score minimum pour qu'un match soit appliqué automatiquement (prix pré-rempli).
// En dessous, le match est seulement proposé dans la modale ; la ligne reste à 0 €.
// Les bons matchs observés tournent autour de 0,60 ; les coïncidences vers 0,35-0,50.
const AUTO_APPLY_MIN_SCORE = 0.55;

function buildCatalogLineMatcher(catalog) {
  const supplierCatalog = catalog.filter((product) => product.source !== 'batiprix');
  const batiprixCatalog = catalog.filter((product) => product.source === 'batiprix');
  const supplierMatchIndex = buildProductMatchIndex(supplierCatalog);
  const batiprixMatchIndex = buildProductMatchIndex(batiprixCatalog);
  const supplierKeywordIndex = buildKeywordIndexFromMatchIndex(supplierMatchIndex);
  const batiprixKeywordIndex = buildKeywordIndexFromMatchIndex(batiprixMatchIndex);

  return (line) => {
    const lineText = line.matchText || line.description || '';
    const lineNormalized = normStr(lineText);
    const lineTokenMap = weightedTokenMap(lineText);
    const lineKeywords = [...new Set(lineTokenMap.keys())];

    const supplierTop = pickTopFromMatchIndex(lineNormalized, lineTokenMap, lineKeywords, supplierMatchIndex, supplierKeywordIndex, 3);
    const batiprixTop = pickTopFromMatchIndex(lineNormalized, lineTokenMap, lineKeywords, batiprixMatchIndex, batiprixKeywordIndex, 3);

    const supplierBest = supplierTop[0];
    const batiprixBest = batiprixTop[0];

    const supplierMatch = supplierBest && supplierBest.score >= 0.35
      ? {
          product: supplierBest.product,
          score: supplierBest.score,
          source: 'catalog',
          matchType: 'catalog',
        }
      : null;

    const batiprixMatch = batiprixBest && batiprixBest.score >= 0.2
      ? {
          product: batiprixBest.product,
          score: batiprixBest.score,
          source: 'batiprix',
          matchType: 'batiprix-fallback',
          supplierScore: supplierBest?.score || 0,
        }
      : null;

    // Suggestion « Choix manuel » : 2e meilleur d'une des deux bases, en excluant
    // les deux meilleurs déjà retenus. Évite l'appel coûteux à searchCatalogOptions
    // qui tournait sur le catalogue complet (~1200 comparaisons par ligne).
    const manualCandidates = [...supplierTop.slice(1), ...batiprixTop.slice(1)]
      .filter((entry) =>
        entry.product.id !== supplierBest?.product.id &&
        entry.product.id !== batiprixBest?.product.id
      )
      .sort((a, b) => b.score - a.score);
    const manualBest = manualCandidates[0];
    const manualMatch = manualBest && manualBest.score >= 0.18
      ? {
          product: manualBest.product,
          score: manualBest.score,
          source: manualBest.product.source === 'batiprix' ? 'batiprix' : 'catalog',
          matchType: 'manual-suggestion',
        }
      : null;

    const rankedChoices = [
      supplierMatch ? { key: 'catalog', score: supplierMatch.score } : null,
      batiprixMatch ? { key: 'batiprix', score: batiprixMatch.score } : null,
      manualMatch ? { key: 'manual', score: manualMatch.score } : null,
    ].filter(Boolean).sort((a, b) => b.score - a.score);

    // N'auto-applique un prix QUE si le meilleur match est fiable (>= AUTO_APPLY_MIN_SCORE).
    // Sinon defaultChoice = null : la ligne reste à 0 € (à compléter à la main) et le match
    // reste visible dans la modale pour une sélection manuelle. Évite d'appliquer des prix
    // aberrants quand une ligne vague matche un produit cher sans rapport (VMC, clim…).
    const topChoice = rankedChoices[0];
    const defaultChoice = topChoice && topChoice.score >= AUTO_APPLY_MIN_SCORE ? topChoice.key : null;

    if (!supplierMatch && !batiprixMatch && !manualMatch) return null;

    return {
      lineId: line.id,
      line,
      supplierMatch,
      batiprixMatch,
      manualMatch,
      defaultChoice,
      bestScore: Math.max(supplierMatch?.score || 0, batiprixMatch?.score || 0, manualMatch?.score || 0),
    };
  };
}

// For each DPGF line find the best supplier match and the best Batiprix fallback.
export function matchCatalogToLines(dpgfLines, catalog) {
  if (!catalog.length) return [];
  const matchLine = buildCatalogLineMatcher(catalog);

  return dpgfLines
    .filter((line) => !line.isSection)
    .map(matchLine)
    .filter(Boolean)
    .sort((a, b) => b.bestScore - a.bestScore);
}

export async function matchCatalogToLinesProgressively(dpgfLines, catalog, onProgress, chunkSize = 24) {
  if (!catalog.length) return [];
  const matchLine = buildCatalogLineMatcher(catalog);
  const workLines = dpgfLines.filter((line) => !line.isSection);
  const results = [];

  for (let index = 0; index < workLines.length; index += chunkSize) {
    const chunk = workLines.slice(index, index + chunkSize);
    chunk.forEach((line) => {
      const match = matchLine(line);
      if (match) results.push(match);
    });

    if (typeof onProgress === 'function') {
      onProgress({
        done: Math.min(index + chunk.length, workLines.length),
        total: workLines.length,
      });
    }

    if (index + chunkSize < workLines.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return results.sort((a, b) => b.bestScore - a.bestScore);
}
