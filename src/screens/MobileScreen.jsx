import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { useToast } from '../components/Shared';

const JOBS_INIT = [
  {
    id: 1, time: "09:00", end: "11:00", client: "Mme. Lefèvre", initials: "ML",
    color: "#fde7d2", fg: "#7a3a10", title: "Fuite siphon évier cuisine",
    address: "12 rue de la Paix, 75002 Paris", duration: "45 min",
    st: "next", eta: "12 min", amount: "196,80 €", phone: "+33612345678",
  },
  {
    id: 2, time: "11:30", end: "12:30", client: "M. Pernot", initials: "PP",
    color: "#dbe7ff", fg: "#1444c2", title: "Robinetterie SDB",
    address: "45 rue de Cléry, 75002 Paris", duration: "1 h",
    st: "upcoming", amount: "148,00 €", phone: "+33687654321",
  },
  {
    id: 3, time: "14:00", end: "16:00", client: "Mme. Diop", initials: "FD",
    color: "#ffeef0", fg: "#a91d2e", title: "Débouchage WC",
    address: "5 rue de Belleville, 75019 Paris", duration: "1 h 30",
    st: "upcoming", amount: "212,00 €", phone: "+33699887766",
  },
];

export default function MobileScreen() {
  const nav = useNavigate();
  const [tab, setTab] = useState("today");
  const [jobs, setJobs] = useState(JOBS_INIT);
  const [note, setNote] = useState('');
  const [noteJobId, setNoteJobId] = useState(null);
  const [showToast, Toast] = useToast();

  const markDone = (id) => {
    setJobs(js => js.map(j => j.id === id ? { ...j, st: 'done' } : j));
    showToast('Intervention marquée terminée', 'success');
  };

  const startJob = (id) => {
    setJobs(js => js.map(j => j.id === id ? { ...j, st: 'active' } : j));
    showToast('Intervention démarrée — chrono en cours', 'info');
  };

  const openGPS = (address) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const callClient = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const saveNote = (id) => {
    showToast('Note de visite enregistrée', 'success');
    setNoteJobId(null);
    setNote('');
  };

  const displayJobs = tab === 'done'
    ? jobs.filter(j => j.st === 'done')
    : tab === 'week'
    ? jobs
    : jobs.filter(j => j.st !== 'done');

  return (
    <div style={{ width: "100%", height: "100vh", background: "#f1f3f6", display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)", color: "var(--ink)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px 14px", background: "#fff", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-mark" style={{ width: 30, height: 30, fontSize: 13 }}>D</div>
            <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" }}>DPM Plomberie</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#dbe7ff,#8aaeff)", color: "#0d2b7a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>JM</div>
        </div>
        <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.015em", fontWeight: 600 }}>Bonjour Julien</h2>
        <div className="tiny muted" style={{ marginTop: 3 }}>Lundi 27 avril · {jobs.filter(j => j.st !== 'done').length} interventions aujourd'hui</div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div className="ai-stripe" style={{ borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", color: "#fff", display: "grid", placeItems: "center" }}>{Icons.sparkle}</span>
          <div style={{ flex: 1, fontSize: 12.5 }}>
            <div style={{ fontWeight: 600, color: "var(--ink-2)" }}>Tournée optimisée par l'IA</div>
            <div className="tiny muted">3 RDV · 18 km · 4 h 15 estimées</div>
          </div>
          <div className="tnum" style={{ fontWeight: 600, color: "var(--violet-700)" }}>556,80 €</div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 8px", display: "flex", gap: 6 }}>
        {[{ id: "today", l: "Aujourd'hui", n: jobs.filter(j => j.st !== 'done').length }, { id: "week", l: "Semaine", n: 12 }, { id: "done", l: "Terminés", n: jobs.filter(j => j.st === 'done').length }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 6px", fontSize: 12.5, fontWeight: tab === t.id ? 600 : 500, borderRadius: 8, border: "none", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "var(--ink)" : "var(--ink-4)", boxShadow: tab === t.id ? "var(--shadow-sm)" : "none", cursor: "pointer" }}>
            {t.l} <span className="tnum tiny" style={{ opacity: 0.7, marginLeft: 2 }}>{t.n}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {displayJobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-4)', fontSize: 13 }}>
            {tab === 'done' ? 'Aucune intervention terminée pour l\'instant' : 'Toutes les interventions sont terminées 🎉'}
          </div>
        )}

        {displayJobs.map((j) => (
          <div key={j.id} className="card" style={{ padding: 14, border: j.st === "next" || j.st === "active" ? "1px solid var(--brand-300)" : j.st === "done" ? "1px solid var(--line)" : "1px solid var(--line)", boxShadow: j.st === "next" || j.st === "active" ? "0 0 0 3px rgba(43,107,255,0.12)" : "var(--shadow-sm)", opacity: j.st === "done" ? 0.7 : 1 }}>
            {(j.st === "next" || j.st === "active") && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: j.st === "active" ? "var(--green-50)" : "var(--brand-50)", color: j.st === "active" ? "var(--green-700)" : "var(--brand-700)", padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: j.st === "active" ? "var(--green-500)" : "var(--brand-500)" }} />
                {j.st === "active" ? "En cours" : `Prochain · ETA ${j.eta}`}
              </div>
            )}
            {j.st === "done" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", color: "var(--ink-4)", padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, marginBottom: 10 }}>
                ✓ Terminé
              </div>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: "none", textAlign: "center", paddingRight: 12, borderRight: "1px solid var(--line)" }}>
                <div className="tnum" style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{j.time}</div>
                <div className="tiny muted">{j.end}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: j.color, color: j.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 10 }}>{j.initials}</div>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{j.client}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>{j.title}</div>
                <div className="tiny" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ink-4)" }}>{Icons.pin}<span>{j.address}</span></div>
                <div className="tiny" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ink-4)", marginTop: 3 }}>
                  {Icons.clock}<span>{j.duration}</span>
                  <span style={{ margin: "0 4px" }}>·</span>
                  <span className="tnum" style={{ fontWeight: 600, color: "var(--ink-2)" }}>{j.amount}</span>
                </div>
              </div>
            </div>

            {noteJobId === j.id && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Note de visite…"
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--brand-300)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
                <button className="btn sm primary" onClick={() => saveNote(j.id)}>Sauver</button>
                <button className="btn sm ghost" onClick={() => setNoteJobId(null)}>×</button>
              </div>
            )}

            {(j.st === "next" || j.st === "active") && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
                <button className="btn sm" style={{ justifyContent: "center" }} onClick={() => callClient(j.phone)}>{Icons.phone}</button>
                <button className="btn sm" style={{ justifyContent: "center" }} onClick={() => openGPS(j.address)}>{Icons.pin} GPS</button>
                {j.st === "active"
                  ? <button className="btn sm primary" style={{ justifyContent: "center", background: "var(--green-500)", borderColor: "var(--green-700)" }} onClick={() => markDone(j.id)}>✓ Terminer</button>
                  : <button className="btn sm primary" style={{ justifyContent: "center" }} onClick={() => startJob(j.id)}>Démarrer</button>
                }
              </div>
            )}
          </div>
        ))}

        <div className="card" style={{ padding: 14, marginTop: 4 }}>
          <div className="label" style={{ marginBottom: 10 }}>Actions rapides</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { ic: Icons.check, t: "Marquer terminé", c: "var(--green-500)", fn: () => { const next = jobs.find(j => j.st === 'next' || j.st === 'active'); if (next) markDone(next.id); else showToast('Aucune intervention active', 'info'); } },
              { ic: Icons.attach, t: "Ajouter photo", c: "var(--brand-500)", fn: () => showToast('Appareil photo ouvert', 'info') },
              { ic: Icons.edit, t: "Note de visite", c: "var(--ink)", fn: () => { const next = jobs.find(j => j.st === 'next' || j.st === 'active'); setNoteJobId(next?.id ?? jobs[0]?.id ?? null); } },
              { ic: Icons.bolt, t: "Devis sur place", c: "var(--violet-500)", fn: () => nav('/quotes') },
            ].map((a, i) => (
              <button key={i} className="btn" style={{ padding: "12px 10px", flexDirection: "column", alignItems: "flex-start", gap: 6, height: "auto" }} onClick={a.fn}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: a.c + "14", color: a.c, display: "grid", placeItems: "center" }}>{a.ic}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{a.t}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", borderTop: "1px solid var(--line)", background: "#fff", padding: "8px 8px 14px" }}>
        {[
          { ic: Icons.calendar, l: "Tournée", id: "today" },
          { ic: Icons.users, l: "Clients", id: "clients" },
          { ic: Icons.bolt, l: "Devis", id: "quotes" },
          { ic: Icons.bell, l: "Alertes", id: "alerts" },
        ].map((t, i) => (
          <button key={i} onClick={() => { if (t.id === 'clients') nav('/clients'); else if (t.id === 'quotes') nav('/quotes'); else setTab(t.id === 'today' ? 'today' : tab); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", color: (tab === "today" && t.id === "today") ? "var(--brand-600)" : "var(--ink-4)", fontSize: 10.5, fontWeight: (tab === "today" && t.id === "today") ? 600 : 500, background: "none", border: "none", cursor: "pointer" }}>
            {t.ic}
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {Toast}
    </div>
  );
}
