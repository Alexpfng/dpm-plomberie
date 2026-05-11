import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';
import * as XLSX from 'xlsx';
import { loadCatalog, saveCatalog, parseCatalogExcel } from '../data/catalogStore';

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
  const nav = useNavigate();
  const [products, setProducts] = useState(() => {
    const stored = loadCatalog();
    return stored.length ? stored : [];
  });
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [importing, setImporting] = useState(false);
  const [showToast, Toast] = useToast();
  const fileRef = useRef();

  const save = (next) => { setProducts(next); saveCatalog(next); };

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const imported = await parseCatalogExcel(file);
      const next = [...products, ...imported];
      save(next);
      showToast(`${imported.length} produits importés`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setImporting(false); }
  };

  const loadDemo = () => { save(DEMO_PRODUCTS); showToast('Base de démonstration chargée', 'success'); };

  const startEdit = (p) => { setEditId(p.id); setEditData({ ...p }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const commitEdit = () => {
    save(products.map(p => p.id === editId ? { ...p, ...editData } : p));
    setEditId(null);
    showToast('Produit mis à jour', 'success');
  };

  const deleteProduct = (id) => {
    save(products.filter(p => p.id !== id));
    showToast('Produit supprimé', 'success');
  };

  const addRow = () => {
    const newP = { id: `new-${Date.now()}`, ref: '', description: '', unite: 'u', prixAchat: 0, fournisseur: '', famille: '' };
    const next = [newP, ...products];
    save(next);
    startEdit(newP);
  };

  const exportCatalog = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Référence', 'Désignation', 'Unité', 'Prix achat HT', 'Fournisseur', 'Famille'],
      ...products.map(p => [p.ref, p.description, p.unite, p.prixAchat, p.fournisseur, p.famille]),
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
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
              <button className="btn" onClick={() => fileRef.current.click()} disabled={importing}>
                {importing ? '⏳' : Icons.upload} {importing ? 'Import…' : 'Importer Excel'}
              </button>
              <button className="btn brand" onClick={addRow}>{Icons.plus} Ajouter</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
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
          <span className="tiny muted">{displayed.length} produit{displayed.length > 1 ? 's' : ''}</span>
        </div>

        {/* Empty state */}
        {products.length === 0 && (
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
        {products.length > 0 && (
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
            <strong>Format Excel attendu :</strong> colonnes <em>Référence</em>, <em>Désignation</em>, <em>Unité</em>, <em>Prix achat HT</em>, <em>Fournisseur</em>, <em>Famille</em> — les en-têtes sont détectées automatiquement.
          </div>
        )}
      </div>
      {Toast}
    </div>
  );
}
