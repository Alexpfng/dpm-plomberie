import * as XLSX from 'xlsx';

const KEY = 'dpm_tender';

// ─── CCTP PARSING ─────────────────────────────────────────────────────────────

export async function parseCCTPText(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by Y coordinate (same line = same Y ± 3px)
    const byY = new Map();
    for (const item of content.items) {
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y).push({ x: item.transform[4], str: item.str });
    }
    // Sort lines top→bottom, items left→right
    const sorted = [...byY.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of sorted) {
      const line = items.sort((a, b) => a.x - b.x).map(it => it.str).join(' ').trim();
      if (line) allLines.push(line);
    }
  }
  return allLines.join('\n');
}

// Keep for backward compat (no longer needed but exported)
export function parseCCTPSections(text) { return text; }

// ─── QUANTITY EXTRACTION ──────────────────────────────────────────────────────

const norm = s => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s.]/g, ' ');

const STOP = new Set(['de','du','des','le','la','les','en','et','au','aux','un','une','par','sur','sous','dans','pour','avec','sans','ou','a','l','d','est','sont','doit','doivent','cette','tout','tous','bien','etre','leur','leurs','ses','son','sa','ils','elles','nous','vous','qui','que','dont','mais','car']);
const BULLET_RE = /^(?:[-•●▪◦‣]\s+|\d+\)\s+)/;
const SECTION_HEADER_RE = /^\s*\d+(?:\.\d+)+(?:\s*(?:[-–—:.)]|$)|\.\d+)/;
const TECH_PATTERNS = [
  /\d+\s*mm\b/i,
  /\d+\s*cm\b|\d+\s*m\b(?!\w)/i,
  /\d+\s*%/i,
  /galvanis[eé]|nickel[eé]|anodis[eé]|prelaqu[eé]|thermolaqu[eé]/i,
  /acier|aluminium|pvc|cuivre|inox|laiton|fonte|polyethylene|polypropylene|fluide thermo.?conducteur/i,
  /perfor[eé]|ajour[eé]|cloisonn[eé]|tole|tôle|facade|façade/i,
  /norme?s?\b|nf\s*c|nfc\s*\d|iec|ce\b|ute|en\s*\d|electri(?:cite|que)\s+performance/i,
  /\bip\s*\d{2}\b|\bik\s*\d{2}\b|classe\s*[a-z0-9]+/i,
  /type\s+[a-z0-9]|modele|mod[eè]le|marque|equivalent|ral\s*\d+/i,
  /disjoncteur|declencheur|d[eé]clencheur|calibre|modulaire|tgbt|cfo|cfa|ho7\s*vk/i,
  /radiateur|chauffe|pilotage|programmation|verrouillage|consommation|capteur|commande|detection|d[eé]tection|presence|absence/i,
  /realisera|realis[eé]e?|devra|comprendra|sera\s+constitu[eé]e?|sera\s+compose[eé]e?|sera\s+rendu|permettra|assurera|adaptation/i,
  /fixation|rebord|couvercle|eclisse|eclisses|boulons?|vis\s|support/i,
];

function normalizeRef(num) {
  const cleaned = String(num || '').trim();
  if (!cleaned) return '';
  const exact = cleaned.match(/\d+(?:\.\d+)+/);
  if (exact) return exact[0];
  const loose = cleaned.match(/\d+/);
  return loose ? loose[0] : '';
}

function buildRefCandidates(num) {
  const base = normalizeRef(num);
  if (!base) return [];
  const parts = base.split('.');
  const refs = [];
  for (let i = parts.length; i >= 1; i--) refs.push(parts.slice(0, i).join('.'));
  return [...new Set(refs)];
}

function isLikelySectionHeader(line) {
  const text = String(line || '').trim();
  if (!text || text.length > 180) return false;
  return SECTION_HEADER_RE.test(text);
}

function lineStartsWithRef(line, ref) {
  const text = String(line || '').trim();
  if (!text || !ref) return false;
  const escaped = ref.replace(/\./g, '\\.');
  return new RegExp(`^${escaped}(?:(?:\\s*[-–—:.)]\\s*)|(?:\\.\\d+)|\\s|$)`, 'i').test(text);
}

