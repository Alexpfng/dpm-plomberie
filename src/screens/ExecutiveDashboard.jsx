import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/Shared';
import { Icons } from '../components/Icons';
import {
  loadTenderHistory,
  setCurrentTender,
  deleteTenderFromHistory,
  updateTenderStatus,
  TENDER_STATUSES,
  getStatusMeta,
} from '../data/tenderStore';

const fmtEur = (n) =>
  (parseFloat(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ statusId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = getStatusMeta(statusId);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: meta.bg, color: meta.color, border: 'none',
          padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color }} />
        {meta.label}
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            background: '#fff', border: '1px solid var(--line)', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', padding: 4, minWidth: 200,
          }}
        >
          {TENDER_STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', border: 'none', background: s.id === statusId ? 'var(--bg-soft)' : 'transparent',
                borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)',
                textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { if (s.id !== statusId) e.currentTarget.style.background = 'var(--bg-soft)'; }}
              onMouseLeave={(e) => { if (s.id !== statusId) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusColumn({ status, tenders, onOpen, onChangeStatus, onDelete }) {
  const total = tenders.reduce((s, t) => s + (t.totalHT || 0), 0);

  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 320, background: '#fff' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: status.color }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{status.label}</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            {tenders.length} dossier{tenders.length > 1 ? 's' : ''} · {fmtEur(total)}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tenders.length === 0 && (
          <div className="tiny muted" style={{ textAlign: 'center', padding: '32px 12px' }}>
            Aucun dossier
          </div>
        )}
        {tenders.map((t) => (
          <div
            key={t.id}
            onClick={() => onOpen(t.id)}
            style={{
              border: '1px solid var(--line-soft)', borderRadius: 10, padding: '12px 13px',
              background: '#fff', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-300)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-soft)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {t.projectName}
                </div>
                {t.dpgfFileName && (
                  <div className="tiny muted" style={{ marginTop: 3 }}>{t.dpgfFileName}</div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`Supprimer "${t.projectName}" ?`)) onDelete(t.id); }}
                className="btn ghost"
                style={{ padding: '2px 6px', fontSize: 13, color: 'var(--ink-4)' }}
                title="Supprimer"
              >×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                <span>{t.lineCount} lignes</span>
                <span className="tnum" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{fmtEur(t.totalHT)}</span>
              </div>
              <span className="tiny muted">{fmtDate(t.savedAt)}</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <StatusBadge statusId={t.status || 'in_progress'} onChange={(s) => onChangeStatus(t.id, s)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const nav = useNavigate();
  const [tenders, setTenders] = useState([]);

  useEffect(() => { setTenders(loadTenderHistory()); }, []);

  const grouped = useMemo(() => {
    const map = new Map(TENDER_STATUSES.map((s) => [s.id, []]));
    tenders.forEach((t) => {
      const key = TENDER_STATUSES.some((s) => s.id === t.status) ? t.status : 'in_progress';
      map.get(key).push(t);
    });
    return map;
  }, [tenders]);

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((s, t) => s + (t.totalHT || 0), 0);
    return {
      in_progress: sum(grouped.get('in_progress')),
      pending: sum(grouped.get('pending')),
      won: sum(grouped.get('won')),
      lost: sum(grouped.get('lost')),
      total: tenders.length,
    };
  }, [grouped, tenders]);

  const handleOpen = (id) => {
    setCurrentTender(id);
    nav('/tender/match');
  };

  const handleChangeStatus = (id, status) => {
    updateTenderStatus(id, status);
    setTenders(loadTenderHistory());
  };

  const handleDelete = (id) => {
    deleteTenderFromHistory(id);
    setTenders(loadTenderHistory());
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          title="Appels d'offres"
          right={
            <button className="btn brand" onClick={() => nav('/tender')}>
              {Icons.plus} Nouveau dossier
            </button>
          }
        />
        <div className="page-content" style={{ padding: '24px 28px' }}>
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Vue exécutive
            </h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {totals.total} dossier{totals.total > 1 ? 's' : ''} suivi{totals.total > 1 ? 's' : ''} · CA validé {fmtEur(totals.won)} · en attente {fmtEur(totals.pending)}
            </div>
          </div>

          {tenders.length === 0 ? (
            <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>{Icons.building}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
                Aucun appel d'offres pour l'instant
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
                Importez un DPGF pour démarrer le suivi.
              </div>
              <button className="btn brand" onClick={() => nav('/tender')}>
                {Icons.plus} Importer un appel d'offres
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {TENDER_STATUSES.map((status) => (
                <StatusColumn
                  key={status.id}
                  status={status}
                  tenders={grouped.get(status.id) || []}
                  onOpen={handleOpen}
                  onChangeStatus={handleChangeStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
