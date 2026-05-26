import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';
import { parseDPGF, exportDPGF, saveTender, loadTender, loadTenderHistory, loadTenderById, setCurrentTender, deleteTenderFromHistory, parseCCTPText, parseCCTPSections, findQtyInCCTP } from '../data/tenderStore';
import { loadCatalog, loadCatalogFromDB, matchCatalogToLines, searchCatalogOptions, catalogHasMatchFields } from '../data/catalogStore';

const fmt = (n) =>
  (typeof n === 'number' ? n : parseFloat(n) || 0)
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const getLineDescription = (line) =>
  String(
    line?.description ||
    (Array.isArray(line?.cctpSpecs) ? line.cctpSpecs[0] : '') ||
    line?.num ||
    (line?.isSection ? 'Section sans titre' : 'Désignation non détectée')
  ).trim();

// ─── IMPORT ────────────────────────────────────────────────────────────────────

function FileSlot({ label, accept, file, onFile, icon, hint }) {
  const ref = useRef();
  const [over, setOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className="card"
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      style={{
        padding: 18, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
        border: over ? '2px solid var(--brand-500)' : file ? '1px solid var(--green-500)' : '1px solid var(--line)',
        background: over ? 'var(--brand-50)' : file ? 'var(--green-50)' : '#fff',
        transition: 'all 120ms',
      }}
    >
      <span style={{ width: 44, height: 44, borderRadius: 11, background: file ? 'var(--green-50)' : 'var(--brand-50)', color: file ? 'var(--green-700)' : 'var(--brand-700)', display: 'grid', placeItems: 'center', flex: 'none' }}>
        {file ? Icons.check : icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: file ? 'var(--green-700)' : 'var(--ink)' }}>{label}</div>
        <div className="tiny muted" style={{ marginTop: 2 }}>
          {file ? file.name + ' · ' + (file.size / 1024).toFixed(0) + ' Ko' : hint}
        </div>
      </div>
      {file
        ? <span className="pill scheduled" style={{ fontSize: 11 }}><span className="dot" />Chargé</span>
        : <span className="pill muted" style={{ fontSize: 11 }}>Cliquez ou glissez</span>}
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

const fmtDate = (ts) => {
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const fmtEur = (n) =>
  (typeof n === 'number' ? n : 0)
    .toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

export function TenderImportScreen() {
  const nav = useNavigate();
  const [dpgfFile, setDpgfFile] = useState(null);
  const [cctpFile, setCctpFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [showToast, Toast] = useToast();
  const [history, setHistory] = useState(() => loadTenderHistory());

  const openSaved = (id) => {
    setCurrentTender(id);
    nav('/tender/match');
  };

  const removeFromHistory = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce dossier de l\'historique ?')) return;
    deleteTenderFromHistory(id);
    setHistory(loadTenderHistory());
  };

  const handleLaunch = async () => {
    if (!dpgfFile) { setError("Veuillez fournir le fichier DPGF (.xlsx ou .xls)"); return; }
    setError(null);
    setParsing(true);
    try {
      const result = await parseDPGF(dpgfFile);
      let parsedLines = result.lines;

      if (cctpFile) {
        showToast('Lecture du CCTP en cours…', 'info');
        const cctpText = await parseCCTPText(cctpFile);
        parsedLines = result.lines.map((line) => {
          if (line.isSection) return line;
          const found = findQtyInCCTP(line, cctpText);
          if (!found) return { ...line, cctpAnalyzed: true, cctpSpecs: [] };

          const update = {
            ...line,
            cctpAnalyzed: true,
            cctpContext: found.context,
            cctpSpecs: found.specs ?? [],
            cctpBlock: found.block ?? '',
          };

          if (found.qty !== null && (!line.quantite || line.quantite === 0)) {
            update.quantite = found.qty;
            update.qtySources = 'cctp';
            update.qtyFromDesc = false;
            update.totalHT = found.qty * (line.prixUnitaire ?? 0);
          }

          return update;
        });
      }

      const name = projectName.trim() || dpgfFile.name.replace(/\.[^.]+$/, '');
      saveTender({
        lines: parsedLines,
        projectName: name,
        dpgfFileName: dpgfFile.name,
        cctpFileName: cctpFile?.name ?? null,
        sheetName: result.sheetName,
        totalRows: parsedLines.length,
        parsedAt: Date.now(),
      });
      showToast(`${parsedLines.length} lignes importées avec succès`, 'success');
      setTimeout(() => nav('/tender/match'), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const useDemoData = () => {
    const demoLines = [
      { id:1,  num:'1.1', description:'WC suspendu cuvette céramique blanc — Geberit Sigma 8',       unite:'ens.', quantite:12,  prixUnitaire:289,   totalHT:3468,  isSection:false },
      { id:2,  num:'1.2', description:'Lavabo simple vasque 60 cm fonte minérale — Allia Prima',     unite:'u.',   quantite:24,  prixUnitaire:124.5, totalHT:2988,  isSection:false },
      { id:3,  num:'1.3', description:'Mitigeur lavabo bec haut chromé — Grohe Eurosmart',           unite:'u.',   quantite:24,  prixUnitaire:78.9,  totalHT:1893.6,isSection:false },
      { id:4,  num:'2.1', description:'Tube cuivre écroui Ø 18 mm — barre 5 m',                      unite:'ml',   quantite:320, prixUnitaire:12.8,  totalHT:4096,  isSection:false },
      { id:5,  num:'2.2', description:'Robinet d\'arrêt avant compteur DN20',                         unite:'u.',   quantite:48,  prixUnitaire:14.2,  totalHT:681.6, isSection:false },
      { id:6,  num:'2.3', description:'Évacuation PVC Ø 100 — collecteur',                           unite:'ml',   quantite:180, prixUnitaire:9.4,   totalHT:1692,  isSection:false },
      { id:7,  num:'3.1', description:'Receveur de douche extra-plat 90×90 — Roca Granuc',           unite:'u.',   quantite:8,   prixUnitaire:198.5, totalHT:1588,  isSection:false },
      { id:8,  num:'3.2', description:'Chauffe-eau électrique 150 L stéatite — Atlantic Zénéo',      unite:'u.',   quantite:4,   prixUnitaire:412,   totalHT:1648,  isSection:false },
      { id:9,  num:'3.3', description:'Colonne de douche thermostatique',                             unite:'u.',   quantite:8,   prixUnitaire:145,   totalHT:1160,  isSection:false },
      { id:10, num:'4.1', description:'Main d\'œuvre — plombier qualifié',                            unite:'h',    quantite:480, prixUnitaire:55,    totalHT:26400, isSection:false },
      { id:11, num:'4.2', description:'Main d\'œuvre — aide-plombier',                                unite:'h',    quantite:160, prixUnitaire:38,    totalHT:6080,  isSection:false },
    ];
    saveTender({ lines: demoLines, projectName:'AO Lycée Pasteur (démo)', dpgfFileName:'démo', cctpFileName:null, sheetName:'DPGF', totalRows:demoLines.length, parsedAt:Date.now() });
    nav('/tender/match');
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Appels d'offres", "Nouveau dossier"]}
          right={
            <>
              <button className="btn" onClick={() => nav('/dashboard')}>Annuler</button>
              <button className="btn brand" onClick={handleLaunch} disabled={parsing} style={{ opacity: parsing ? 0.7 : 1 }}>
                {parsing ? '⏳ Analyse en cours…' : <>{Icons.bolt} Analyser les fichiers</>}
              </button>
            </>
          }
        />
        <div className="page-content" style={{ padding: '32px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Importer un appel d'offres</h2>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                Glissez vos fichiers DPGF et CCTP — les prix unitaires seront importés et modifiables.
              </div>
            </div>

            <div style={{ marginBottom: 4 }}>
              <div className="tiny muted" style={{ marginBottom: 6 }}>Nom du projet (optionnel)</div>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Ex : AO Lycée Pasteur — Lot 03 Plomberie"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13.5, outline: 'none' }}
              />
            </div>

            <FileSlot
              label="DPGF — Décomposition du prix global"
              accept=".xlsx,.xls,.csv"
              file={dpgfFile}
              onFile={setDpgfFile}
              icon={Icons.quote}
              hint="Fichier Excel (.xlsx / .xls) · colonnes Désignation, Quantité, Prix unitaire"
            />

            <FileSlot
              label="CCTP — Cahier des clauses techniques"
              accept=".pdf,.doc,.docx"
              file={cctpFile}
              onFile={setCctpFile}
              icon={Icons.shield}
              hint="PDF ou Word — utilisé pour le contexte technique (optionnel)"
            />

            {error && (
              <div style={{ padding: '12px 16px', background: 'var(--red-50)', border: '1px solid #ffd1d6', borderRadius: 10, fontSize: 13, color: 'var(--red-500)', display: 'flex', gap: 10 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ padding: '14px 16px', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--ink-3)' }}>Formats supportés pour le DPGF</div>
              <div className="muted" style={{ lineHeight: 1.7 }}>
                · Fichier Excel (.xlsx, .xls) avec colonnes : <strong>N°</strong>, <strong>Désignation</strong>, <strong>Unité</strong>, <strong>Quantité</strong>, <strong>Prix unitaire HT</strong><br/>
                · Les en-têtes sont détectées automatiquement (toutes variantes acceptées)<br/>
                · Pas de fichier ? <button onClick={useDemoData} className="btn sm ghost" style={{ display: 'inline-flex', marginLeft: 4, padding: '1px 8px' }}>Utiliser les données de démo</button>
              </div>
            </div>

            {/* ── Historique des dossiers ── */}
            {history.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {Icons.calendar} Dossiers enregistrés
                  <span className="tiny muted" style={{ fontWeight: 400 }}>— cliquez pour reprendre</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map(h => (
                    <div
                      key={h.id}
                      onClick={() => openSaved(h.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', background: '#fff', transition: 'all 100ms' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.background = 'var(--brand-50)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-700)', display: 'grid', placeItems: 'center', flex: 'none' }}>{Icons.quote}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.projectName}</div>
                        <div className="tiny muted" style={{ marginTop: 1 }}>
                          {h.lineCount} ligne{h.lineCount > 1 ? 's' : ''} · {fmtEur(h.totalHT)} HT · {fmtDate(h.savedAt)}
                        </div>
                      </div>
                      <button
                        onClick={e => removeFromHistory(e, h.id)}
                        title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-5)', fontSize: 16, padding: '4px 6px', borderRadius: 4, lineHeight: 1 }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-500)'; e.currentTarget.style.background = 'var(--red-50)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-5)'; e.currentTarget.style.background = 'none'; }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0 }}>
            <div className="card ai-stripe" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6f4ce0,#2b6bff)', color: '#fff', display: 'grid', placeItems: 'center' }}>{Icons.sparkle}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Ce que vous pourrez faire</div>
                  <div className="tiny muted">après l'import</div>
                </div>
              </div>
              {[
                { ic: '✓', t: 'Voir toutes les lignes du DPGF', s: 'Numéro, désignation, qté, prix' },
                { ic: '✓', t: 'Modifier les prix unitaires', s: 'Cliquez sur n\'importe quelle cellule' },
                { ic: '✓', t: 'Recalcul automatique des totaux', s: 'HT, TVA, TTC en temps réel' },
                { ic: '✓', t: 'Exporter le DPGF modifié', s: 'Fichier Excel prêt à déposer' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ color: 'var(--green-500)', fontWeight: 700, flex: 'none' }}>{m.ic}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.t}</div>
                    <div className="tiny muted">{m.s}</div>
                  </div>
                </div>
              ))}
              <button className="btn brand" style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 11 }} onClick={handleLaunch} disabled={parsing || !dpgfFile}>
                {parsing ? '⏳ Analyse…' : <>{Icons.bolt} {dpgfFile ? 'Lancer l\'analyse' : 'Chargez le DPGF d\'abord'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}

// ─── MATCH / EDITION ──────────────────────────────────────────────────────────

export function TenderMatchScreen() {
  const nav = useNavigate();
  const [showToast, Toast] = useToast();
  const tender = loadTender();

  const [lines, setLines] = useState(() => tender?.lines ?? []);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editField, setEditField] = useState(null);
  const [coeff, setCoeff] = useState('');
  const [showCoeff, setShowCoeff] = useState(false);
  const [analyzingCCTP, setAnalyzingCCTP] = useState(false);
  const [lastSaved, setLastSaved] = useState(tender?.savedAt ?? null);
  const cctpInputRef = useRef();

  const handleSave = useCallback((currentLines) => {
    const saved = saveTender({ ...tender, lines: currentLines ?? lines });
    setLastSaved(saved.savedAt ?? Date.now());
  }, [tender, lines]);

  // ── Catalog matching ──────────────────────────────────────────────────────
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogMatches, setCatalogMatches] = useState([]);
  const [globalCoeff, setGlobalCoeff] = useState('1.40');
  const [coeffOverrides, setCoeffOverrides] = useState({});
  const [selectedMatchChoice, setSelectedMatchChoice] = useState({});
  const [manualMatchSelections, setManualMatchSelections] = useState({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [manualCatalogPicker, setManualCatalogPicker] = useState(null);

  // ── CCTP spec popover ─────────────────────────────────────────────────────
  const [specPopover, setSpecPopover] = useState(null);

  const openSpecPopover = (e, line) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = rect.left;
    setSpecPopover({ specs: line.cctpSpecs, context: line.cctpContext, block: line.cctpBlock, description: getLineDescription(line), top, left });
  };

  const ensureCatalogReady = useCallback(async () => {
    const cachedCatalog = loadCatalog();
    // Si le catalogue est en mémoire avec les champs de matching (description_cctp, search_text), pas besoin de recharger
    if (cachedCatalog.length && catalogHasMatchFields()) return cachedCatalog;

    setCatalogLoading(true);
    try {
      return await loadCatalogFromDB(null, { matchFields: true });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureCatalogReady().catch(() => {});
  }, [ensureCatalogReady]);

  const openManualCatalogPicker = async (line, mode = 'apply-now') => {
    const catalog = await ensureCatalogReady();
    if (!catalog.length) {
      showToast('Base produits vide — importez votre catalogue d\'abord', 'info');
      return;
    }
    const query = getLineDescription(line);
    const contextQuery = line.matchText && line.matchText !== query ? line.matchText : '';
    setManualCatalogPicker({
      mode,
      lineId: line.id,
      query,
      contextQuery,
      results: searchCatalogOptions(query, catalog, 24, contextQuery),
    });
  };

  const updateManualCatalogQuery = (query) => {
    const catalog = loadCatalog();
    setManualCatalogPicker((current) => current ? ({
      ...current,
      query,
      results: searchCatalogOptions(query, catalog, 24, current.contextQuery),
    }) : current);
  };

  const applyManualCatalogChoice = (entry) => {
    if (!manualCatalogPicker) return;
    if (manualCatalogPicker.mode === 'modal-select') {
      setManualMatchSelections((current) => ({
        ...current,
        [manualCatalogPicker.lineId]: entry,
      }));
      setSelectedMatchChoice((current) => ({
        ...current,
        [manualCatalogPicker.lineId]: 'manual',
      }));
      showToast(`Recherche manuelle prête depuis ${entry.source === 'batiprix' ? 'Batiprix' : 'la base produits'}`, 'success');
      setManualCatalogPicker(null);
      return;
    }

    const c = parseFloat(globalCoeff.replace(',', '.')) || 1.4;
    const pu = parseFloat((entry.product.prixAchat * c).toFixed(2));
    let nextLines;
    setLines((ls) => {
      nextLines = ls.map((line) => line.id !== manualCatalogPicker.lineId ? line : {
        ...line,
        prixUnitaire: pu,
        totalHT: line.quantite * pu,
        puFromCatalog: true,
        catalogRef: entry.product.ref,
        catalogSource: entry.source === 'batiprix' ? 'batiprix' : 'catalog',
      });
      return nextLines;
    });
    setTimeout(() => { if (nextLines) handleSave(nextLines); }, 0);
    showToast(`Prix manuel appliqué depuis ${entry.source === 'batiprix' ? 'Batiprix' : 'la base produits'}`, 'success');
    setManualCatalogPicker(null);
  };

  const openCatalogModal = async () => {
    const catalog = await ensureCatalogReady();
    if (!catalog.length) {
      showToast('Base produits vide — importez votre catalogue d\'abord', 'info');
      return;
    }
    const matches = matchCatalogToLines(lines, catalog);
    if (!matches.length) {
      showToast('Aucune correspondance trouvée dans la base produits', 'info');
      return;
    }
    setCatalogMatches(matches);
    const defaults = {};
    const manualDefaults = {};
    matches.forEach((m) => {
      defaults[m.lineId] = m.defaultChoice;
      if (m.manualMatch) manualDefaults[m.lineId] = m.manualMatch;
    });
    setSelectedMatchChoice(defaults);
    setManualMatchSelections(manualDefaults);
    setCoeffOverrides({});
    setShowCatalogModal(true);
  };

  const applyCatalogMatches = () => {
    const gc = parseFloat(globalCoeff.replace(',', '.')) || 1.4;
    let applied = 0;
    let nextLines;
    setLines(ls => {
      nextLines = ls.map(l => {
        const match = catalogMatches.find(m => m.lineId === l.id);
        if (!match) return l;
        const choice = selectedMatchChoice[l.id];
        if (!choice) return l;
        const selectedMatch = choice === 'manual'
          ? manualMatchSelections[l.id]
          : choice === 'secondary'
            ? match.secondaryMatch
            : match.primaryMatch;
        if (!selectedMatch) return l;
        const c = parseFloat((coeffOverrides[l.id] ?? '').replace(',', '.')) || gc;
        const pu = parseFloat((selectedMatch.product.prixAchat * c).toFixed(2));
        applied++;
        return {
          ...l,
          prixUnitaire: pu,
          totalHT: l.quantite * pu,
          puFromCatalog: true,
          catalogRef: selectedMatch.product.ref,
          catalogSource: selectedMatch.source === 'batiprix' ? 'batiprix' : 'catalog',
        };
      });
      return nextLines;
    });
    setTimeout(() => { if (nextLines) handleSave(nextLines); }, 0);
    showToast(`${applied} prix mis à jour et enregistrés`, 'success');
    setShowCatalogModal(false);
  };

  const handleCCTPAnalysis = async (file) => {
    if (!file) return;
    setAnalyzingCCTP(true);
    showToast('Lecture du CCTP en cours…', 'info');
    try {
      const cctpText = await parseCCTPText(file);
      const lineCount = cctpText.split('\n').length;
      showToast(`${lineCount} lignes extraites du CCTP — matching en cours…`, 'info');

      let filled = 0;
      let enriched = 0;
      let nextLines;
      setLines(ls => {
        nextLines = ls.map(l => {
          if (l.isSection) return l;
          const found = findQtyInCCTP(l, cctpText);
          // Always mark as analyzed so we can show status even when nothing found
          if (!found) return { ...l, cctpAnalyzed: true, cctpSpecs: [] };
          const update = { ...l, cctpAnalyzed: true, cctpContext: found.context, cctpSpecs: found.specs ?? [], cctpBlock: found.block ?? '' };
          if (found.qty !== null && (!l.quantite || l.quantite === 0)) {
            update.quantite = found.qty;
            update.qtySources = 'cctp';
            update.qtyFromDesc = false;
            filled++;
          }
          if (found.specs?.length) enriched++;
          return update;
        });
        return nextLines;
      });
      setTimeout(() => { if (nextLines) handleSave(nextLines); }, 0);
      showToast(`CCTP analysé et enregistré — ${filled} qté · ${enriched} désignation${enriched > 1 ? 's' : ''} enrichie${enriched > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      showToast('Erreur lecture CCTP : ' + err.message, 'error');
    } finally {
      setAnalyzingCCTP(false);
    }
  };

  if (!tender) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main" style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Aucun DPGF chargé</div>
            <div className="muted" style={{ marginBottom: 20 }}>Importez d'abord un fichier DPGF pour commencer.</div>
            <button className="btn brand" onClick={() => nav('/tender')}>{Icons.upload} Importer un DPGF</button>
          </div>
        </div>
      </div>
    );
  }

  const updateLine = (id, field, rawVal) => {
    setLines(ls => ls.map(l => {
      if (l.id !== id) return l;
      const val = field === 'prixUnitaire' || field === 'quantite'
        ? parseFloat(String(rawVal).replace(',', '.')) || 0
        : rawVal;
      const updated = { ...l, [field]: val };
      updated.totalHT = updated.quantite * updated.prixUnitaire;
      return updated;
    }));
  };

  const applyCoeff = () => {
    const c = parseFloat(coeff.replace(',', '.'));
    if (isNaN(c) || c <= 0) return;
    setLines(ls => ls.map(l => ({
      ...l,
      prixUnitaire: parseFloat((l.prixUnitaire * c).toFixed(2)),
      totalHT: parseFloat((l.quantite * l.prixUnitaire * c).toFixed(2)),
    })));
    setShowCoeff(false);
    setCoeff('');
    showToast(`Coefficient ${c} appliqué à tous les prix`, 'success');
  };

  const handleExport = () => {
    handleSave();
    exportDPGF(lines, tender.projectName);
    showToast('DPGF exporté', 'success');
  };

  const handleValidate = () => {
    handleSave();
    nav('/tender/final');
  };

  const displayed = lines.filter((l) => {
    const description = getLineDescription(l).toLowerCase();
    const num = String(l.num || '').toLowerCase();
    const needle = search.toLowerCase();
    return !search || description.includes(needle) || num.includes(needle);
  });

  const totalHT   = lines.filter(l => !l.isSection).reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tva       = totalHT * 0.10;
  const totalTTC  = totalHT + tva;

  const CellPU = ({ line }) => {
    const active = editId === line.id && editField === 'pu';
    return active ? (
      <input
        autoFocus
        type="number"
        step="0.01"
        defaultValue={line.prixUnitaire}
        onBlur={e => { updateLine(line.id, 'prixUnitaire', e.target.value); setEditId(null); setEditField(null); }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditId(null); setEditField(null); } }}
        style={{ width: 90, textAlign: 'right', padding: '3px 6px', border: '2px solid var(--brand-500)', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'var(--font-mono)' }}
      />
    ) : (
      <div
        onClick={() => { setEditId(line.id); setEditField('pu'); }}
        title={line.puFromCatalog ? `Base produits${line.catalogRef ? ' · ' + line.catalogRef : ''} — cliquez pour modifier` : 'Cliquez pour modifier'}
        style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, border: line.puFromCatalog ? '1px solid var(--green-400)' : '1px solid transparent', background: line.puFromCatalog ? '#f0fdf4' : 'transparent', transition: 'all 100ms' }}
        onMouseEnter={e => { if (!line.puFromCatalog) { e.currentTarget.style.borderColor = 'var(--brand-300)'; e.currentTarget.style.background = 'var(--brand-50)'; } }}
        onMouseLeave={e => { if (!line.puFromCatalog) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; } }}
      >
        {line.puFromCatalog && (
          <span style={{ fontSize: 9, fontWeight: 700, color: line.catalogSource === 'batiprix' ? 'var(--violet-700)' : 'var(--green-700)', background: line.catalogSource === 'batiprix' ? '#ede9fe' : '#dcfce7', padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase' }}>
            {line.catalogSource === 'batiprix' ? 'bati' : 'cat.'}
          </span>
        )}
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: line.puFromCatalog ? (line.catalogSource === 'batiprix' ? 'var(--violet-700)' : 'var(--green-700)') : 'inherit' }}>{fmt(line.prixUnitaire)}</span>
      </div>
    );
  };

  const CellQty = ({ line }) => {
    const active = editId === line.id && editField === 'qty';
    const isAuto = line.qtyFromDesc || line.qtySources === 'cctp';
    const badgeColor = line.qtySources === 'cctp' ? 'var(--violet-700)' : 'var(--brand-700)';
    const badgeBg    = line.qtySources === 'cctp' ? '#ede9fe' : 'var(--brand-50)';
    const badgeLabel = line.qtySources === 'cctp' ? 'CCTP' : 'auto';
    const tooltip = line.qtySources === 'cctp'
      ? `Extrait du CCTP : "${line.cctpContext ?? ''}"`
      : 'Extrait de la désignation — vérifiez avant de valider';

    return active ? (
      <input
        autoFocus
        type="number"
        step="0.01"
        defaultValue={line.quantite}
        onBlur={e => { updateLine(line.id, 'quantite', e.target.value); setEditId(null); setEditField(null); }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditId(null); setEditField(null); } }}
        style={{ width: 70, textAlign: 'right', padding: '3px 6px', border: '2px solid var(--brand-500)', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'var(--font-mono)' }}
      />
    ) : (
      <div
        onClick={() => { setEditId(line.id); setEditField('qty'); }}
        title={isAuto ? tooltip : 'Cliquez pour modifier'}
        style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, border: isAuto ? `1px solid ${badgeColor}40` : '1px solid transparent', background: isAuto ? badgeBg : 'transparent', transition: 'all 100ms' }}
        onMouseEnter={e => { if (!isAuto) { e.currentTarget.style.borderColor = 'var(--brand-300)'; e.currentTarget.style.background = 'var(--brand-50)'; } }}
        onMouseLeave={e => { if (!isAuto) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; } }}
      >
        {isAuto && (
          <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: `${badgeColor}20`, padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {badgeLabel}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', color: isAuto ? badgeColor : 'inherit', fontWeight: isAuto ? 600 : 400 }}>
          {line.quantite}
        </span>
      </div>
    );
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["AO", tender.projectName]}
          right={
            <>
              <button className="btn" onClick={() => nav('/tender')}>{Icons.back} Retour</button>
              {lastSaved && (
                <span style={{ fontSize: 11.5, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
                  ✓ {fmtDate(lastSaved)}
                </span>
              )}
              <button className="btn" style={{ background: '#f0fdf4', color: 'var(--green-700)', border: '1px solid #86efac' }} onClick={() => { handleSave(); showToast('Dossier enregistré', 'success'); }}>
                {Icons.check} Enregistrer
              </button>
              <button className="btn" onClick={handleExport}>{Icons.download} Exporter XLSX</button>
              <button className="btn brand" onClick={handleValidate}>{Icons.check} Valider · {displayed.length} lignes</button>
            </>
          }
        />

        {/* Sticky toolbar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}>{Icons.search}</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer les lignes…"
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Catalog matching button */}
          <button
            className="btn"
            style={{ background: 'linear-gradient(135deg,#dcfce7,#d1fae5)', color: 'var(--green-700)', border: '1px solid #86efac', gap: 6 }}
            onClick={openCatalogModal}
            disabled={catalogLoading}
          >
            {catalogLoading ? '⏳ Chargement base produits…' : <>{Icons.package} Base produits</>}
          </button>

          {/* CCTP analysis button */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn"
              style={{ background: 'linear-gradient(135deg,#ede9fe,#dbe7ff)', color: 'var(--violet-700)', border: '1px solid #c4b5fd', gap: 6 }}
              onClick={() => cctpInputRef.current.click()}
              disabled={analyzingCCTP}
            >
              {analyzingCCTP ? '⏳' : Icons.sparkle}
              {analyzingCCTP ? 'Analyse CCTP…' : 'Analyser le CCTP'}
            </button>
            <input
              ref={cctpInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) handleCCTPAnalysis(e.target.files[0]); e.target.value = ''; }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={() => setShowCoeff(s => !s)}>
              × Appliquer un coefficient
            </button>
            {showCoeff && (
              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, padding: 14, zIndex: 100, width: 240, boxShadow: 'var(--shadow-lg)' }}>
                <div className="tiny muted" style={{ marginBottom: 8 }}>Multiplier tous les prix par :</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={coeff}
                    onChange={e => setCoeff(e.target.value)}
                    placeholder="ex : 1.05"
                    onKeyDown={e => e.key === 'Enter' && applyCoeff()}
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13, outline: 'none' }}
                  />
                  <button className="btn primary" onClick={applyCoeff}>OK</button>
                </div>
                <div className="tiny muted" style={{ marginTop: 6 }}>1.05 = +5% · 0.95 = -5%</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span className="muted">HT <strong style={{ color: 'var(--ink)', marginLeft: 4 }} className="tnum">{fmt(totalHT)}</strong></span>
            <span className="muted">TVA 10% <strong style={{ color: 'var(--ink)', marginLeft: 4 }} className="tnum">{fmt(tva)}</strong></span>
            <span style={{ fontWeight: 700, fontSize: 15 }} className="tnum">TTC {fmt(totalTTC)}</span>
          </div>
        </div>

        {/* Auto-qty banner */}
        {(() => {
          const fromDesc = lines.filter(l => l.qtyFromDesc).length;
          const fromCCTP = lines.filter(l => l.qtySources === 'cctp').length;
          if (!fromDesc && !fromCCTP) return null;
          return (
            <div style={{ margin: '12px 24px 0', padding: '10px 16px', background: 'linear-gradient(135deg,#ede9fe,#dbe7ff)', borderRadius: 10, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--violet-700)' }}>{Icons.sparkle}</span>
              <div style={{ flex: 1, fontSize: 13 }}>
                <strong style={{ color: 'var(--violet-700)' }}>Quantités renseignées automatiquement</strong>
                {fromDesc > 0 && <span className="muted" style={{ marginLeft: 10 }}>· {fromDesc} extraite{fromDesc > 1 ? 's' : ''} de la désignation <span style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>auto</span></span>}
                {fromCCTP > 0 && <span className="muted" style={{ marginLeft: 10 }}>· {fromCCTP} extraite{fromCCTP > 1 ? 's' : ''} du CCTP <span style={{ background: '#ede9fe', color: 'var(--violet-700)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>CCTP</span></span>}
              </div>
              <span className="tiny muted">Survolez la cellule pour voir la source · cliquez pour corriger</span>
            </div>
          );
        })()}

        {/* Table */}
        <div className="page-content">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={th}>N°</th>
                <th style={{ ...th, textAlign: 'left', width: '99%' }}>Désignation</th>
                <th style={th}>Unité</th>
                <th style={{ ...th, cursor: 'pointer' }}>Quantité</th>
                <th style={{ ...th, color: 'var(--brand-700)' }}>Prix unit. HT ✎</th>
                <th style={th}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((line, i) =>
                line.isSection ? (
                  <tr key={line.id} style={{ background: 'var(--bg-soft)' }}>
                    <td colSpan={6} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13.5, borderBottom: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                      {line.num && <span className="mono tiny muted" style={{ marginRight: 8 }}>{line.num}</span>}
                      {getLineDescription(line)}
                    </td>
                  </tr>
                ) : (
                  <tr key={line.id} style={{ borderBottom: '1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-softer)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{line.num}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--ink-2)', lineHeight: 1.4 }}>
                      <div
                        style={{ fontWeight: 500, cursor: 'pointer' }}
                        title="Cliquer pour rechercher manuellement une base produit ou une référence Batiprix"
                        onClick={() => openManualCatalogPicker(line)}
                      >
                        {getLineDescription(line)}
                      </div>
                      {line.cctpSpecs?.length > 0 ? (
                        <div
                          onClick={(e) => openSpecPopover(e, line)}
                          style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '3px 6px', cursor: 'pointer' }}
                        >
                          {line.cctpSpecs.map((s, i) => (
                            <span key={i} style={{ fontSize: 10.5, color: 'var(--violet-700)', background: '#ede9fe', padding: '1px 6px', borderRadius: 4, fontStyle: 'italic', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Cliquer pour voir le détail complet">
                              {s.length > 45 ? s.substring(0, 44) + '…' : s}
                            </span>
                          ))}
                          <span style={{ fontSize: 10, color: 'var(--violet-700)', fontFamily: 'var(--font-mono)', background: '#ede9fe', padding: '1px 5px', borderRadius: 4, opacity: 0.7 }}>§CCTP ↗</span>
                        </div>
                      ) : line.cctpAnalyzed ? (
                        line.cctpBlock ? (
                          // Matched in CCTP but no technical specs extracted → still clickable
                          <div style={{ marginTop: 3, cursor: 'pointer', display: 'inline-block' }} onClick={(e) => openSpecPopover(e, line)}>
                            <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', background: 'var(--bg-soft)', padding: '1px 7px', borderRadius: 4, border: '1px solid var(--line)' }}>
                              §CCTP ↗
                            </span>
                          </div>
                        ) : (
                          // Truly not found after full analysis
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)', background: 'var(--bg-soft)', padding: '1px 7px', borderRadius: 4, border: '1px dashed var(--line)' }}>
                              §CCTP — non trouvé
                            </span>
                          </div>
                        )
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{line.unite}</td>
                    <td style={{ padding: '8px 14px' }}><CellQty line={line} /></td>
                    <td style={{ padding: '8px 8px' }}><CellPU line={line} /></td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {fmt(line.quantite * line.prixUnitaire)}
                    </td>
                  </tr>
                )
              )}
              {displayed.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>Aucune ligne ne correspond à « {search} »</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-soft)', borderTop: '2px solid var(--line)' }}>
                <td colSpan={4} />
                <td style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right', fontSize: 13 }}>Total HT</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)' }}>{fmt(totalHT)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ padding: '10px 14px', background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)', fontSize: 12.5, color: 'var(--brand-700)' }}>
            ✎ Cliquez sur un prix unitaire ou une quantité pour le modifier. Appuyez sur <kbd style={{ padding: '1px 5px', border: '1px solid var(--brand-200)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>Entrée</kbd> pour confirmer.
          </div>
        </div>
      </div>

      {/* ── CCTP spec popover ── */}
      {specPopover && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 4999 }}
          onClick={() => setSpecPopover(null)}
        >
          <div
            className="card"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(specPopover.top, window.innerHeight - 320),
              left: Math.min(specPopover.left, window.innerWidth - 400),
              width: 380,
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 5000,
              border: '1px solid #c4b5fd',
            }}
          >
            {/* Header */}
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,#ede9fe,#dbe7ff)', borderBottom: '1px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--violet-700)', fontSize: 14 }}>{Icons.sparkle}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--violet-700)' }}>Extrait du CCTP</span>
              </div>
              <button
                onClick={() => setSpecPopover(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--violet-700)', lineHeight: 1, padding: '2px 6px' }}
              >×</button>
            </div>

            {/* Designation */}
            <div style={{ padding: '10px 16px 6px', fontSize: 12, color: 'var(--ink-4)', borderBottom: '1px solid var(--line-soft)', fontStyle: 'italic' }}>
              {specPopover.description}
            </div>

            {/* Full CCTP block text */}
            {specPopover.block ? (
              <div style={{ padding: '10px 16px', maxHeight: 340, overflowY: 'auto' }}>
                {/* Highlighted specs at top */}
                {specPopover.specs?.length > 0 && (
                  <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
                    {specPopover.specs.map((s, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--violet-700)', background: '#ede9fe', padding: '2px 8px', borderRadius: 4, fontStyle: 'italic', fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                )}
                {/* Full raw text */}
                <pre style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                  {specPopover.block}
                </pre>
              </div>
            ) : (
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {specPopover.specs?.map((s, i) => (
                  <div key={i} style={{ padding: '7px 11px', background: '#ede9fe', borderRadius: 7, fontSize: 12.5, color: 'var(--violet-700)', lineHeight: 1.55, fontStyle: 'italic' }}>
                    {s}
                  </div>
                ))}
              </div>
            )}

            {/* Context ref */}
            {specPopover.context && (
              <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--line-soft)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Référence</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {specPopover.context}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Catalog matching modal ── */}
      {showCatalogModal && (() => {
        const gc = parseFloat(globalCoeff.replace(',', '.')) || 1.4;
        const selected = catalogMatches.filter(m => !!selectedMatchChoice[m.lineId]);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="card" style={{ width: '100%', maxWidth: 1080, maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow-lg)' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', color: 'var(--green-700)', display: 'grid', placeItems: 'center' }}>{Icons.package}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Correspondances base produits</div>
                  <div className="tiny muted">{catalogMatches.length} ligne{catalogMatches.length > 1 ? 's' : ''} matchée{catalogMatches.length > 1 ? 's' : ''} · {selected.length} sélectionnée{selected.length > 1 ? 's' : ''}</div>
                </div>
                {/* Global coefficient */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-soft)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <span className="tiny muted">Coeff. global</span>
                  <input
                    type="number" step="0.05" min="1" max="5"
                    value={globalCoeff}
                    onChange={e => setGlobalCoeff(e.target.value)}
                    style={{ width: 70, padding: '4px 8px', border: '1px solid var(--brand-300)', borderRadius: 6, fontSize: 13, textAlign: 'right', outline: 'none', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                  <span className="tiny muted">× PA</span>
                </div>
                <button className="btn ghost" onClick={() => setShowCatalogModal(false)} style={{ fontSize: 18, padding: '4px 10px' }}>×</button>
              </div>

              {/* Table */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Désignation DPGF</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Suggestion principale</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Alternative</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Choix manuel</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>PA HT</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Coeff.</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, color: 'var(--green-700)', fontWeight: 600 }}>PU proposé</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Choix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogMatches.map(m => {
                      const c = parseFloat((coeffOverrides[m.lineId] ?? '').replace(',', '.')) || gc;
                      const choice = selectedMatchChoice[m.lineId];
                      const manual = manualMatchSelections[m.lineId] || m.manualMatch;
                      const selectedMatch = choice === 'manual'
                        ? manual
                        : choice === 'secondary'
                          ? m.secondaryMatch
                          : m.primaryMatch;
                      const puPropose = selectedMatch ? parseFloat((selectedMatch.product.prixAchat * c).toFixed(2)) : 0;
                      const primary = m.primaryMatch;
                      const secondary = m.secondaryMatch;
                      const primaryScoreColor = (primary?.score || 0) >= 0.6 ? 'var(--green-700)' : (primary?.score || 0) >= 0.35 ? 'var(--brand-700)' : 'var(--ink-4)';
                      return (
                        <tr key={m.lineId} style={{ opacity: choice ? 1 : 0.6, borderBottom: '1px solid var(--line-soft)', background: choice ? '' : 'var(--bg-soft)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{getLineDescription(m.line).substring(0, 55)}{getLineDescription(m.line).length > 55 ? '…' : ''}</div>
                            <div className="tiny muted">{m.line.num} · {m.line.unite}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {primary ? (
                              <>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                  <input
                                    type="radio"
                                    name={`match-${m.lineId}`}
                                    checked={choice === 'primary'}
                                    onChange={() => setSelectedMatchChoice((p) => ({ ...p, [m.lineId]: 'primary' }))}
                                  />
                                  <div>
                                    <div className="tiny muted" style={{ marginBottom: 3 }}>
                                      {primary.source === 'batiprix' ? 'Référence Batiprix' : 'Produit catalogue'}
                                    </div>
                                    <div style={{ fontSize: 13 }}>{primary.product.description.substring(0, 46)}{primary.product.description.length > 46 ? '…' : ''}</div>
                                    <div className="tiny" style={{ color: 'var(--ink-4)' }}>
                                      {primary.product.ref && <span style={{ fontFamily: 'var(--font-mono)' }}>{primary.product.ref} · </span>}
                                      {primary.product.fournisseur}
                                    </div>
                                    <span style={{ marginTop: 4, display: 'inline-block', fontSize: 11, fontWeight: 700, color: primary.source === 'batiprix' ? 'var(--violet-700)' : primaryScoreColor, background: primary.source === 'batiprix' ? '#ede9fe' : primaryScoreColor + '18', padding: '2px 7px', borderRadius: 20 }}>
                                      {primary.source === 'batiprix' ? 'Batiprix ' : ''}{Math.round(primary.score * 100)}%
                                    </span>
                                  </div>
                                </label>
                              </>
                            ) : (
                              <div className="tiny muted">Aucune suggestion fiable</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {secondary ? (
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`match-${m.lineId}`}
                                  checked={choice === 'secondary'}
                                  onChange={() => setSelectedMatchChoice((p) => ({ ...p, [m.lineId]: 'secondary' }))}
                                />
                                <div>
                                  <div className="tiny muted" style={{ marginBottom: 3 }}>
                                    {secondary.source === 'batiprix' ? 'Alternative Batiprix' : 'Alternative catalogue'}
                                  </div>
                                  <div style={{ fontSize: 13 }}>{secondary.product.description.substring(0, 46)}{secondary.product.description.length > 46 ? '…' : ''}</div>
                                  <div className="tiny" style={{ color: 'var(--ink-4)' }}>
                                    {secondary.product.ref && <span style={{ fontFamily: 'var(--font-mono)' }}>{secondary.product.ref} · </span>}
                                    {secondary.product.fournisseur}
                                  </div>
                                  <span style={{ marginTop: 4, display: 'inline-block', fontSize: 11, fontWeight: 700, color: secondary.source === 'batiprix' ? 'var(--violet-700)' : 'var(--brand-700)', background: secondary.source === 'batiprix' ? '#ede9fe' : 'var(--brand-50)', padding: '2px 7px', borderRadius: 20 }}>
                                    {secondary.source === 'batiprix' ? 'Batiprix ' : 'Catalogue '}{Math.round(secondary.score * 100)}%
                                  </span>
                                </div>
                              </label>
                            ) : (
                              <div className="tiny muted">Pas d’alternative utile</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {manual ? (
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`match-${m.lineId}`}
                                  checked={choice === 'manual'}
                                  onChange={() => setSelectedMatchChoice((p) => ({ ...p, [m.lineId]: 'manual' }))}
                                />
                                <div>
                                  <div className="tiny muted" style={{ marginBottom: 3 }}>Suggestion manuelle</div>
                                  <div style={{ fontSize: 13 }}>{manual.product.description.substring(0, 46)}{manual.product.description.length > 46 ? '…' : ''}</div>
                                  <div className="tiny" style={{ color: 'var(--ink-4)' }}>
                                    {manual.product.ref && <span style={{ fontFamily: 'var(--font-mono)' }}>{manual.product.ref} · </span>}
                                    {manual.product.fournisseur}
                                  </div>
                                  <span style={{ marginTop: 4, display: 'inline-block', fontSize: 11, fontWeight: 700, color: manual.source === 'batiprix' ? 'var(--violet-700)' : 'var(--brand-700)', background: manual.source === 'batiprix' ? '#ede9fe' : 'var(--brand-50)', padding: '2px 7px', borderRadius: 20 }}>
                                    {manual.source === 'batiprix' ? 'Batiprix' : 'Catalogue'} {Math.round(manual.score * 100)}%
                                  </span>
                                </div>
                              </label>
                            ) : (
                              <div className="tiny muted" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span>Aucune sélection manuelle</span>
                                <button className="btn sm ghost" onClick={() => openManualCatalogPicker(m.line, 'modal-select')}>
                                  Rechercher…
                                </button>
                              </div>
                            )}
                            {manual && (
                              <div style={{ marginTop: 8 }}>
                                <button className="btn sm ghost" onClick={() => openManualCatalogPicker(m.line, 'modal-select')}>
                                  Modifier…
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                            {selectedMatch ? fmt(selectedMatch.product.prixAchat) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input type="number" step="0.05" min="1" max="5"
                              value={coeffOverrides[m.lineId] ?? ''}
                              placeholder={gc.toFixed(2)}
                              onChange={e => setCoeffOverrides(p => ({ ...p, [m.lineId]: e.target.value }))}
                              style={{ width: 64, padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, textAlign: 'right', outline: 'none', fontFamily: 'var(--font-mono)' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-700)', fontSize: 14 }}>{selectedMatch ? fmt(puPropose) : '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              className="btn sm ghost"
                              onClick={() => setSelectedMatchChoice((p) => ({ ...p, [m.lineId]: null }))}
                              disabled={!choice}
                            >
                              Aucun
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tiny muted">{selected.length} ligne{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''} · coefficient {gc.toFixed(2)} · marge {Math.round((gc - 1) * 100)}%</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => setShowCatalogModal(false)}>Annuler</button>
                  <button className="btn brand" style={{ background: 'var(--green-600)', borderColor: 'var(--green-700)' }} onClick={applyCatalogMatches} disabled={!selected.length}>
                    {Icons.check} Appliquer {selected.length} prix
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {manualCatalogPicker && (() => {
        const line = lines.find((item) => item.id === manualCatalogPicker.lineId);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 5200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="card" style={{ width: '100%', maxWidth: 920, maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: 'var(--brand-700)', display: 'grid', placeItems: 'center' }}>{Icons.search}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>Recherche manuelle</div>
                  <div className="tiny muted">{line ? getLineDescription(line) : ''}</div>
                </div>
                <button className="btn ghost" onClick={() => setManualCatalogPicker(null)} style={{ fontSize: 18, padding: '4px 10px' }}>×</button>
              </div>

              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={manualCatalogPicker.query}
                  onChange={(e) => updateManualCatalogQuery(e.target.value)}
                  placeholder="Tape une désignation, une référence, un synonyme métier…"
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13.5, outline: 'none' }}
                />
                <div className="tiny muted">Coeff. actuel {globalCoeff}</div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Référence</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>PA HT</th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, color: 'var(--green-700)', fontWeight: 600 }}>PU appliqué</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Match</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualCatalogPicker.results.map((entry, idx) => {
                      const c = parseFloat(globalCoeff.replace(',', '.')) || 1.4;
                      const pu = parseFloat((entry.product.prixAchat * c).toFixed(2));
                      const isBatiprix = entry.source === 'batiprix';
                      return (
                        <tr key={`${entry.product.id}-${idx}`} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isBatiprix ? 'var(--violet-700)' : 'var(--green-700)', background: isBatiprix ? '#ede9fe' : '#dcfce7', padding: '2px 7px', borderRadius: 20 }}>
                              {isBatiprix ? 'Batiprix' : 'Catalogue'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: 13 }}>{entry.product.description}</div>
                            <div className="tiny" style={{ color: 'var(--ink-4)' }}>
                              {entry.product.ref && <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.product.ref} · </span>}
                              {entry.product.fournisseur}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(entry.product.prixAchat)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-700)' }}>{fmt(pu)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isBatiprix ? 'var(--violet-700)' : 'var(--brand-700)', background: isBatiprix ? '#ede9fe' : 'var(--brand-50)', padding: '2px 7px', borderRadius: 20 }}>
                              {Math.round(entry.score * 100)}%
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button className="btn sm brand" onClick={() => applyManualCatalogChoice(entry)}>
                              Choisir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {manualCatalogPicker.results.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>
                          Aucune proposition trouvée pour cette recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {Toast}
    </div>
  );
}

const th = {
  padding: '10px 14px',
  textAlign: 'right',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-4)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--line)',
};

// ─── FINAL ─────────────────────────────────────────────────────────────────────

export function TenderFinalScreen() {
  const nav = useNavigate();
  const [showToast, Toast] = useToast();
  const [deposited, setDeposited] = useState(false);
  const tender = loadTender();

  if (!tender) {
    return (
      <div className="app"><Sidebar />
        <div className="main" style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="muted" style={{ marginBottom: 16 }}>Aucun dossier chargé.</div>
            <button className="btn brand" onClick={() => nav('/tender')}>Importer un DPGF</button>
          </div>
        </div>
      </div>
    );
  }

  const lines = tender.lines ?? [];
  const totalHT  = lines.filter(l => !l.isSection).reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tva      = totalHT * 0.10;
  const totalTTC = totalHT + tva;

  const handleExport = () => {
    exportDPGF(lines, tender.projectName);
    showToast('DPGF exporté avec succès', 'success');
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={[tender.projectName, 'DPGF finalisé']}
          right={
            <>
              <button className="btn" onClick={() => nav('/tender/match')}>{Icons.edit} Modifier</button>
              <button className="btn" onClick={handleExport}>{Icons.download} Export XLSX</button>
              <button className={`btn ${deposited ? '' : 'brand'}`} onClick={() => { setDeposited(true); showToast('Offre déposée — ' + tender.projectName, 'success'); }} disabled={deposited}>
                {deposited ? '✓ Offre déposée' : <>{Icons.send} Déposer l'offre</>}
              </button>
            </>
          }
        />
        <div className="page-content" style={{ padding: '24px 28px' }}>
          <div className="ai-stripe" style={{ borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6f4ce0,#2b6bff)', color: '#fff', display: 'grid', placeItems: 'center' }}>{Icons.check}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>DPGF validé · <span className="ai-grad">{lines.filter(l => !l.isSection).length} lignes · {fmt(totalHT)} HT</span></div>
              <div className="tiny muted">Fichier source : {tender.dpgfFileName} · {tender.cctpFileName ? 'CCTP : ' + tender.cctpFileName : 'Pas de CCTP'}</div>
            </div>
            <span className={`pill ${deposited ? 'scheduled' : 'scheduled'}`} style={{ fontSize: 11 }}>
              <span className="dot" />{deposited ? 'Offre déposée ✓' : 'Prêt'}
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)' }}>
                  <th style={th}>N°</th>
                  <th style={{ ...th, textAlign: 'left', width: '99%' }}>Désignation</th>
                  <th style={th}>Unité</th>
                  <th style={th}>Quantité</th>
                  <th style={th}>Prix unit. HT</th>
                  <th style={th}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) =>
                  l.isSection ? (
                    <tr key={l.id} style={{ background: 'var(--bg-soft)' }}>
                      <td colSpan={6} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                        {l.num && <span className="mono tiny muted" style={{ marginRight: 8 }}>{l.num}</span>}
                        {getLineDescription(l)}
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{l.num}</td>
                      <td style={{ padding: '8px 14px', color: 'var(--ink-2)', lineHeight: 1.4 }}>{getLineDescription(l)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>{l.unite}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.quantite}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{fmt(l.prixUnitaire)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(l.quantite * l.prixUnitaire)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="card" style={{ padding: 20, minWidth: 320 }}>
              {[['Total HT', fmt(totalHT)], ['TVA 10 %', fmt(tva)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span className="muted">{k}</span><span className="tnum">{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: '1px solid var(--line-strong)', fontWeight: 700, fontSize: 18 }}>
                <span>Total TTC</span><span className="tnum">{fmt(totalTTC)}</span>
              </div>
              <button className="btn brand" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={handleExport}>
                {Icons.download} Télécharger le DPGF modifié
              </button>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
