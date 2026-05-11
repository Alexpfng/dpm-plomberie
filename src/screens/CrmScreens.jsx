import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast, Modal } from '../components/Shared';
import { Icons } from '../components/Icons';

const PROSPECTS_INIT = [
  { id: "P-1", name: "M. Lambert", phone: "06 12 34 56 78", proj: "Rénovation SDB complète", note: "Visite sur place planifiée", value: "4 200 €", color: "#fde7d2", fg: "#7a3a10", initials: "LB", col: "booked", since: "2 j" },
  { id: "P-2", name: "Boulangerie Lefort", phone: "01 42 87 91 23", proj: "Installation chauffe-eau pro", note: "À recontacter mardi matin", value: "1 850 €", color: "#dbe7ff", fg: "#1444c2", initials: "BL", col: "followup", since: "5 j", hot: true },
  { id: "P-3", name: "Mme. Garcia", phone: "06 78 11 22 45", proj: "Fuite chauffe-eau", note: "WhatsApp ce matin", value: "320 €", color: "#eafbf2", fg: "#0a7d44", initials: "GA", col: "contact", since: "3 h" },
  { id: "P-4", name: "Cabinet Roussel", phone: "01 56 78 12 34", proj: "Installation lavabo médical", note: "Devis envoyé · relance prévue", value: "840 €", color: "#f1eefd", fg: "#4a2db5", initials: "CR", col: "sent", since: "4 j" },
  { id: "P-5", name: "M. Bouchard", phone: "06 22 88 11 45", proj: "WC bouché récurrent", note: "Demande site web", value: "180 €", color: "#ffeef0", fg: "#a91d2e", initials: "BD", col: "contact", since: "1 j", hot: true },
  { id: "P-6", name: "SCI Bel Air", phone: "01 78 22 11 99", proj: "Réfection 4 SDB locatives", note: "RDV jeudi 14 h", value: "12 400 €", color: "#fde7d2", fg: "#7a3a10", initials: "BA", col: "booked", since: "1 sem" },
  { id: "P-7", name: "M. Yann Dupré", phone: "06 91 33 11 88", proj: "Audit installation", note: "Email lu, pas de réponse", value: "450 €", color: "#dbe7ff", fg: "#1444c2", initials: "YD", col: "contacted", since: "3 j" },
  { id: "P-8", name: "Mme. Petit", phone: "06 14 99 33 27", proj: "Robinetterie cuisine", note: "Acceptée · à programmer", value: "240 €", color: "#eafbf2", fg: "#0a7d44", initials: "PE", col: "won", since: "hier" },
  { id: "P-9", name: "M. Singh", phone: "06 33 22 11 55", proj: "Installation cumulus", note: "A choisi un concurrent", value: "680 €", color: "#fee", fg: "#888", initials: "SI", col: "lost", since: "2 sem" },
  { id: "P-10", name: "Crèche Les Lutins", phone: "01 33 44 55 66", proj: "Mise aux normes sanitaires", note: "Premier contact LinkedIn", value: "6 800 €", color: "#f1eefd", fg: "#4a2db5", initials: "LL", col: "contact", since: "6 h", hot: true },
];

const COLS = [
  { id: "contact", t: "À contacter", c: "var(--brand-500)" },
  { id: "contacted", t: "Contactés", c: "var(--ink-4)" },
  { id: "followup", t: "À relancer", c: "var(--amber-500)" },
  { id: "booked", t: "RDV pris", c: "var(--violet-500)" },
  { id: "sent", t: "Devis envoyé", c: "var(--brand-700)" },
  { id: "won", t: "Gagnés", c: "var(--green-500)" },
];

