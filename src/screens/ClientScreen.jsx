import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, StatusPill, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';

const CLIENT_INIT = {
  name: "Mme. Lefèvre", initials: "ML", color: "#fde7d2", fg: "#7a3a10",
  type: "Particulier", address: "12 rue de la Paix, 75002 Paris",
  phone: "+33 6 12 34 56 78", email: "lefevre@example.fr",
  since: "Mars 2023", revenue: "1 248 €", interventions: 4, quotes: 5, quotesAccepted: 4,
};

const TIMELINE = [
  { type: "new", color: "var(--brand-500)", t: "Nouvelle demande WhatsApp", s: "Fuite sous évier cuisine", date: "27 avr. 2026 · 09:14" },
  { type: "ai", color: "var(--violet-500)", t: "L'IA a généré un devis", s: "DEV-2025-0418 · 196,80 € · 12 s", date: "27 avr. 2026 · 09:14" },
  { type: "check", color: "var(--green-500)", t: "Intervention terminée", s: "Chaudière entretien annuel · 145 €", date: "12 sept. 2025" },
  { type: "calendar", color: "var(--green-500)", t: "Rendez-vous confirmé", s: "Entretien chaudière · 12 sept.", date: "04 sept. 2025" },
  { type: "send", color: "var(--brand-500)", t: "Devis envoyé · accepté en 14 min", s: "DEV-2025-0312 · 145 €", date: "03 sept. 2025" },
  { type: "check", color: "var(--green-500)", t: "Intervention terminée", s: "Remplacement robinet salle de bain · 312 €", date: "21 fév. 2025" },
  { type: "check", color: "var(--green-500)", t: "Intervention terminée", s: "Débouchage canalisation · 196 €", date: "08 nov. 2024" },
  { type: "new", color: "var(--ink-4)", t: "Premier contact", s: "Recommandation · M. Bernard", date: "15 mars 2023" },
];

const INTERVENTIONS = [
  { date: "12/09/25", title: "Entretien chaudière annuel", dur: "45 min", amount: "145 €", st: "done" },
  { date: "21/02/25", title: "Remplacement robinet SDB", dur: "1 h 10", amount: "312 €", st: "done" },
  { date: "08/11/24", title: "Débouchage canalisation", dur: "30 min", amount: "196 €", st: "done" },
  { date: "15/03/23", title: "Diagnostic première visite", dur: "30 min", amount: "95 €", st: "done" },
];

const QUOTES = [
  { id: "DEV-2025-0418", title: "Réparation fuite siphon", amount: "196,80 €", st: "new", date: "27/04/26" },
  { id: "DEV-2025-0312", title: "Entretien chaudière", amount: "145,00 €", st: "done", date: "03/09/25" },
  { id: "DEV-2025-0211", title: "Remplacement robinet", amount: "312,40 €", st: "done", date: "18/02/25" },
  { id: "DEV-2024-1108", title: "Débouchage urgence", amount: "196,00 €", st: "done", date: "08/11/24" },
];

