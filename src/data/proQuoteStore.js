import * as XLSX from 'xlsx';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { loadCatalog } from './catalogStore';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const KEY = 'dpm_pro_quotes';
const STOP = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'en', 'et', 'au', 'aux', 'un', 'une', 'par', 'sur', 'sous', 'dans', 'pour', 'avec', 'sans', 'ou', 'a', 'l', 'd', 'est', 'sont', 'cette', 'tout', 'tous']);
const UNIT_RE = '(u|u\\.|piece|pieces|pi[eè]ce|pi[eè]ces|pcs|ml|m|m2|m²|m3|m³|ens|ens\\.|forfait|h|kg|lot)';

function normStr(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(s) {
  return normStr(s).split(' ').filter(w => w.length > 2 && !STOP.has(w));
}

function similarity(a, b) {
  const ka = new Set(keywords(a));
  const kb = new Set(keywords(b));
  if (!ka.size || !kb.size) return 0;
  const inter = [...ka].filter(k => kb.has(k)).length;
  return inter / Math.max(ka.size, kb.size);
}

function toNum(v, fallback = 0) {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function lineBucketY(item) {
  return Math.round((item.transform?.[5] ?? 0) * 2) / 2;
}

function lineBucketX(item) {
  return item.transform?.[4] ?? 0;
}

function cleanLine(line) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/[•●▪]/g, ' ')
    .replace(/\s+-\s+/g, ' - ')
    .trim();
}

function isNoiseLine(line) {
  const low = normStr(line);
  if (!low) return true;
  if (low.length < 6) return true;
  if (/^(devis|association|client|adresse|tel|mail|villeurbanne|new clim|centre|vos ref|objet du devis|vos ref|page)\b/.test(low)) return true;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(low)) return true;
  if (/^devis n/.test(low)) return true;
  if (/^\d+[.,]\d{2}$/.test(low)) return true;
  return false;
}

function stripTrailingPriceColumns(line) {
  return line
    .replace(/\s+\d+[.,]\d{2}\s*€?\s+\d+[.,]\d{2}\s*€?\s*$/i, '')
    .replace(/\s+\d+[.,]\d{2}\s*€?\s*$/i, '')
    .trim();
}