function findBlockBounds(lines, index, before = 2, after = 18) {
  let start = Math.max(0, index - before);
  let end = Math.min(lines.length, index + after);

  for (let i = index - 1; i >= 0; i--) {
    if (isLikelySectionHeader(lines[i])) {
      start = i;
      break;
    }
  }
  for (let i = index + 1; i < lines.length; i++) {
    if (isLikelySectionHeader(lines[i])) {
      end = i;
      break;
    }
  }

  return { start, end };
}

function stripSectionPrefix(text) {
  return String(text || '')
    .replace(/^\s*\d+(?:\.\d+)+(?:\s*[-–—:.)]\s*|\s+)/, '')
    .trim();
}

function extractKeywords(description) {
  return [...new Set(
    norm(description)
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
      .filter(w => !/^\d+$/.test(w))
  )];
}

// Extract the best numeric quantity from a text window
// Returns the most "intentional" quantity: prefers explicit nouns > units > start-of-line
function extractQty(text) {
  const candidates = [];

  const push = (re, weight, isValid = () => true) => {
    for (const m of text.matchAll(new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g')))) {
      const n = parseFloat(m[1].replace(',', '.'));
      if (isFinite(n) && n > 0 && n <= 99999 && !String(n).includes('e') && isValid(n, m)) {
        candidates.push({ n, weight });
      }
    }
  };

  // High confidence: number + known noun
  push(/\b(\d+(?:[.,]\d+)?)\s+(?:arbres?|arbustes?|plants?|potelets?|bennes?|panneaux?|tables?|bancs?|pergolas?|regards?|massifs?|bordures?|rampes?|escaliers?|plots?|assises?|jeux|colonnes?|robinets?|lavabos?|wcs?|cuvettes?|reservoirs?|pompes?|chauffe.eaux?|radiateurs?|grilles?|poteaux?|piquets?|grillages?)/i, 3);
  // High confidence: number + unit
  push(/\b(\d+(?:[.,]\d+)?)\s*(?:ml\b|m²|m2|m³|m3|ens\b|u\b(?!\w)|unites?|pieces?|kg\b|t\b(?!\w)|h\b(?!\w)|forfait)/i, 2);
  // Medium: number at start of line before any word ≥4 letters.
  // We keep this only for "small" values to avoid capturing project/job numbers like 1714.
  push(/^(\d+(?:[.,]\d+)?)\s+[a-zA-ZÀ-ÿ]{4}/mg, 1, (n) => n <= 500);

  if (!candidates.length) return null;
  // Return highest weight, then largest number (most specific)
  candidates.sort((a, b) => b.weight - a.weight || b.n - a.n);
  return candidates[0].n;
}

// ─── TECHNICAL SPEC EXTRACTION ───────────────────────────────────────────────

// From a CCTP block, extract the most informative technical spec lines
// Returns array of short spec strings (max 5)
function extractTechSpecs(blockText) {
  const lines = blockText.split('\n').map(l => l.trim()).filter(l => l.length > 8);

  const seen = new Set();
  const specs = [];
  const pushSpec = (text) => {
    const clean = stripSectionPrefix(text).replace(/[.,:;]$/, '').trim();
    if (clean.length < 6 || clean.length > 180) return;
    const key = norm(clean).substring(0, 60);
    if (seen.has(key)) return;
    seen.add(key);
    specs.push(clean);
  };

  // Priority 1: bullet-point lines
  for (const l of lines) {
    if (!BULLET_RE.test(l)) continue;
    pushSpec(l.replace(BULLET_RE, '').trim());
    if (specs.length >= 5) break;
  }

  // Priority 2: explicit labelled spec lines
  for (const l of lines) {
    if (BULLET_RE.test(l)) continue;
    if (/^(marque|modele|mod[eè]le|puissance|coloris|caracteristiques?)\s*:/i.test(l)) pushSpec(l);
    if (specs.length >= 5) break;
  }

  // Priority 3: lines containing technical or functional requirements
  for (const l of lines) {
    if (BULLET_RE.test(l)) continue;
    if (l.length > 220) continue;
    if (!TECH_PATTERNS.some(re => re.test(l))) continue;
    if (/^\d+\s/.test(l) && l.length < 20) continue;
    pushSpec(l);
    if (specs.length >= 6) break;
  }

  return specs
    .slice(0, 6);
}

// Main function: find a quantity for one DPGF line in the CCTP raw text
// Returns { qty, context, specs } or null
export function findQtyInCCTP(dpgfLine, cctpText) {
  if (!cctpText || typeof cctpText !== 'string') return null;
  const { num, description } = dpgfLine;
  const lines = cctpText.split('\n').map(l => l.trim()).filter(Boolean);
  const normLines = lines.map(norm);
  const refs = buildRefCandidates(num);

  const buildResult = (blockLines, contextLabel, lineIndexHint = 0) => {
    const block = blockLines.join('\n').trim();
    if (!block) return null;
    const specs = extractTechSpecs(block);
    const qty = extractQty(block);
    const ctxLine = qty !== null
      ? (blockLines.find(l => {
          const q = extractQty(l);
          return q !== null && Math.abs(q - qty) < 0.01;
        }) || blockLines[lineIndexHint] || blockLines[0])
      : (blockLines[lineIndexHint] || blockLines[0]);
    return {
      qty,
      context: contextLabel.includes('§')
        ? `${contextLabel}${ctxLine ? ` — "${ctxLine.substring(0, 120)}"` : ''}`
        : `"${ctxLine.substring(0, 120)}"`,
      specs,
      block,
    };
  };

  // ── Strategy 1: find the section by reference number ──────────────────────
  for (const ref of refs) {
    const candidates = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lineStartsWithRef(lines[i], ref)) continue;
      const exact = new RegExp(`^${ref.replace(/\./g, '\\.')}(?:\\s*[-–—:.)]\\s*|\\s|$)`, 'i').test(lines[i].trim());
      candidates.push({ i, score: exact ? 3 : 2 });
    }
    if (!candidates.length) continue;

    candidates.sort((a, b) => b.score - a.score || a.i - b.i);
    const best = candidates[0];
    const { start, end } = findBlockBounds(lines, best.i, 0, 24);
    const result = buildResult(lines.slice(start, end), `§${ref}`, best.i - start);
    if (result && (result.specs.length || result.qty !== null || result.block.length > 20)) return result;
  }

  // ── Strategy 2: keyword scoring on section-aware blocks ───────────────────
  const keywords = extractKeywords(description);
  if (keywords.length < 2) return null;

  const scored = normLines.map((nl, i) => {
    let score = 0;
    let titleBoost = 0;
    for (const k of keywords.slice(0, 8)) {
      if (!nl.includes(k)) continue;
      score += k.length >= 6 ? 2 : 1;
      if (stripSectionPrefix(lines[i]).length < 140) titleBoost++;
    }
    return { i, score: score + Math.min(titleBoost, 2) };
  }).filter(x => x.score > 0);

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score || a.i - b.i);

  const best = scored[0];
  if (best.score < 2) return null;

  const { start, end } = findBlockBounds(lines, best.i, 2, 26);
  const blockLines = lines.slice(start, end);
  const result = buildResult(blockLines, '§CCTP', Math.max(0, best.i - start));

  if (!result) return null;
  if (result.qty === null && !result.specs.length && best.score < 3) return null;
  return result;
}