export default function ClientScreen() {
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [client, setClient] = useState(CLIENT_INIT);
  const [draft, setDraft] = useState(CLIENT_INIT);
  const [showToast, Toast] = useToast();

  const saveEdit = () => {
    setClient(draft);
    setEditing(false);
    showToast('Fiche client mise à jour', 'success');
  };

  const cancelEdit = () => {
    setDraft(client);
    setEditing(false);
  };

  const c = editing ? draft : client;

  const editField = (field, label) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      <div className="tiny muted">{label}</div>
      <input
        value={draft[field]}
        onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
        style={{ padding: '6px 10px', border: '1px solid var(--brand-300)', borderRadius: 7, fontSize: 13, outline: 'none' }}
      />
    </div>
  );

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Clients", client.name]}
          right={
            <>
              <button className="btn" onClick={() => nav('/clients')}>{Icons.back} Retour</button>
              {editing ? (
                <>
                  <button className="btn" onClick={cancelEdit}>Annuler</button>
                  <button className="btn brand" onClick={saveEdit}>{Icons.check} Sauvegarder</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => { setDraft(client); setEditing(true); }}>{Icons.edit} Éditer</button>
                  <button className="btn primary" onClick={() => nav('/inbox')}>{Icons.plus} Nouvelle demande</button>
                </>
              )}
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px" }}>
          <div className="card" style={{ padding: 22, marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: c.color, color: c.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 22, flex: "none" }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                    {editField('name', 'Nom')}
                    {editField('phone', 'Téléphone')}
                    {editField('email', 'Email')}
                    {editField('address', 'Adresse')}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.015em", fontWeight: 600 }}>{c.name}</h2>
                      <span className="pill muted">{c.type}</span>
                      <span className="pill scheduled"><span className="dot" />Cliente fidèle</span>
                      <span style={{ color: "var(--green-700)", fontWeight: 600, fontSize: 13 }}>★★★★★</span>
                    </div>
                    <div style={{ display: "flex", gap: 18, marginTop: 8, color: "var(--ink-3)", fontSize: 13, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.pin}{c.address}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.phone}{c.phone}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.mail}{c.email}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.clock}Cliente depuis {c.since}</span>
                    </div>
                  </>
                )}
              </div>
              {!editing && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => nav('/quotes/new')}>{Icons.quote} Devis</button>
                  <button className="btn" onClick={() => nav('/schedule')}>{Icons.calendar} RDV</button>
                </div>
              )}
            </div>
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
              {[
                { l: "Total facturé", v: c.revenue, s: "Sur 3 ans", c: "var(--ink)" },
                { l: "Interventions", v: c.interventions, s: "Aucun litige", c: "var(--brand-700)" },
                { l: "Devis acceptés", v: `${c.quotesAccepted}/${c.quotes}`, s: "80 % acceptation", c: "var(--green-700)" },
                { l: "Délai paiement moyen", v: "2 j", s: "Excellent", c: "var(--violet-700)" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="label" style={{ marginBottom: 4 }}>{s.l}</div>
                  <div className="tnum" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: s.c }}>{s.v}</div>
                  <div className="tiny muted">{s.s}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Historique des interactions</h3>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
                {TIMELINE.map((it, i) => {
                  const ic = it.type === "ai" ? Icons.sparkle : it.type === "check" ? Icons.check : it.type === "calendar" ? Icons.calendar : it.type === "send" ? Icons.send : Icons.inbox;
                  return (
                    <div key={i} style={{ position: "relative", paddingLeft: 42, paddingBottom: i < TIMELINE.length - 1 ? 16 : 0 }}>
                      <span style={{ position: "absolute", left: 0, top: 0, width: 30, height: 30, borderRadius: 8, background: it.color + "1a", color: it.color, display: "grid", placeItems: "center", border: "3px solid #fff" }}>{ic}</span>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{it.t}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>{it.s}</div>
                      <div className="tiny" style={{ marginTop: 4, color: "var(--ink-5)", fontFamily: "var(--font-mono)" }}>{it.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Interventions</h3>
                  <button className="btn sm ghost" onClick={() => showToast('Historique complet affiché', 'info')}>Voir tout {Icons.chevron}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 90px 80px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontWeight: 600 }}>
                  <div>Date</div><div>Intervention</div><div>Durée</div><div style={{ textAlign: "right" }}>Montant</div><div></div>
                </div>
                {INTERVENTIONS.map((iv, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 90px 80px", gap: 12, padding: "12px 0", borderBottom: i < INTERVENTIONS.length - 1 ? "1px solid var(--line-soft)" : "none", alignItems: "center", fontSize: 13 }}>
                    <div className="mono tiny muted">{iv.date}</div>
                    <div style={{ fontWeight: 500 }}>{iv.title}</div>
                    <div className="tiny muted">{iv.dur}</div>
                    <div className="tnum" style={{ textAlign: "right", fontWeight: 500 }}>{iv.amount}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}><StatusPill status={iv.st} /></div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Devis</h3>
                  <button className="btn sm ghost" onClick={() => showToast('Historique complet affiché', 'info')}>Voir tout {Icons.chevron}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 100px 80px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontWeight: 600 }}>
                  <div>Référence</div><div>Objet</div><div>Date</div><div style={{ textAlign: "right" }}>Montant</div><div></div>
                </div>
                {QUOTES.map((q, i) => (
                  <div key={i} onClick={() => nav('/quotes')} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 100px 80px", gap: 12, padding: "12px 0", borderBottom: i < QUOTES.length - 1 ? "1px solid var(--line-soft)" : "none", alignItems: "center", fontSize: 13, cursor: 'pointer' }}>
                    <div className="mono tiny" style={{ color: "var(--ink-3)" }}>{q.id}</div>
                    <div style={{ fontWeight: 500 }}>{q.title}</div>
                    <div className="mono tiny muted">{q.date}</div>
                    <div className="tnum" style={{ textAlign: "right", fontWeight: 600 }}>{q.amount}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}><StatusPill status={q.st} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