function parseQtyUnitFromLine(line) {
  const start = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${UNIT_RE}\\b\\s+`, 'i');
  const end = new RegExp(`\\s+(\\d+(?:[.,]\\d+)?)\\s*${UNIT_RE}\\b$`, 'i');

  const startMatch = line.match(start);
  if (startMatch) {
    const [, qtyRaw] = startMatch;
    const unitMatch = line.slice(startMatch[0].length - startMatch[0].trimStart().length).match(new RegExp(`^${UNIT_RE}`, 'i'));
    return {
      description: line.slice(startMatch[0].length).trim(),
      quantite: toNum(qtyRaw, 1),
      unite: unitMatch ? unitMatch[0] : 'U',
    };
  }

  const endMatch = line.match(end);
  if (endMatch) {
    const [, qtyRaw] = endMatch;
    const unitMatch = line.match(new RegExp(`${UNIT_RE}\\b$`, 'i'));
    return {
      description: line.replace(end, '').trim(),
      quantite: toNum(qtyRaw, 1),
      unite: unitMatch ? unitMatch[0] : 'U',
    };
  }

  return {
    description: line,
    quantite: 1,
    unite: 'Forfait',
  };
}

function parseProQuoteLine(line, index) {
  const compact = stripTrailingPriceColumns(cleanLine(line));
  if (isNoiseLine(compact)) return null;

  const { description, quantite, unite } = parseQtyUnitFromLine(compact);
  const finalDescription = description.replace(/^-\s*/, '').trim();

  if (!finalDescription || finalDescription.length < 5) return null;

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    description: finalDescription,
    quantite,
    unite,
    prixUnitaire: 0,
    totalHT: 0,
    sourceLine: compact,
    matchConfidence: 0,
    matchedProduct: null,
    catalogRef: '',
  };
}

async function extractPdfLines(file) {
  const buf = await file.arrayBuffer();
  const pdf = await getDocument({ data: buf }).promise;
  const lines = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const groups = new Map();

    content.items.forEach(item => {
      const text = String(item.str ?? '').trim();
      if (!text) return;
      const y = lineBucketY(item);
      const arr = groups.get(y) ?? [];
      arr.push({ x: lineBucketX(item), text });
      groups.set(y, arr);
    });

    [...groups.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, parts]) => {
        const line = cleanLine(parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' '));
        if (line) lines.push(line);
      });
  }

  return lines;
}

function extractQuoteNumber(lines, fileName) {
  const combined = lines.join('\n');
  const match = combined.match(/devis\s*n[°o]?\s*([0-9]{4,})/i);
  return match?.[1] ?? fileName.replace(/\.[^.]+$/, '');
}

function extractCustomerName(lines) {
  const hit = lines.find(line => /association|client|destinataire|ma[iî]tre d'ouvrage/i.test(normStr(line)));
  if (!hit) return '';
  const chunks = hit.split(/[:|-]/).map(part => part.trim()).filter(Boolean);
  return chunks[chunks.length - 1] || '';
}

export async function parseProQuotePdf(file) {
  const rawLines = await extractPdfLines(file);
  const dedup = new Set();
  const lines = [];

  rawLines.forEach((line, index) => {
    const parsed = parseProQuoteLine(line, index);
    if (!parsed) return;
    const key = normStr(parsed.description);
    if (!key || dedup.has(key)) return;
    dedup.add(key);
    lines.push(parsed);
  });

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    quoteNumber: extractQuoteNumber(rawLines, file.name),
    customerName: extractCustomerName(rawLines),
    importedAt: Date.now(),
    rawLines,
    lines,
  };
}

export function fillProQuoteWithCatalog(lines, options = {}) {
  const catalog = loadCatalog();
  const markup = toNum(options.markup, 1.35);
  if (!catalog.length) return lines;

  return lines.map(line => {
    let best = null;
    let bestScore = 0;
    for (const product of catalog) {
      const score = similarity(line.description, product.description);
      if (score > bestScore) {
        bestScore = score;
        best = product;
      }
    }

    if (!best || bestScore < 0.2) {
      return {
        ...line,
        totalHT: line.quantite * line.prixUnitaire,
        matchConfidence: 0,
        matchedProduct: null,
        catalogRef: '',
      };
    }

    const prixUnitaire = line.prixUnitaire > 0 ? line.prixUnitaire : Number((best.prixAchat * markup).toFixed(2));
    return {
      ...line,
      unite: line.unite || best.unite || 'U',
      prixUnitaire,
      totalHT: Number((line.quantite * prixUnitaire).toFixed(2)),
      matchConfidence: Math.round(bestScore * 100),
      matchedProduct: best.description,
      catalogRef: best.ref || '',
    };
  });
}

export function saveProQuotes(documents) {
  localStorage.setItem(KEY, JSON.stringify(documents));
}

export function loadProQuotes() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function exportProQuote(document) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Devis pro', document.quoteNumber || document.fileName],
    ['Client', document.customerName || ''],
    ['Source', document.fileName],
    [],
    ['Description', 'Qté', 'Unité', 'P.U. HT', 'Total HT', 'Produit base', 'Réf. base'],
    ...document.lines.map(line => [
      line.description,
      line.quantite,
      line.unite,
      line.prixUnitaire,
      Number((line.quantite * line.prixUnitaire).toFixed(2)),
      line.matchedProduct || '',
      line.catalogRef || '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 60 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Devis pro');
  XLSX.writeFile(wb, `${document.quoteNumber || document.fileName.replace(/\.[^.]+$/, '')}_reponse.xlsx`);
}
