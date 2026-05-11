import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, StatusPill, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';

function StatTile({ label, value, sub, ic, accent, trend, trendUp }) {
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-4)" }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: (accent || "var(--ink)") + "14", color: accent || "var(--ink)", display: "grid", placeItems: "center" }}>{ic}</span>
          <span className="label" style={{ padding: 0 }}>{label}</span>
        </div>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 600, color: trendUp ? "var(--green-700)" : "var(--ink-4)", background: trendUp ? "var(--green-50)" : "var(--bg-soft)", padding: "2px 7px", borderRadius: 999 }}>{trendUp ? "↑" : "↓"} {trend}</span>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05 }} className="tnum">{value}</div>
      <div className="tiny muted">{sub}</div>
    </div>
  );
}

function MiniChart() {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const vals = [42, 58, 71, 65, 88, 32, 18];
  const max = Math.max(...vals);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, padding: "8px 0" }}>
      {vals.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: "100%", height: (v / max) * 100 + "%", background: i === 4 ? "linear-gradient(180deg,var(--brand-500),var(--brand-700))" : "var(--bg-soft)", border: i === 4 ? "none" : "1px solid var(--line)", borderRadius: 6, position: "relative" }}>
            {i === 4 && (
              <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 600, color: "var(--brand-700)", background: "var(--brand-50)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>1 240 €</div>
            )}
          </div>
          <div className="tiny muted" style={{ fontWeight: i === 4 ? 600 : 500, color: i === 4 ? "var(--ink-2)" : "var(--ink-4)" }}>{days[i]}</div>
        </div>
      ))}
    </div>
  );
}

const PERIODS = ["Aujourd'hui", "Cette semaine", "Ce mois", "Cette année"];

