import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const KEY = 'dpm_catalog';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// ─── LOCAL CACHE ──────────────────────────────────────────────────────────────

function saveLocal(products) {
  try { localStorage.setItem(KEY, JSON.stringify(products)); } catch {}
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

// ─── SUPABASE PERSISTENCE ─────────────────────────────────────────────────────

export async function loadCatalogFromDB() {
  // Supabase limite à 1000 lignes par défaut — pagination complète
  let allData = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('catalog_products')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const products = allData.map(r => ({
    id: r.id,
    ref: r.ref,
    description: r.description,
    unite: r.unite,
    prixAchat: parseFloat(r.prix_achat),
    fournisseur: r.fournisseur,
    famille: r.famille,
  }));
  saveLocal(products);
  return products;
}

const toRow = p => ({
  id: p.id,
  ref: p.ref || '',
  description: p.description || '',
  unite: p.unite || '',
  prix_achat: p.prixAchat || 0,
  fournisseur: p.fournisseur || '',
  famille: p.famille || '',
});

export async function upsertProductsToDB(products) {
  if (!products.length) return;
  const failures = [];

  // Chunking par 500 pour ne pas dépasser la taille max des requêtes Supabase
  const CHUNK = 500;
  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('catalog_products')
      .upsert(chunk.map(toRow), { onConflict: 'id' });
    if (error) {
      failures.push(`lot ${Math.floor(i / CHUNK) + 1}: ${error.message}`);
    }
  }

  if (failures.length) {
    throw new Error(`Échec de sauvegarde catalogue (${failures.length} lot${failures.length > 1 ? 's' : ''}) : ${failures[0]}`);
  }
}

export async function deleteProductsFromDB(ids) {
  if (!ids.length) return;
  const { error } = await supabase
    .from('catalog_products')
    .delete()
    .in('id', ids);
  if (error) throw new Error(`Suppression catalogue impossible : ${error.message}`);
}

export async function clearCatalogDB() {
  const { error } = await supabase
    .from('catalog_products')
    .delete()
    .neq('id', '');
  if (error) throw new Error(`Vidage catalogue impossible : ${error.message}`);
}

// Compatibilité synchrone (cache local uniquement)
export function saveCatalog(products) { saveLocal(products); }
export function loadCatalog() { return loadLocal(); }

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

export function parseCatalogExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

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
            id: `${r}-${Date.now()}`,
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

// ─── PDF IMPORT ───────────────────────────────────────────────────────────────

export async function parseCatalogPdf(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
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
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const STOP = new Set(['de','du','des','le','la','les','en','et','au','aux','un','une','par','sur','sous','dans','pour','avec','sans','ou','a','l','d','est','sont','cette','tout','tous']);

function keywords(s) {
  return normStr(s).split(' ').filter(w => w.length > 2 && !STOP.has(w));
}

// Score similarity between two descriptions (0–1)
function similarity(a, b) {
  const ka = new Set(keywords(a));
  const kb = new Set(keywords(b));
  if (!ka.size || !kb.size) return 0;
  const inter = [...ka].filter(k => kb.has(k)).length;
  return inter / Math.max(ka.size, kb.size);
}

// For each DPGF line find the best matching catalog product
// Returns array of { lineId, product, score }
export function matchCatalogToLines(dpgfLines, catalog) {
  if (!catalog.length) return [];
  return dpgfLines
    .filter(l => !l.isSection)
    .map(l => {
      let best = null, bestScore = 0;
      for (const p of catalog) {
        const s = similarity(l.description, p.description);
        if (s > bestScore) { bestScore = s; best = p; }
      }
      if (bestScore < 0.2) return null; // below threshold
      return { lineId: l.id, line: l, product: best, score: bestScore };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