// ─── PERSISTENCE (localStorage) ───────────────────────────────────────────────

const CURRENT_KEY  = 'dpm_tender_current';
const HISTORY_KEY  = 'dpm_tender_list';
const DATA_PREFIX  = 'dpm_tender_data_';

export function saveTender(data) {
  const id = data.id || String(Date.now());
  const normalized = { ...data, id, lines: data.lines ? normalizeTenderLines(data.lines) : [] };

  localStorage.setItem(DATA_PREFIX + id, JSON.stringify(normalized));
  localStorage.setItem(CURRENT_KEY, id);

  const meta = {
    id,
    projectName: data.projectName || 'Sans nom',
    dpgfFileName: data.dpgfFileName || '',
    savedAt: Date.now(),
    lineCount: (data.lines || []).filter(l => !l.isSection).length,
    totalHT: (data.lines || []).filter(l => !l.isSection)
      .reduce((s, l) => s + (l.quantite || 0) * (l.prixUnitaire || 0), 0),
  };
  const list = loadTenderHistory();
  const idx = list.findIndex(h => h.id === id);
  if (idx >= 0) list[idx] = meta; else list.unshift(meta);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 30)));

  return normalized;
}

export function loadTender() {
  try {
    const id = localStorage.getItem(CURRENT_KEY);
    if (!id) return null;
    const data = JSON.parse(localStorage.getItem(DATA_PREFIX + id) || 'null');
    if (!data) return null;
    return { ...data, lines: normalizeTenderLines(data.lines || []) };
  } catch { return null; }
}

