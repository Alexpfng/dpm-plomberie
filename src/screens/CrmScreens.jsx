import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast, Modal } from '../components/Shared';
import { Icons } from '../components/Icons';

const PALETTE = [
  ["#fde7d2","#7a3a10"], ["#dbe7ff","#1444c2"],
  ["#eafbf2","#0a7d44"], ["#f1eefd","#4a2db5"],
];

const STATUS_LABELS = {
  nouveau:     "Nouveau",
  rdv_booke:   "RDV pris",
  demo_faite:  "Démo faite",
  compte_cree: "Compte créé",
  actif:       "Actif",
  payant:      "Payant",
};

function fmtRate(a, b) {
  return b > 0 ? `${Math.round((a / b) * 100)} %` : "—";
}

export function CrmPipelineScreen() {
  const nav = useNavigate();
  const [prospects, setProspects] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newP, setNewP] = useState({ firstName: '', lastName: '', company: '', phone: '', status: 'nouveau' });
  const [newC, setNewC] = useState({ name: '', objective: '' });
  const [showToast, Toast] = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime  = new Date().toTimeString().slice(0, 5);

  const overdue = reminders.filter(r => !r.completed && r.date < todayStr);
  const todayR  = reminders.filter(r => !r.completed && r.date === todayStr);
  const soonR   = todayR.filter(r => r.time && r.time <= nowTime);

  const funnel = {
    total:   prospects.length,
    rdv:     prospects.filter(p => ['rdv_booke','demo_faite','compte_cree','actif','payant'].includes(p.status)).length,
    comptes: prospects.filter(p => ['compte_cree','actif','payant'].includes(p.status)).length,
    actifs:  prospects.filter(p => ['actif','payant'].includes(p.status)).length,
    payants: prospects.filter(p => p.status === 'payant').length,
  };

  const addProspect = () => {
    const name = `${newP.firstName} ${newP.lastName}`.trim();
    if (!name) return;
    const initials = [newP.firstName[0], newP.lastName[0]].filter(Boolean).join('').toUpperCase() || name[0].toUpperCase();
    const [color, fg] = PALETTE[prospects.length % PALETTE.length];
    setProspects(ps => [...ps, {
      id: `P-${Date.now()}`, ...newP, name, initials, color, fg,
      addedAt: new Date().toISOString(),
    }]);
    setNewP({ firstName: '', lastName: '', company: '', phone: '', status: 'nouveau' });
    setShowModal(false);
    showToast(`${name} ajouté à la prospection`, 'success');
  };

  const addCampaign = () => {
    if (!newC.name.trim()) return;
    setCampaigns(cs => [...cs, { id: `C-${Date.now()}`, ...newC, status: 'active' }]);
    setNewC({ name: '', objective: '' });
    setShowCampaignModal(false);
    showToast('Campagne créée', 'success');
  };

  const field = (label, key, placeholder, state, setState, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 5 }}>{label}</div>
      <input type={type} value={state[key]} onChange={e => setState(s => ({ ...s, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
    </div>
  );

  const ReminderCard = ({ title, items, color, emptyLabel, icon }) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title} <span className="tnum" style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 13 }}>({items.length})</span></span>
      </div>
      <div style={{ padding: '10px 18px 14px' }}>
        {items.length === 0
          ? <p className="tiny muted">{emptyLabel}</p>
          : items.slice(0, 5).map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line-soft)', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.prospectName}
                </span>
                <span className="tiny mono muted" style={{ whiteSpace: 'nowrap' }}>{r.date}{r.time ? ` · ${r.time}` : ''}</span>
              </div>
            ))
        }
      </div>
    </div>
  );

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          title="Prospection"
          right={
            <button className="btn brand" onClick={() => setShowModal(true)}>{Icons.plus} Nouveau prospect</button>
          }
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: "Prospects total",     v: String(prospects.length), c: "var(--brand-500)" },
              { l: "RDV pris",            v: String(funnel.rdv),       c: "var(--violet-500)" },
              { l: "Comptes créés",       v: String(funnel.comptes),   c: "var(--green-700)" },
              { l: "Clients payants",     v: String(funnel.payants),   c: "var(--ink)" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px' }}>
                <div className="tiny" style={{ color: 'var(--ink-4)', fontWeight: 500, marginBottom: 4 }}>{s.l}</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Funnel */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Funnel d'activation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, textAlign: 'center' }}>
              {[
                { l: "Total",   v: funnel.total,   rate: null },
                { l: "RDV+",    v: funnel.rdv,     rate: fmtRate(funnel.rdv, funnel.total) },
                { l: "Comptes", v: funnel.comptes, rate: fmtRate(funnel.comptes, funnel.rdv) },
                { l: "Actifs",  v: funnel.actifs,  rate: fmtRate(funnel.actifs, funnel.comptes) },
                { l: "Payants", v: funnel.payants, rate: fmtRate(funnel.payants, funnel.actifs) },
              ].map((f, i) => (
                <div key={i} style={{ padding: '10px 6px', borderRadius: 10, background: 'var(--bg-soft)' }}>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>{f.v}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>{f.l}</div>
                  {f.rate && <div className="tiny" style={{ marginTop: 4, color: 'var(--brand-500)', fontWeight: 600 }}>{f.rate}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            <ReminderCard
              title="En retard"
              items={overdue}
              color="var(--red-500, #e53e3e)"
              emptyLabel="Aucune relance en retard"
              icon={Icons.bolt}
            />
            <ReminderCard
              title="Aujourd'hui"
              items={todayR}
              color="var(--brand-500)"
              emptyLabel="Aucune relance prévue aujourd'hui"
              icon={Icons.calendar}
            />
            <ReminderCard
              title="Dans l'heure"
              items={soonR}
              color="var(--amber-500)"
              emptyLabel="Aucune"
              icon={Icons.clock}
            />
          </div>

          {/* Campaigns */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Campagnes actives</span>
              <button className="btn sm ghost" onClick={() => setShowCampaignModal(true)}>{Icons.plus} Nouvelle</button>
            </div>
            <div style={{ padding: '10px 18px 14px' }}>
              {campaigns.length === 0
                ? <p className="tiny muted">Aucune campagne active</p>
                : campaigns.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                      <span className="tiny muted">{c.objective || '—'}</span>
                    </div>
                  ))
              }
            </div>
          </div>

        </div>
      </div>

      {/* Prospect modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau prospect"
        footer={<><button className="btn" onClick={() => setShowModal(false)}>Annuler</button><button className="btn brand" onClick={addProspect}>{Icons.plus} Ajouter</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          {field('Prénom', 'firstName', 'Jean', newP, setNewP)}
          {field('Nom', 'lastName', 'Dupont', newP, setNewP)}
        </div>
        {field('Société', 'company', 'DPM SA…', newP, setNewP)}
        {field('Téléphone', 'phone', '06 12 34 56 78', newP, setNewP, 'tel')}
        <div style={{ marginBottom: 14 }}>
          <div className="tiny muted" style={{ marginBottom: 5 }}>Statut initial</div>
          <select value={newP.status} onChange={e => setNewP(p => ({ ...p, status: e.target.value }))}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </Modal>

      {/* Campaign modal */}
      <Modal open={showCampaignModal} onClose={() => setShowCampaignModal(false)} title="Nouvelle campagne"
        footer={<><button className="btn" onClick={() => setShowCampaignModal(false)}>Annuler</button><button className="btn brand" onClick={addCampaign}>{Icons.plus} Créer</button></>}>
        {field('Nom de la campagne', 'name', 'Relance printemps 2026…', newC, setNewC)}
        {field('Objectif', 'objective', 'Générer 10 RDV…', newC, setNewC)}
      </Modal>

      {Toast}
    </div>
  );
}

export function CrmDetailScreen() {
  const nav = useNavigate();
  const [showToast, Toast] = useToast();
  const [converted, setConverted] = useState(false);
  const p = { name: "Prospect", initials: "?", color: "var(--bg-soft)", fg: "var(--ink-3)", phone: "", proj: "" };

  const handleConvert = () => {
    setConverted(true);
    showToast('Converti en client', 'success');
    setTimeout(() => nav('/crm'), 1500);
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
    setTimeout(() => nav('/crm'), 800);
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar crumbs={["Prospection", "M. Lambert"]} right={<button className="btn" onClick={() => nav('/crm')}>{Icons.back} Retour</button>} />
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
              <button className="btn" onClick={() => nav('/crm')}>Annuler</button>
              <button className="btn brand" onClick={handleSend}>{Icons.send} Envoyer</button>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