export function CrmPipelineScreen() {
  const nav = useNavigate();
  const [prospects, setProspects] = useState(PROSPECTS_INIT);
  const [showModal, setShowModal] = useState(false);
  const [newP, setNewP] = useState({ name: '', phone: '', proj: '', value: '' });
  const [showToast, Toast] = useToast();

  const addProspect = () => {
    if (!newP.name.trim()) return;
    const initials = newP.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = [["#fde7d2","#7a3a10"],["#dbe7ff","#1444c2"],["#eafbf2","#0a7d44"],["#f1eefd","#4a2db5"]];
    const [color, fg] = colors[prospects.length % colors.length];
    setProspects(ps => [...ps, { id: `P-${ps.length + 1}`, ...newP, initials, color, fg, col: 'contact', since: "à l'instant" }]);
    setShowModal(false);
    setNewP({ name: '', phone: '', proj: '', value: '' });
    showToast(`${newP.name} ajouté à la prospection`, 'success');
  };

  const field = (label, key, placeholder) => (
    <div style={{ marginBottom: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 5 }}>{label}</div>
      <input value={newP[key]} onChange={e => setNewP(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
    </div>
  );

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          title="Prospection"
          right={
            <>
              <button className="btn">Cette semaine {Icons.chevronDown}</button>
              <button className="btn" onClick={() => showToast('Import IA en cours — analyse des leads…', 'info')}>{Icons.bolt} Import IA</button>
              <button className="btn brand" onClick={() => setShowModal(true)}>{Icons.plus} Nouveau prospect</button>
            </>
          }
        />
        <div style={{ padding: "20px 24px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 14 }}>
            {[
              { l: "Prospects actifs", v: prospects.length, c: "var(--brand-500)" },
              { l: "Pipeline pondéré", v: "24 380 €", c: "var(--ink)" },
              { l: "À recontacter aujourd'hui", v: "7", c: "var(--amber-500)" },
              { l: "Taux de conversion", v: "34 %", c: "var(--green-700)" },
              { l: "Temps moyen 1er contact", v: "42 min", c: "var(--violet-500)" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: "12px 14px" }}>
                <div className="tiny" style={{ color: "var(--ink-4)", fontWeight: 500 }}>{s.l}</div>
                <div className="tnum" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", color: s.c, marginTop: 2 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "8px 24px 20px", flex: 1, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(220px,1fr))", gap: 12, alignItems: "flex-start", minWidth: 1300 }}>
            {COLS.map(col => {
              const cards = prospects.filter(p => p.col === col.id);
              return (
                <div key={col.id} style={{ background: "var(--bg-soft)", borderRadius: 12, padding: 10, minHeight: 420 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.c }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em" }}>{col.t}</span>
                      <span className="tnum tiny muted" style={{ fontWeight: 500 }}>{cards.length}</span>
                    </div>
                    <button className="btn sm ghost" style={{ padding: "2px 6px" }} onClick={() => { setNewP(p => ({ ...p })); setShowModal(true); }}>{Icons.plus}</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cards.map(p => (
                      <div key={p.id} onClick={() => nav('/crm/' + p.id)} className="card" style={{ padding: "12px 13px", cursor: "pointer", border: p.hot ? "1px solid #ffd1d6" : "1px solid var(--line)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: p.color, color: p.fg, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flex: "none" }}>{p.initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div className="tiny mono muted" style={{ marginTop: 1 }}>{p.phone}</div>
                          </div>
                          {p.hot && <span style={{ fontSize: 11 }}>🔥</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6, lineHeight: 1.4 }}>{p.proj}</div>
                        <div className="tiny" style={{ color: "var(--ink-4)", marginBottom: 10, lineHeight: 1.4, fontStyle: "italic" }}>« {p.note} »</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
                          <span className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>{p.value}</span>
                          <span className="tiny muted">{p.since}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau prospect"
        footer={
          <>
            <button className="btn" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn brand" onClick={addProspect}>{Icons.plus} Ajouter</button>
          </>
        }
      >
        {field('Nom', 'name', 'M. Dupont…')}
        {field('Téléphone', 'phone', '06 12 34 56 78')}
        {field('Projet', 'proj', 'Rénovation salle de bain…')}
        {field('Valeur estimée', 'value', '1 200 €')}
      </Modal>

      {Toast}
    </div>
  );
}

export function CrmDetailScreen() {
  const nav = useNavigate();
  const [showToast, Toast] = useToast();
  const [converted, setConverted] = useState(false);
  const p = PROSPECTS_INIT[0];

  const handleConvert = () => {
    setConverted(true);
    showToast(`${p.name} converti en client`, 'success');
    setTimeout(() => nav('/clients'), 1500);
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Prospection", p.name]}
          right={
            <>
              <button className="btn" onClick={() => nav('/crm')}>{Icons.back} Retour</button>
              <button className={`btn ${converted ? '' : 'brand'}`} onClick={handleConvert} disabled={converted}>
                {converted ? `${Icons.check} Converti` : `${Icons.bolt} Convertir en client`}
              </button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "380px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ width: 54, height: 54, borderRadius: 13, background: p.color, color: p.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 18 }}>{p.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.name}</h2>
                  <div className="tiny muted" style={{ marginTop: 2 }}>Étape : RDV pris</div>
                  <span className="pill scheduled" style={{ marginTop: 6, display: "inline-flex" }}><span className="dot" />Chaud · 4 200 €</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-3)" }}>{Icons.phone}<span className="mono">{p.phone}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-3)" }}>{Icons.mail}lambert.f@example.fr</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-3)" }}>{Icons.pin}45 av. de la République, 92100 Boulogne</div>
              </div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="label" style={{ marginBottom: 12 }}>Actions rapides</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { ic: Icons.phone, t: "Appeler", c: "var(--green-500)", fn: () => { window.location.href = `tel:${p.phone.replace(/\s/g, '')}`; } },
                  { ic: Icons.send, t: "SMS", c: "var(--brand-500)", fn: () => nav('/crm/contact') },
                  { ic: Icons.mail, t: "Email", c: "var(--violet-500)", fn: () => nav('/crm/contact') },
                  { ic: Icons.attach, t: "Note vocale", c: "var(--amber-500)", fn: () => showToast('Enregistrement vocal non disponible sur bureau', 'info') },
                ].map((a, i) => (
                  <button key={i} onClick={a.fn} className="btn" style={{ padding: "14px 12px", flexDirection: "column", alignItems: "flex-start", gap: 8, height: "auto" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: a.c + "14", color: a.c, display: "grid", placeItems: "center" }}>{a.ic}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.t}</span>
                  </button>
                ))}
              </div>
              <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "11px" }} onClick={() => nav('/schedule')}>
                {Icons.calendar} Planifier une relance
              </button>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="label" style={{ marginBottom: 10 }}>Projet</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{p.proj}</div>
              <div className="tiny muted" style={{ lineHeight: 1.6 }}>SDB 6 m² · douche italienne · double vasque · WC suspendu · délai souhaité 6 semaines</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                <div><div className="tiny muted">Valeur estimée</div><div className="tnum" style={{ fontSize: 18, fontWeight: 600 }}>4 200 €</div></div>
                <div><div className="tiny muted">Probabilité</div><div style={{ fontSize: 18, fontWeight: 600, color: "var(--green-700)" }}>72 %</div></div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Notes & contexte</h3>
              <div style={{ padding: "12px 14px", background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
                Couple souhaite une rénovation moderne, budget confirmé 4–5 k€. Mme. présente lors de la visite. Sensibles à la qualité plus qu'au prix. Recommandation de M. Pernot (client fidèle).
              </div>
              <div style={{ padding: "12px 14px", background: "var(--violet-50)", border: "1px solid #ddd5fb", borderRadius: 10, fontSize: 12.5, color: "var(--ink-2)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>
                <div><span style={{ fontWeight: 600 }}>Suggestion IA :</span> envoyer une étude personnalisée avec 2 options (essentiel / premium). Taux de conversion +28 % sur ce profil.</div>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Historique</h3>
              {[
                { t: "Visite sur place programmée", s: "Jeudi 30 avril · 14:00", d: "il y a 2 j", ic: Icons.calendar, c: "var(--violet-500)" },
                { t: "Appel sortant · 8 min", s: "Discussion budget et timing", d: "il y a 3 j", ic: Icons.phone, c: "var(--green-500)" },
                { t: "Email envoyé · catalogue produits", s: "Ouvert 4 fois · cliqué 2 fois", d: "il y a 4 j", ic: Icons.mail, c: "var(--brand-500)" },
                { t: "Premier contact WhatsApp", s: "Recommandation de M. Pernot", d: "il y a 5 j", ic: Icons.send, c: "var(--ink-4)" },
              ].map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: h.c + "14", color: h.c, display: "grid", placeItems: "center", flex: "none" }}>{h.ic}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{h.t}</div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{h.s}</div>
                  </div>
                  <div className="tiny muted" style={{ whiteSpace: "nowrap" }}>{h.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}

const AI_MESSAGES = [
  `Bonjour M. Lambert,\n\nSuite à notre rendez-vous de jeudi, voici une étude personnalisée pour la rénovation de votre salle de bain (4 200 € TTC).\n\nCordialement,\nDavid — DPM Plomberie`,
  `Bonjour M. Lambert,\n\nNous avons préparé deux options pour votre projet :\n• Option Essentiel : 3 800 € TTC — qualité fiable, délai 4 semaines\n• Option Premium : 4 800 € TTC — matériaux haut de gamme, délai 5 semaines\n\nDisponible pour en discuter à votre convenance.\n\nCordialement,\nDavid — DPM Plomberie`,
];

export function CrmContactPopup() {
  const nav = useNavigate();
  const [msgIdx, setMsgIdx] = useState(0);
  const [subject, setSubject] = useState("Suite à notre échange — étude personnalisée pour votre SDB");
  const [message, setMessage] = useState(AI_MESSAGES[0]);
  const [showToast, Toast] = useToast();
  const [attached, setAttached] = useState(false);

  const regenerate = () => {
    const next = (msgIdx + 1) % AI_MESSAGES.length;
    setMsgIdx(next);
    setMessage(AI_MESSAGES[next]);
    showToast('Message régénéré par l\'IA', 'info');
  };

  const handleSend = () => {
    showToast('Email envoyé à M. Lambert', 'success');
    setTimeout(() => nav('/crm/P-1'), 800);
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar crumbs={["Prospection", "M. Lambert"]} right={<button className="btn" onClick={() => nav('/crm/P-1')}>{Icons.back} Retour</button>} />
        <div style={{ flex: 1, position: "relative", background: "rgba(11,18,32,0.45)", display: "grid", placeItems: "center", padding: 30 }}>
          <div className="card" style={{ width: "100%", maxWidth: 560, padding: 0, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--violet-50)", color: "var(--violet-700)", display: "grid", placeItems: "center" }}>{Icons.mail}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Email à M. Lambert</div>
                <div className="tiny muted">lambert.f@example.fr</div>
              </div>
              <span className="pill ai" style={{ fontSize: 11 }}><span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>Pré-rempli par l'IA</span>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <div className="tiny muted" style={{ marginBottom: 4 }}>Objet</div>
                <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, fontWeight: 500, outline: "none" }} />
              </div>
              <div>
                <div className="tiny muted" style={{ marginBottom: 4 }}>Message</div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ width: "100%", minHeight: 160, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, lineHeight: 1.55, outline: "none", resize: "none", fontFamily: "inherit" }} />
              </div>
              {attached && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--brand-50)", border: "1px solid var(--brand-100)", borderRadius: 8, fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                  {Icons.attach}
                  <span style={{ flex: 1 }}>DEV-2025-0418.pdf · 45 Ko</span>
                  <button onClick={() => setAttached(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, padding: 0 }}>×</button>
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--violet-50)", border: "1px solid #ddd5fb", borderRadius: 10, fontSize: 12.5, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>
                <div style={{ flex: 1 }}>L'IA a personnalisé le message en analysant votre conversation.</div>
                <button className="btn sm ghost" onClick={regenerate}>Régénérer</button>
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", background: "var(--bg-soft)", display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn ghost" onClick={() => setAttached(true)}>{Icons.attach} Joindre devis</button>
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => nav('/crm/P-1')}>Annuler</button>
              <button className="btn brand" onClick={handleSend}>{Icons.send} Envoyer</button>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
