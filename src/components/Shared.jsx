import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from './Icons';

export function StatusPill({ status }) {
  const map = {
    new: { cls: "new", label: "Nouveau" },
    progress: { cls: "progress", label: "En cours" },
    scheduled: { cls: "scheduled", label: "Planifié" },
    urgent: { cls: "urgent", label: "Urgent" },
    quoted: { cls: "ai", label: "Devis prêt" },
    done: { cls: "done", label: "Terminé" },
  };
  const m = map[status] || map.new;
  return <span className={"pill " + m.cls}><span className="dot"/>{m.label}</span>;
}

export function Sidebar({ counts = {} }) {
  const item = (to, id, label, ic, count) => (
    <NavLink to={to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
      {ic}
      <span>{label}</span>
      {count != null && <span className="count tnum">{count}</span>}
    </NavLink>
  );
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">D</div>
        <div className="brand-name">DPM Plomberie<small>Gestion IA</small></div>
      </div>

      <div className="nav-label">Travail</div>
      {item("/inbox", "inbox", "Boîte de réception", Icons.inbox, counts.inbox ?? 24)}
      {item("/quotes", "quotes", "Devis", Icons.quote, counts.quotes ?? 7)}
      {item("/schedule", "schedule", "Planning", Icons.calendar, counts.calendar ?? 12)}
      {item("/clients", "clients", "Clients", Icons.users)}
      {item("/tender", "tender", "Appels d'offres", Icons.building)}
      {item("/catalog", "catalog", "Base produits", Icons.package)}
      {item("/crm", "crm", "Prospection", Icons.trending)}

      <div className="nav-label">Modules IA</div>
      {item("/quotes", "quotes-pro", "Devis pro", Icons.sparkle, counts.quotes ?? 7)}

      <div className="nav-label">Aperçu</div>
      {item("/dashboard", "dashboard", "Tableau de bord", Icons.chart)}
      {item("/exec", "exec", "Vue exécutive", Icons.bolt)}
      {item("/mobile", "mobile", "Terrain", Icons.map)}

      <div className="sidebar-footer">
        <div className="avatar">DM</div>
        <div className="who">David Marchand<br/><small>Gérant</small></div>
      </div>
    </aside>
  );
}

export function Topbar({ title, crumbs, right }) {
  return (
    <div className="topbar">
      {crumbs ? (
        <div className="crumb" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <span style={{ color: "var(--ink-5)" }}>/</span>}
              <span style={{ color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-4)", fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</span>
            </span>
          ))}
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      <div className="search">
        {Icons.search}
        <span>Rechercher…</span>
        <span className="kbd">⌘K</span>
      </div>
      {right}
    </div>
  );
}

export function MetricCard({ label, value, sub, accent, ic }) {
  return (
    <div className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-4)" }}>
        <span style={{ color: accent || "var(--ink-4)" }}>{ic}</span>
        <span className="label" style={{ padding: 0 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }} className="tnum">{value}</div>
      <div className="tiny muted">{sub}</div>
    </div>
  );
}

export function AiIcon({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "linear-gradient(135deg, #6f4ce0, #2b6bff)",
      display: "grid", placeItems: "center", color: "#fff",
      boxShadow: "0 6px 16px -6px rgba(111,76,224,0.5)",
      flex: "none",
    }}>
      {Icons.sparkle}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const ToastEl = toast ? (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: toast.type === 'success' ? 'var(--green-700)' : toast.type === 'info' ? 'var(--brand-700)' : 'var(--ink)',
      color: '#fff', padding: '12px 20px', borderRadius: 12,
      fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-lg)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'toastIn 0.25s ease',
    }}>
      <span style={{ fontSize: 15 }}>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
      {toast.msg}
    </div>
  ) : null;
  return [show, ToastEl];
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(11,18,32,0.45)',
      display: 'grid', placeItems: 'center', padding: 24,
    }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
           onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          <button className="btn sm ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