export function loadTenderHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

export function loadTenderById(id) {
  try {
    const data = JSON.parse(localStorage.getItem(DATA_PREFIX + id) || 'null');
    if (!data) return null;
    return { ...data, lines: normalizeTenderLines(data.lines || []) };
  } catch { return null; }
}

export function setCurrentTender(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

export function deleteTenderFromHistory(id) {
  localStorage.removeItem(DATA_PREFIX + id);
  const list = loadTenderHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  if (localStorage.getItem(CURRENT_KEY) === id) localStorage.removeItem(CURRENT_KEY);
}

export function clearTender() {
  localStorage.removeItem(CURRENT_KEY);
}

// ─── PARSING ──────────────────────────────────────────────────────────────────

/*
  French public procurement DPGF structure (detected in real files):
  - Info rows at top (project name, lot, company info)
  - Header row: ["", "", "", "U", "Qté", "PU", "Total HT", ...]
  - Section rows: col0 = "1 - TITRE SECTION"
  - Data rows (3 patterns):
      A: ["1.2.", "Description item", "", "ens", qty, pu, total]
      B: ["",     "1.5.1",            "Description detail", "ml", qty, pu, total]
      C: ["",     "",                 "Description detail", "u",  qty, pu, total]
*/

// Unit abbreviations typical in French DPGFs
const UNITS = new Set(['ens','u','u.','ml','ml.','m','m²','m2','m3','m³','kg','t','h','heure','heures','mois','jour','jours','ff','forfait','nb','nbr','pce','pièce','piece','pm']);

const isUnit = (v) => {
  const s = String(v ?? '').trim().toLowerCase().replace(/\.+$/, '');
  return UNITS.has(s) || /^m[²2³3]?$/.test(s);
};

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

// Find the header row in the first part of the workbook.
// Some DPGFs have a long preamble and only expose the real table header much later.
function findHeaderRow(rows) {
  const qtyKw   = ['qté', 'qte', 'qt.', 'quantité', 'quantite', 'nombre', 'nbre'];
  const priceKw = ['pu', 'p.u.', 'p.u', 'prix unitaire', 'prix unit', 'unitaire', 'montant', 'total ht', 'total h.t'];
  const unitKw  = ['u', 'u.', 'unité', 'unite'];
  const descKw  = ['description', 'désignation', 'designation', 'libellé', 'libelle', 'nature', 'ouvrage', 'travaux'];

  for (let i = 0; i < Math.min(250, rows.length); i++) {
    const cells = rows[i].map(c => String(c ?? '').toLowerCase().trim());
    const hasQty   = cells.some(c => qtyKw.some(k => c === k || c.startsWith(k)));
    const hasPrice = cells.some(c => priceKw.some(k => c === k || c.includes(k)));
    const hasUnit  = cells.some(c => unitKw.some(k => c === k || c.startsWith(k)));
    const hasDesc  = cells.some(c => descKw.some(k => c === k || c.includes(k)));
    if (hasDesc && ((hasQty && hasPrice) || (hasQty && hasUnit) || (hasPrice && hasUnit))) return i;
  }
  return -1;
}

// Map column indices from the header row
function mapColumns(headerRow) {
  const map = { num: -1, desc0: -1, desc1: -1, desc2: -1, unite: -1, quantite: -1, prixUnitaire: -1, total: -1 };

  headerRow.forEach((cell, i) => {
    const c = String(cell ?? '').toLowerCase().trim();
    if      (c.match(/^u$|^unité$|^unite$|^u\.$/))                             map.unite = i;
    else if (c.match(/^qté$|^qte$|^qt\.?$|quantité|quantite|^nb(r)?e?$/))     map.quantite = i;
    else if (c.match(/^pu$|^p\.u\.?$|prix.unit|^unitaire$/))                   map.prixUnitaire = i;
    else if (c.match(/total|montant/))                                          map.total = i;
    else if (c.match(/désign|descript|libellé|libelle|nature|ouvrage|travaux|désignation/)) map.desc0 = i;
    else if (c.match(/^n[°o]$|repère|repere|^article$|^poste$/))              map.num = i;
  });

  return map;
}

// Infer columns for files where headers have no description label
// (e.g., ["", "", "", "U", "Qté", "PU", "Total HT"])
function inferDescColumns(rows, headerIdx, cols) {
  if (cols.unite === -1) return;

  // Columns before the unit column are likely: num / desc / desc
  const beforeUnit = cols.unite; // e.g. 3
  // Typical: col 0 = ref number, col 1 = desc level 1, col 2 = desc level 2
  if (beforeUnit >= 3) {
    if (cols.num === -1)   cols.num  = 0;
    if (cols.desc0 === -1) cols.desc0 = 1;
    if (cols.desc1 === -1) cols.desc1 = 2;
  } else if (beforeUnit === 2) {
    if (cols.num === -1)   cols.num  = 0;
    if (cols.desc0 === -1) cols.desc0 = 1;
  } else if (beforeUnit === 1) {
    if (cols.desc0 === -1) cols.desc0 = 0;
  }
}

function uniqueNonEmpty(values) {
  const seen = new Set();
  const items = [];
  values.forEach((value) => {
    const text = String(value ?? '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(text);
  });
  return items;
}

function fallbackDescription(line) {
  const specs = Array.isArray(line?.cctpSpecs) ? line.cctpSpecs : [];
  return String(
    line?.description ||
    specs[0] ||
    line?.num ||
    (line?.isSection ? 'Section sans titre' : 'Désignation non détectée')
  ).trim();
}

function normalizeTenderLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((line) => {
    const description = fallbackDescription(line);
    return {
      ...line,
      description,
      totalHT: (line?.quantite ?? 0) * (line?.prixUnitaire ?? 0),
    };
  });
}

// Build description + reference from a row (handles multi-column layouts)
function buildDescAndNum(row, cols) {
  // Reference: short string matching "1.2.", "2.3.4", "A.1" patterns
  const isRef = (v) => Boolean(v && v.length <= 12 && v.match(/^[\d]+[\d.\-]*\.?\s*$|^[A-Z]\d/));

  // Stop scanning before the first financial column (unit, qty, price, total)
  const stopCols = [cols.unite, cols.quantite, cols.prixUnitaire, cols.total].filter(c => c >= 0);
  const limit = stopCols.length ? Math.min(...stopCols) : Math.min(row.length, 8);

  let num = '';
  const descParts = [];

  const explicitDescCols = [cols.desc0, cols.desc1, cols.desc2].filter(c => c >= 0 && c < limit);
  explicitDescCols.forEach((col) => {
    const value = String(row[col] ?? '').trim();
    if (value && !isRef(value)) descParts.push(value);
  });

  for (let i = 0; i < limit; i++) {
    const v = String(row[i] ?? '').trim();
    if (!v) continue;
    if (isRef(v) && !num) {
      num = v;
    } else if (!isRef(v) && !explicitDescCols.includes(i)) {
      descParts.push(v);
    }
  }

  return { num, desc: uniqueNonEmpty(descParts).join(' — ') };
}

function parseSheet(rows) {
  const hi = findHeaderRow(rows);
  if (hi === -1) return null;

  const cols = mapColumns(rows[hi]);
  inferDescColumns(rows, hi, cols);

  // At minimum we need a description column and one structural clue
  const hasDescriptionColumn = cols.desc0 >= 0 || cols.desc1 >= 0 || cols.desc2 >= 0;
  const hasStructuredColumn = cols.unite >= 0 || cols.quantite >= 0 || cols.prixUnitaire >= 0 || cols.total >= 0;
  if (!hasDescriptionColumn || !hasStructuredColumn) return null;

  const lines = [];

  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r];
    const { num, desc: rawDesc } = buildDescAndNum(row, cols);

    // If no description text found, fall back to the ref number as label.
    // Rows with neither are truly blank → skip.
    const desc = rawDesc || num;
    if (!desc) continue;

    // Skip footer/total rows
    if (/^total|^tva|^ttc/i.test(desc.trim())) continue;

    const unite = cols.unite >= 0 ? String(row[cols.unite] ?? '').trim() : '';
    const qty   = cols.quantite >= 0    ? toNum(row[cols.quantite])    : null;
    const pu    = cols.prixUnitaire >= 0 ? toNum(row[cols.prixUnitaire]) : null;

    // Skip rows with obviously non-standard units that are placeholders
    const unitLower = unite.toLowerCase();
    if (unitLower === 'voir ci-dessus' || unitLower === 'sans objet') continue;

    // Determine if this is a section/title row (no unit + no price data)
    const hasUnit  = unite && !unitLower.includes('à renseigner') && !unitLower.includes('renseigner');
    const hasPrice = pu !== null;
    const hasQty   = qty !== null;
    const isSection = !hasUnit && !hasPrice && !hasQty;

    // Auto-extract quantity from description when DPGF qty is blank
    // e.g. "4 bennes à gravats 15 m3" → qty = 4
    let qtyFromDesc = false;
    let finalQty = qty ?? 0;
    if (!isSection && (qty === null || qty === 0)) {
      const m = desc.match(/^(\d+(?:[.,]\d+)?)\s+[a-zA-ZÀ-ÿ]/);
      if (m) {
        const extracted = parseFloat(m[1].replace(',', '.'));
        if (extracted > 0) {
          finalQty = extracted;
          qtyFromDesc = true;
        }
      }
    }

    lines.push({
      id: r,
      num,
      description: desc,
      unite: hasUnit ? unite : '',
      quantite: finalQty,
      prixUnitaire: pu ?? 0,
      totalHT: finalQty * (pu ?? 0),
      isSection,
      qtyFromDesc,
      qtySources: qtyFromDesc ? 'desc' : null,
    });
  }

  return lines.length > 0 ? { lines: normalizeTenderLines(lines), headerRow: hi, cols } : null;
}