export default function DashboardScreen() {
  const nav = useNavigate();
  const [period, setPeriod] = useState("Cette semaine");
  const [showPeriod, setShowPeriod] = useState(false);
  const [showToast, Toast] = useToast();

  const actItems = [
    { ic: Icons.sparkle, c: "var(--violet-500)", t: "L'IA a généré un devis pour Mme. Lefèvre", s: "180 € · accepté en 4 min", time: "il y a 4 min" },
    { ic: Icons.calendar, c: "var(--green-500)", t: "M. Tanaka a confirmé son rendez-vous", s: "Mar. 28 avr · 09:00 – 11:00", time: "il y a 18 min" },
    { ic: Icons.send, c: "var(--brand-500)", t: "Devis DEV-2025-0417 envoyé par SMS", s: "Boulangerie Pétrin d'Or · 4 850 €", time: "il y a 42 min" },
    { ic: Icons.check, c: "var(--green-500)", t: "Intervention terminée chez M. Bertrand", s: "Chaudière redémarrée · 380 € facturés", time: "il y a 1 h" },
    { ic: Icons.inbox, c: "var(--brand-500)", t: "Nouvelle demande WhatsApp", s: "Mme. Diop · WC bouché à Belleville", time: "il y a 3 h" },
  ];

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          title="Tableau de bord"
          right={
            <>
              <div style={{ position: 'relative' }}>
                <button className="btn" onClick={() => setShowPeriod(p => !p)}>{period} {Icons.chevronDown}</button>
                {showPeriod && (
                  <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 180, zIndex: 100, padding: '6px 0' }}>
                    {PERIODS.map(p => (
                      <button key={p} onClick={() => { setPeriod(p); setShowPeriod(false); }} className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, fontWeight: period === p ? 600 : 400 }}>{p}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn brand" onClick={() => nav('/inbox')}>{Icons.plus} Nouvelle demande</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>Bonjour David 👋</h2>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                L'IA a traité <span style={{ color: "var(--violet-700)", fontWeight: 600 }}>17 demandes</span> ce matin. Vous avez économisé <span style={{ color: "var(--green-700)", fontWeight: 600 }}>2 h 14</span> aujourd'hui.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => nav('/inbox')}>{Icons.inbox} Boîte de réception</button>
              <button className="btn" onClick={() => nav('/quotes')}>{Icons.quote} Nouveau devis</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 22 }}>
            <StatTile label="Demandes (jour)" value="24" sub="0 perdue" ic={Icons.inbox} accent="var(--brand-500)" trend="32%" trendUp />
            <StatTile label="Devis en attente" value="7" sub="6 prêts à envoyer" ic={Icons.quote} accent="var(--amber-500)" trend="3" trendUp />
            <StatTile label="RDV planifiés" value="12" sub="Cette semaine" ic={Icons.calendar} accent="var(--green-500)" trend="5" trendUp />
            <StatTile label="CA estimé" value="6 480 €" sub="+18 % vs sem. dernière" ic={Icons.euro} accent="var(--ink)" trend="18%" trendUp />
            <StatTile label="Heures gagnées (IA)" value="14,3 h" sub="Cette semaine" ic={Icons.sparkle} accent="var(--violet-500)" trend="2,4 h" trendUp />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 22 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Chiffre d'affaires</h3>
                  <div className="tiny muted" style={{ marginTop: 2 }}>7 derniers jours · TTC</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>6 480 €</div>
                  <div className="tiny" style={{ color: "var(--green-700)", fontWeight: 600 }}>↑ 18 % vs sem. -1</div>
                </div>
              </div>
              <MiniChart />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--line-soft)", fontSize: 12.5, color: "var(--ink-3)" }}>
                <span>Panier moyen <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 6 }}>198,40 €</span></span>
                <span>Devis acceptés <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 6 }}>87 %</span></span>
                <span>Marge brute <span className="tnum" style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 6 }}>62 %</span></span>
              </div>
            </div>

            <div className="card ai-stripe" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", display: "grid", placeItems: "center", color: "#fff" }}>{Icons.sparkle}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Bilan de l'assistant IA</div>
                  <div className="tiny muted">Cette semaine</div>
                </div>
              </div>
              {[
                { label: "Demandes traitées sans intervention", val: "42/58", pct: 72 },
                { label: "Devis générés en moins de 15 s", val: "31", pct: 88, color: "var(--violet-700)" },
                { label: "RDV optimisés par tournée", val: "19", pct: 65 },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ color: "var(--ink-3)" }}>{m.label}</span>
                    <span className="tnum" style={{ fontWeight: 600, color: m.color || "var(--ink)" }}>{m.val}</span>
                  </div>
                  <div className="bar"><i style={{ width: m.pct + "%" }} /></div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "10px 12px", background: "#fff", border: "1px solid var(--line-soft)", borderRadius: 10, fontSize: 12.5 }}>
                <span className="ai-grad" style={{ fontWeight: 600 }}>+ 2 850 €</span>
                <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>de CA additionnel grâce à la rapidité de l'IA.</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Activité récente</h3>
                <button className="btn sm ghost" onClick={() => nav('/inbox')}>Tout voir {Icons.chevron}</button>
              </div>
              {actItems.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)", alignItems: "flex-start" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", background: it.c + "14", color: it.c, display: "grid", placeItems: "center" }}>{it.ic}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{it.t}</div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{it.s}</div>
                  </div>
                  <div className="tiny muted" style={{ whiteSpace: "nowrap" }}>{it.time}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Actions rapides</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { ic: Icons.inbox, t: "Ouvrir la boîte de réception", s: "24 demandes en attente", c: "var(--brand-500)", to: "/inbox" },
                    { ic: Icons.plus, t: "Créer une demande manuelle", s: "Pour un appel téléphonique", c: "var(--ink)", to: "/inbox" },
                    { ic: Icons.bolt, t: "Générer un devis avec l'IA", s: "À partir d'une description", c: "var(--violet-500)", to: "/quotes" },
                  ].map((a, i) => (
                    <button key={i} onClick={() => nav(a.to)} className="btn" style={{ padding: "12px 14px", justifyContent: "flex-start", gap: 12, fontWeight: 500 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", background: a.c + "14", color: a.c, display: "grid", placeItems: "center" }}>{a.ic}</span>
                      <div style={{ textAlign: "left", flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.t}</div>
                        <div className="tiny muted">{a.s}</div>
                      </div>
                      <span style={{ color: "var(--ink-5)" }}>{Icons.chevron}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}>Aujourd'hui</h3>
                {[
                  { t: "09:00 · Mme. Lefèvre", s: "Fuite siphon · Paris 2", st: "new", id: "REQ-2841" },
                  { t: "11:30 · M. Pernot", s: "Robinetterie · Paris 2", st: "scheduled", id: "REQ-2838" },
                  { t: "14:00 · Mme. Diop", s: "WC bouché · Paris 19", st: "scheduled", id: "REQ-2837" },
                ].map((d, i) => (
                  <div key={i} onClick={() => nav('/requests/' + d.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)", cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.t}</div>
                      <div className="tiny muted">{d.s}</div>
                    </div>
                    <StatusPill status={d.st} />
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
