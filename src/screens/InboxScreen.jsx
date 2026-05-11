import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, StatusPill, useToast, Modal } from '../components/Shared';
import { Icons } from '../components/Icons';
import { SAMPLE_REQUESTS } from '../data/sampleData';

function MetricCard({ label, value, sub, accent, ic }) {
  return (
    <div className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-4)" }}>
        <span style={{ color: accent || "var(--ink-4)" }}>{ic}</span>
        <span className="label" style={{ padding: 0 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }} className="tnum">{value}</div>
      <div className="tiny muted">{sub}</div>
    </div>
  );
}

function RequestCard({ req, selected, onClick, onOpen, onQuote }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "1px solid " + (selected ? "var(--brand-300)" : "var(--line)"),
      boxShadow: selected ? "0 0 0 3px rgba(43,107,255,0.12)" : "var(--shadow-sm)",
      borderRadius: "var(--r-lg)", padding: "16px 18px", cursor: "pointer",
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "start",
      transition: "border-color 120ms, box-shadow 120ms",
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: req.color, color: req.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13, flex: "none" }}>{req.initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" }}>{req.client}</span>
          <span className="mono tiny muted">{req.id}</span>
          <StatusPill status={req.status} />
          {req.urgent && <span className="pill urgent"><span className="dot" />Urgent</span>}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 10, lineHeight: 1.45 }}>{req.summary}</div>
        <div className="ai-stripe" style={{ borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12.5 }}>
          <span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>
          <span style={{ color: "var(--ink-2)" }}><span style={{ fontWeight: 600 }}>IA :</span> {req.aiIssue}</span>
          <span className="mono tiny" style={{ color: "var(--violet-700)", marginLeft: "auto", fontWeight: 500 }}>{req.aiConfidence}% · {req.estimate}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", color: "var(--ink-4)", fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.pin}<span>{req.address}</span></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{req.channel === "Téléphone" ? Icons.phone : req.channel === "E-mail" ? Icons.mail : Icons.send}<span>{req.channel}</span></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.clock}<span>{req.received}</span></span>
          {req.scheduled && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--green-700)", fontWeight: 500 }}>{Icons.calendar}<span>{req.scheduled}</span></span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {req.quoteReady ? (
          <span className="pill ai" style={{ fontSize: 11 }}>
            <span style={{ color: "var(--violet-500)", display: "inline-flex" }}>{Icons.bolt}</span>
            Devis prêt en 30 s
          </span>
        ) : (
          <span className="pill muted" style={{ fontSize: 11 }}><span className="dot" />Analyse IA…</span>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); onOpen?.(); }}>Ouvrir</button>
          {req.quoteReady && (
            <button className="btn sm primary" onClick={(e) => { e.stopPropagation(); onQuote?.(); }}>
              {Icons.bolt} Devis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxScreen() {
  const nav = useNavigate();
  const [selectedId, setSelectedId] = useState("REQ-2841");
  const [filter, setFilter] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newReq, setNewReq] = useState({ client: '', phone: '', channel: 'WhatsApp', summary: '' });
  const [showToast, Toast] = useToast();

  const filtered = (filter === "all" ? SAMPLE_REQUESTS : SAMPLE_REQUESTS.filter(r => r.status === filter))
    .slice()
    .sort((a, b) => sortDesc ? 0 : -1);

  const handleCreate = () => {
    if (!newReq.client.trim()) return;
    setShowModal(false);
    setNewReq({ client: '', phone: '', channel: 'WhatsApp', summary: '' });
    showToast(`Demande créée pour ${newReq.client}`, 'success');
  };

  const field = (label, key, placeholder, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 5 }}>{label}</div>
      <input
        type={type}
        value={newReq[key]}
        onChange={e => setNewReq(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }}
      />
    </div>
  );

  return (
    <div className="app">
      <Sidebar counts={{ inbox: 24, quotes: 7, calendar: 12 }} />
      <div className="main">
        <Topbar
          title="Boîte de réception"
          right={
            <>
              <button className="btn" onClick={() => showToast('Filtres avancés disponibles bientôt', 'info')}>
                <span style={{ color: "var(--ink-4)" }}>{Icons.filter}</span> Filtres
              </button>
              <button className="btn brand" onClick={() => setShowModal(true)}>{Icons.plus} Nouvelle demande</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
            <MetricCard label="Nouvelles demandes" value="24" sub="+8 depuis hier · 0 perdues" accent="var(--brand-500)" ic={Icons.inbox} />
            <MetricCard label="Temps moyen IA" value="12 s" sub="Détection problème + devis" accent="var(--violet-500)" ic={Icons.sparkle} />
            <MetricCard label="Devis en attente" value="7" sub="6 prêts à envoyer" accent="var(--amber-500)" ic={Icons.quote} />
            <MetricCard label="Heures économisées" value="14,3 h" sub="Cette semaine" accent="var(--green-500)" ic={Icons.clock} />
          </div>

          <div className="ai-stripe" style={{ borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 6px 16px -6px rgba(111,76,224,0.6)" }}>{Icons.sparkle}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" }}>
                L'assistant IA a traité <span className="ai-grad">17 demandes</span> ce matin sans intervention
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>Diagnostic, estimation et devis pré-remplis. Vous validez d'un clic.</div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--violet-700)" }}>96 %</div>
                <div className="tiny muted">précision moyenne</div>
              </div>
              <button className="btn" onClick={() => nav('/dashboard')}>Voir le journal IA</button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
            {[
              { id: "all", label: "Toutes", n: SAMPLE_REQUESTS.length },
              { id: "new", label: "Nouvelles", n: SAMPLE_REQUESTS.filter(r => r.status === "new").length },
              { id: "progress", label: "En cours", n: SAMPLE_REQUESTS.filter(r => r.status === "progress").length },
              { id: "scheduled", label: "Planifiées", n: SAMPLE_REQUESTS.filter(r => r.status === "scheduled").length },
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} className="btn ghost" style={{ borderRadius: 0, borderBottom: filter === t.id ? "2px solid var(--ink)" : "2px solid transparent", marginBottom: -1, fontWeight: filter === t.id ? 600 : 500, color: filter === t.id ? "var(--ink)" : "var(--ink-4)", paddingBottom: 10 }}>
                {t.label} <span className="tnum tiny muted" style={{ marginLeft: 4 }}>{t.n}</span>
              </button>
            ))}
            <div style={{ marginLeft: "auto" }}>
              <button className="btn sm ghost" onClick={() => setSortDesc(s => !s)}>
                Trier : {sortDesc ? 'Récents' : 'Anciens'} {Icons.chevronDown}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                selected={selectedId === req.id}
                onClick={() => setSelectedId(req.id)}
                onOpen={() => nav('/requests/' + req.id)}
                onQuote={() => nav('/quotes/new?req=' + req.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle demande"
        footer={
          <>
            <button className="btn" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn brand" onClick={handleCreate}>{Icons.plus} Créer la demande</button>
          </>
        }
      >
        {field('Nom du client', 'client', 'Mme. Martin…')}
        {field('Téléphone', 'phone', '+33 6 12 34 56 78', 'tel')}
        <div style={{ marginBottom: 14 }}>
          <div className="tiny muted" style={{ marginBottom: 5 }}>Canal</div>
          <select
            value={newReq.channel}
            onChange={e => setNewReq(p => ({ ...p, channel: e.target.value }))}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
          >
            {['WhatsApp', 'Téléphone', 'E-mail', 'Site web'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="tiny muted" style={{ marginBottom: 5 }}>Description du problème</div>
          <textarea
            value={newReq.summary}
            onChange={e => setNewReq(p => ({ ...p, summary: e.target.value }))}
            placeholder="Fuite sous l'évier depuis ce matin…"
            rows={3}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      </Modal>

      {Toast}
    </div>
  );
}