export function parseDPGF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const result = parseSheet(rows);

          if (result) {
            resolve({
              lines: result.lines,
              sheetName,
              headerRow: result.headerRow,
              totalRows: result.lines.length,
            });
            return;
          }
        }

        reject(new Error(
          'Structure non reconnue. Assurez-vous que le fichier contient au moins une colonne ' +
          '"Description/Désignation" et des colonnes de structure comme "Unité", "Qté" ou "PU". ' +
          'Les quantités pourront ensuite être enrichies via le CCTP si nécessaire.'
        ));
      } catch (err) {
        reject(new Error('Erreur de lecture : ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export function exportDPGF(lines, projectName) {
  const dataLines = lines.filter(l => !l.isSection);
  const totalHT = dataLines.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  const ws_data = [
    ['N°', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire HT', 'Total HT'],
    ...lines.map(l =>
      l.isSection
        ? [l.num || '', l.description, '', '', '', '']
        : [l.num, l.description, l.unite, l.quantite, l.prixUnitaire, l.quantite * l.prixUnitaire]
    ),
    [],
    ['', '', '', '', 'Total HT', totalHT],
    ['', '', '', '', 'TVA 10 %', totalHT * 0.1],
    ['', '', '', '', 'Total TTC', totalHT * 1.1],
  ];

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [{ wch: 8 }, { wch: 52 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DPGF modifié');
  XLSX.writeFile(wb, `DPGF_${projectName.replace(/[\s/\\:*?"<>|]/g, '_')}_modifié.xlsx`);
}
