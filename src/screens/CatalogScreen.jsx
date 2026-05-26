import { useState, useRef, useEffect } from 'react';
import { Sidebar, Topbar, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';
import * as XLSX from 'xlsx';
import { loadCatalog, saveCatalog, loadCatalogFromDB, upsertProductsToDB, deleteProductsFromDB, clearCatalogDB, parseCatalogExcel, parseCatalogPdf } from '../data/catalogStore';

const fmt = n => (parseFloat(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const FAMILIES = ['Robinetterie', 'Canalisations', 'Sanitaires', 'Chauffe-eau', 'Chauffage', 'Électricité', 'Accessoires', 'Main d\'œuvre', 'Autre'];

const DEMO_PRODUCTS = [
  { id:'d1', ref:'ROB-001', description:'Mitigeur lavabo bec standard chromé', unite:'u', prixAchat:42.50, fournisseur:'Grohe', famille:'Robinetterie' },
  { id:'d2', ref:'ROB-002', description:'Mitigeur douche thermostatique encastré', unite:'u', prixAchat:118.00, fournisseur:'Hansgrohe', famille:'Robinetterie' },
  { id:'d3', ref:'SAN-001', description:'WC suspendu cuvette céramique blanc', unite:'u', prixAchat:185.00, fournisseur:'Geberit', famille:'Sanitaires' },
  { id:'d4', ref:'SAN-002', description:'Lavabo simple vasque 60 cm fonte minérale', unite:'u', prixAchat:89.00, fournisseur:'Allia', famille:'Sanitaires' },
  { id:'d5', ref:'SAN-003', description:'Receveur de douche extra-plat 90x90', unite:'u', prixAchat:145.00, fournisseur:'Roca', famille:'Sanitaires' },
  { id:'d6', ref:'CAN-001', description:'Tube cuivre écroui Ø 18 mm barre 5 m', unite:'ml', prixAchat:8.40, fournisseur:'Giacomini', famille:'Canalisations' },
  { id:'d7', ref:'CAN-002', description:'Tube cuivre écroui Ø 22 mm barre 5 m', unite:'ml', prixAchat:11.20, fournisseur:'Giacomini', famille:'Canalisations' },
  { id:'d8', ref:'CAN-003', description:'Tube PER multicouche Ø 16 mm', unite:'ml', prixAchat:2.80, fournisseur:'Uponor', famille:'Canalisations' },
  { id:'d9', ref:'CAN-004', description:'Évacuation PVC Ø 100 collecteur', unite:'ml', prixAchat:6.20, fournisseur:'Nicoll', famille:'Canalisations' },
  { id:'d10', ref:'CHE-001', description:'Chauffe-eau électrique 150 L stéatite', unite:'u', prixAchat:285.00, fournisseur:'Atlantic', famille:'Chauffe-eau' },
  { id:'d11', ref:'CHE-002', description:'Chauffe-eau thermodynamique 200 L', unite:'u', prixAchat:890.00, fournisseur:'Atlantic', famille:'Chauffe-eau' },
  { id:'d12', ref:'ACC-001', description:'Robinet d\'arrêt avant compteur DN20', unite:'u', prixAchat:9.80, fournisseur:'RBM', famille:'Accessoires' },
  { id:'d13', ref:'MO-001', description:'Main d\'œuvre plombier qualifié', unite:'h', prixAchat:38.00, fournisseur:'Interne', famille:'Main d\'œuvre' },
  { id:'d14', ref:'MO-002', description:'Main d\'œuvre aide-plombier', unite:'h', prixAchat:26.00, fournisseur:'Interne', famille:'Main d\'œuvre' },
];

export default function CatalogScreen() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkMode, setBulkMode] = useState('fournisseur'); // 'fournisseur' | 'famille' | 'tout'
  const [bulkTarget, setBulkTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showToast, Toast] = useToast();
  const fileRef = useRef();

  // Charge depuis Supabase au montage, met à jour le cache local
  useEffect(() => {
    const cachedProducts = loadCatalog();
    if (cachedProducts.length) {
      setProducts(cachedProducts);
    }

    loadCatalogFromDB()
      .then((loadedProducts) => {
        setProducts(loadedProducts);
        setLoadError('');
      })
      .catch((err) => {
        const message = err?.message || 'Chargement du catalogue impossible.';
        setLoadError(message);
        showToast(message, 'error');
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, []);

  useEffect(() => {
    if (!saving) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving]);

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const parsed = file.name.toLowerCase().endsWith('.pdf')
        ? await parseCatalogPdf(file)
        : await parseCatalogExcel(file);
      const isBatiprixImport = parsed.every((product) => product.source === 'batiprix');
      setPendingImport({ products: parsed, supplierName: isBatiprixImport ? 'Batiprix' : '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setImporting(false); }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    const { products: parsed, supplierName } = pendingImport;
    setPendingImport(null);
    const supplier = supplierName.trim();
    const withSupplier = parsed.map(p => ({ ...p, fournisseur: supplier || p.fournisseur }));
    const next = [...products, ...withSupplier];
    setProducts(next);
    saveCatalog(next);

    setSaving(true);
    try {
      await upsertProductsToDB(withSupplier);
      showToast(`${withSupplier.length} produits importés et enregistrés`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadDemo = async () => {
    setProducts(DEMO_PRODUCTS);
    saveCatalog(DEMO_PRODUCTS);
    setSaving(true);
    try {
      await upsertProductsToDB(DEMO_PRODUCTS);
      showToast('Base de démonstration chargée et enregistrée', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p) => { setEditId(p.id); setEditData({ ...p }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const commitEdit = async () => {
    const updated = { ...products.find(p => p.id === editId), ...editData };
    const next = products.map(p => p.id === editId ? updated : p);
    setProducts(next);
    saveCatalog(next);
    setSaving(true);
    try {
      await upsertProductsToDB([updated]);
      setEditId(null);
      showToast('Produit mis à jour', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    const next = products.filter(p => p.id !== id);
    setProducts(next);
    saveCatalog(next);
    setSaving(true);
    try {
      await deleteProductsFromDB([id]);
      showToast('Produit supprimé', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmBulkDelete = async () => {
    let next, deletedIds;
    if (bulkMode === 'tout') {
      next = []; deletedIds = products.map(p => p.id);
    } else if (bulkMode === 'fournisseur') {
      next = products.filter(p => p.fournisseur !== bulkTarget);
      deletedIds = products.filter(p => p.fournisseur === bulkTarget).map(p => p.id);
    } else {
      next = products.filter(p => p.famille !== bulkTarget);
      deletedIds = products.filter(p => p.famille === bulkTarget).map(p => p.id);
    }
    setProducts(next);
    saveCatalog(next);
    setSaving(true);
    try {
      if (bulkMode === 'tout') await clearCatalogDB();
      else await deleteProductsFromDB(deletedIds);
      showToast(`${deletedIds.length} produit${deletedIds.length > 1 ? 's' : ''} supprimé${deletedIds.length > 1 ? 's' : ''}`, 'success');
      setShowBulkDelete(false);
      setBulkTarget('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const suppliers = [...new Set(products.map(p => p.fournisseur).filter(Boolean))].sort();

  const addRow = () => {
    const newP = { id: `new-${Date.now()}`, ref: '', description: '', unite: 'u', prixAchat: 0, fournisseur: '', famille: '' };
    const next = [newP, ...products];
    setProducts(next);
    saveCatalog(next);
    startEdit(newP);
  };

  const exportCatalog = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Référence', 'Désignation', 'Unité', 'Prix achat HT', 'Prix vente HT', 'Fournisseur', 'Famille', 'Description / Infos CCTP'],
      ...products.map(p => [p.ref, p.description, p.unite, p.prixAchat, p.prixVente || '', p.fournisseur, p.famille, p.descriptionCctp || '']),
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogue');
    XLSX.writeFile(wb, 'Catalogue_produits_DPM.xlsx');
    showToast('Export Excel généré', 'success');
  };

  const families = [...new Set(products.map(p => p.famille).filter(Boolean))];
  const displayed = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.description.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q) || p.fournisseur?.toLowerCase().includes(q);
    const matchFamily = !familyFilter || p.famille === familyFilter;
    return matchSearch && matchFamily;
  });

  const totalValue = products.reduce((s, p) => s + p.prixAchat, 0);

  const th = { padding: '9px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 600, whiteSpace: 'nowrap' };
  const td = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--line-soft)', verticalAlign: 'middle' };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={['Base produits']}
          right={
            <>
              <button className="btn" onClick={exportCatalog} disabled={!products.length}>{Icons.download} Exporter</button>
              {products.length > 0 && (
                <button className="btn" onClick={() => { setShowBulkDelete(true); setBulkMode('fournisseur'); setBulkTarget(suppliers[0] || ''); }}
                  disabled={saving}
                  style={{ color: 'var(--red-500)', borderColor: 'var(--red-200)' }}>
                  🗑 Supprimer en masse
                </button>
              )}
              <button className="btn" onClick={() => fileRef.current.click()} disabled={importing || saving}>
                {(importing || saving) ? '⏳' : Icons.upload} {importing ? 'Import…' : saving ? 'Enregistrement…' : 'Importer'}
              </button>
              <button className="btn brand" onClick={addRow} disabled={saving}>{Icons.plus} Ajouter</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
            </>
          }
        />

        {/* KPI bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', background: '#fff' }}>
          {[
            { l: 'Produits', v: products.length, c: 'var(--brand-700)' },
            { l: 'Fournisseurs', v: new Set(products.map(p => p.fournisseur).filter(Boolean)).size, c: 'var(--violet-700)' },
            { l: 'Familles', v: families.length, c: 'var(--green-700)' },
            { l: 'PA moyen', v: products.length ? fmt(totalValue / products.length) : '—', c: 'var(--ink)' },
          ].map((k, i) => (
            <div key={i} style={{ flex: 1, padding: '14px 24px', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }}>
              <div className="tiny muted">{k.l}</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: k.c, letterSpacing: '-0.02em' }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}>{Icons.search}</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par désignation, réf, fournisseur…"
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
          </div>
          <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none', color: 'var(--ink)', background: '#fff' }}>
            <option value="">Toutes familles</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="tiny muted">
            {saving ? 'Enregistrement du catalogue en cours…' : `${displayed.length} produit${displayed.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {loadError && (
          <div style={{ margin: '16px 24px 0', padding: '12px 14px', borderRadius: 10, background: '#fff4e5', border: '1px solid #f5c27a', color: '#8a4b08', fontSize: 13 }}>
            <strong>Catalogue distant indisponible.</strong> {loadError}
          </div>
        )}

        {loadingCatalog && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--ink-4)', fontSize: 14 }}>
            Chargement du catalogue distant…
          </div>
        )}

        {/* Empty state */}
        {!loadingCatalog && products.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340, gap: 12, color: 'var(--ink-4)' }}>
            <div style={{ fontSize: 40 }}>📦</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink-2)' }}>Aucun produit dans la base</div>
            <div className="muted" style={{ fontSize: 13 }}>Importez votre catalogue Excel ou utilisez les données de démo</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn brand" onClick={() => fileRef.current.click()}>{Icons.upload} Importer Excel</button>
              <button className="btn" onClick={loadDemo}>{Icons.sparkle} Charger la démo</button>
            </div>
          </div>
        )}

        {/* Table */}
        {!loadingCatalog && products.length > 0 && (
          <div className="page-content" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={th}>Référence</th>
                  <th style={{ ...th, width: '99%' }}>Désignation</th>
                  <th style={th}>Unité</th>
                  <th style={{ ...th, textAlign: 'right' }}>Prix achat HT</th>
                  <th style={th}>Fournisseur</th>
                  <th style={th}>Famille</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(p => {
                  if (editId === p.id) {
                    const inp = (field, width, type = 'text', placeholder = '') => (
                      <input
                        type={type}
                        value={editData[field] ?? ''}
                        onChange={e => setEditData(d => ({ ...d, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                        placeholder={placeholder}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        style={{ width, padding: '4px 8px', border: '2px solid var(--brand-400)', borderRadius: 6, fontSize: 13, outline: 'none' }}
                      />
                    );
                    return (
                      <tr key={p.id} style={{ background: 'var(--brand-50)' }}>
                        <td style={td}>{inp('ref', 90, 'text', 'Réf.')}</td>
                        <td style={td}>{inp('description', '100%', 'text', 'Désignation')}</td>
                        <td style={td}>{inp('unite', 60, 'text', 'u')}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{inp('prixAchat', 90, 'number', '0.00')}</td>
                        <td style={td}>{inp('fournisseur', 110, 'text', 'Fournisseur')}</td>
                        <td style={td}>
                          <select value={editData.famille ?? ''} onChange={e => setEditData(d => ({ ...d, famille: e.target.value }))}
                            style={{ padding: '4px 8px', border: '2px solid var(--brand-400)', borderRadius: 6, fontSize: 13, outline: 'none' }}>
                            <option value="">—</option>
                            {FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          <button className="btn sm primary" onClick={commitEdit} style={{ marginRight: 4 }}>{Icons.check}</button>
                          <button className="btn sm ghost" onClick={cancelEdit}>×</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={p.id} style={{ transition: 'background 80ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', fontSize: 12 }}>{p.ref || '—'}</td>
                      <td style={{ ...td, fontWeight: 500 }}>{p.description}</td>
                      <td style={{ ...td, color: 'var(--ink-3)' }}>{p.unite || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green-700)' }}>{fmt(p.prixAchat)}</td>
                      <td style={{ ...td, color: 'var(--ink-3)' }}>{p.fournisseur || '—'}</td>
                      <td style={td}>
                        {p.famille && <span className="pill muted" style={{ fontSize: 11 }}>{p.famille}</span>}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button className="btn sm ghost" onClick={() => startEdit(p)} style={{ marginRight: 4 }}>{Icons.edit}</button>
                        <button className="btn sm ghost" onClick={() => deleteProduct(p.id)} style={{ color: 'var(--red-500)' }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {displayed.length === 0 && products.length > 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)', fontSize: 13 }}>
                Aucun produit ne correspond à la recherche
              </div>
            )}
          </div>
        )}

        {/* Format hint */}
        {products.length === 0 && (
          <div style={{ margin: '0 24px', padding: '14px 18px', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
            <strong>Formats Excel acceptés :</strong> catalogue standard avec colonnes <em>Référence</em>, <em>Désignation</em>, <em>Unité</em>, <em>Prix achat HT</em>, <em>Fournisseur</em>, <em>Famille</em>, ou export <em>Batiprix</em> avec colonnes <em>Code</em>, <em>Ouvrage</em>, <em>Prix achat HT (€)</em>, <em>Prix vente HT (€)</em>, <em>Description / Infos CCTP</em>.
          </div>
        )}
      </div>
      {Toast}

      {/* Modale suppression en masse */}
      {showBulkDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Suppression en masse</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Choisissez ce que vous souhaitez supprimer.</div>

            {/* Onglets de mode */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {[['fournisseur', 'Par fournisseur'], ['famille', 'Par famille'], ['tout', 'Tout vider']].map(([mode, label]) => (
                <button key={mode} onClick={() => { setBulkMode(mode); setBulkTarget(mode === 'fournisseur' ? suppliers[0] || '' : mode === 'famille' ? families[0] || '' : ''); }}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '2px solid', cursor: 'pointer',
                    borderColor: bulkMode === mode ? (mode === 'tout' ? 'var(--red-400)' : 'var(--brand-400)') : 'var(--line)',
                    background: bulkMode === mode ? (mode === 'tout' ? 'var(--red-50, #fff5f5)' : 'var(--brand-50)') : '#fff',
                    color: bulkMode === mode ? (mode === 'tout' ? 'var(--red-600)' : 'var(--brand-700)') : 'var(--ink-3)' }}>
                  {label}
                </button>
              ))}
            </div>

            {bulkMode === 'fournisseur' && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fournisseur</label>
                <select value={bulkTarget} onChange={e => setBulkTarget(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, marginBottom: 20, padding: '10px 14px', border: '2px solid var(--line)', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                  {suppliers.map(s => <option key={s} value={s}>{s} — {products.filter(p => p.fournisseur === s).length} produits</option>)}
                </select>
              </>
            )}

            {bulkMode === 'famille' && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Famille</label>
                <select value={bulkTarget} onChange={e => setBulkTarget(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, marginBottom: 20, padding: '10px 14px', border: '2px solid var(--line)', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                  {families.map(f => <option key={f} value={f}>{f} — {products.filter(p => p.famille === f).length} produits</option>)}
                </select>
              </>
            )}

            {bulkMode === 'tout' && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--red-50, #fff5f5)', border: '1px solid var(--red-200, #fecaca)', borderRadius: 8, fontSize: 13, color: 'var(--red-600)' }}>
                Tous les <strong>{products.length} produits</strong> seront supprimés. Cette action est irréversible.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowBulkDelete(false)}>Annuler</button>
              <button className="btn" onClick={confirmBulkDelete}
                disabled={saving || (bulkMode !== 'tout' && !bulkTarget)}
                style={{ background: 'var(--red-500)', color: '#fff', borderColor: 'var(--red-500)', opacity: (bulkMode !== 'tout' && !bulkTarget) ? 0.5 : 1 }}>
                Supprimer {bulkMode === 'tout' ? 'tout' : bulkMode === 'fournisseur' ? `"${bulkTarget}"` : `famille "${bulkTarget}"`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale fournisseur à l'import */}
      {pendingImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Importer {pendingImport.products.length} produits</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
              Quel fournisseur associer à cet import ? {pendingImport.products.every((product) => product.source === 'batiprix') ? 'Le format Batiprix est prérempli.' : ''}
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fournisseur</label>
            <input
              autoFocus
              value={pendingImport.supplierName}
              onChange={e => setPendingImport(p => ({ ...p, supplierName: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') confirmImport(); if (e.key === 'Escape') setPendingImport(null); }}
              placeholder="Ex : Apollo, Grohe, Nicoll…"
              style={{ display: 'block', width: '100%', marginTop: 6, marginBottom: 24, padding: '10px 14px', border: '2px solid var(--brand-400)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setPendingImport(null)} disabled={saving}>Annuler</button>
              <button className="btn brand" onClick={confirmImport} disabled={saving}>Importer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
