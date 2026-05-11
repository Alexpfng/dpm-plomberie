import * as XLSX from 'xlsx';

const KEY = 'dpm_catalog';

export function saveCatalog(products) {
  localStorage.setItem(KEY, JSON.stringify(products));
}

export function loadCatalog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

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
