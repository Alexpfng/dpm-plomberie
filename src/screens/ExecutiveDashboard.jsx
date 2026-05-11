import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, StatusPill, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';

function BigKPI({ label, value, sub, ic, accent, trend, trendUp, hero }) {
  return (
    <div className="card" style={{
      padding: hero ? "22px 24px" : "20px 22px",
      display: "flex", flexDirection: "column", gap: hero ? 12 : 8,
      background: hero ? "linear-gradient(180deg,#fff,#fafbfc)" : "#fff",
      border: hero ? "1px solid var(--brand-100)" : "1px solid var(--line)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink-3)" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: (accent || "var(--ink)") + "14", color: accent || "var(--ink)", display: "grid", placeItems: "center" }}>{ic}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em" }}>{label}</span>
        </div>
        {trend && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: trendUp ? "var(--green-700)" : "var(--red-500)", background: trendUp ? "var(--green-50)" : "var(--red-50)", padding: "3px 8px", borderRadius: 999 }}>{trendUp ? "↑" : "↓"} {trend}</span>
        )}
      </div>
      <div style={{ fontSize: hero ? 42 : 36, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }} className="tnum">{value}</div>
      <div className="tiny" style={{ color: "var(--ink-3)" }}>{sub}</div>
    </div>
  );
}

function FunnelStage({ label, count, value, pct, color, dropPct, isFirst, isLast }) {
  return (
    <div style={{ flex: 1, position: "relative" }}>
      {!isFirst && (
        <div style={{ position: "absolute", left: -24, top: 46, fontSize: 11, fontWeight: 600, color: dropPct > 15 ? "var(--red-500)" : "var(--ink-4)", background: dropPct > 15 ? "var(--red-50)" : "#fff", border: "1px solid " + (dropPct > 15 ? "#ffd1d6" : "var(--line)"), borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap", zIndex: 2 }}>
          −{dropPct}%
        </div>
      )}
      <div style={{ height: 92, background: color, borderRadius: 12, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.025em" }} className="tnum">{count}</span>
          <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }} className="tnum">{pct}%</span>
        </div>
      </div>
      <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
        <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{value}</span> {!isLast && "potentiel"}
      </div>
    </div>
  );
}

const PERIODS = ["Aujourd'hui", "Cette semaine", "Ce mois", "Cette année"];

export default function ExecutiveDashboard() {
  const nav = useNavigate();
  const [period, setPeriod] = useState("Cette semaine");
  const [showPeriod, setShowPeriod] = useState(false);
  const [showToast, Toast] = useToast();

  const alertActions = [
    { ic: "⚠", t: "3 devis non envoyés depuis +24 h", s: "≈ 1 240 € en attente", action: "Envoyer", color: "var(--red-500)", bg: "var(--red-50)", fn: () => nav('/quotes') },
    { ic: "⏱", t: "2 demandes WhatsApp sans réponse", s: "Reçues il y a +6 h", action: "Répondre", color: "var(--amber-500)", bg: "var(--amber-50)", fn: () => nav('/inbox') },
    { ic: "✦", t: "5 clients fidèles à recontacter", s: "Entretien annuel dû ce mois", action: "Voir liste", color: "var(--violet-500)", bg: "var(--violet-50)", fn: () => nav('/clients') },
    { ic: "€", t: "Tournée Paris 2 optimisable", s: "+ 1 RDV possible mardi", action: "Optimiser", color: "var(--brand-500)", bg: "var(--brand-50)", fn: () => nav('/schedule') },
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
              <button className="btn" onClick={() => showToast('Export en cours… le fichier sera prêt dans quelques secondes.', 'info')}>{Icons.download} Exporter</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>L'activité, en un coup d'œil</h2>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                Lundi 27 avril · semaine 18 · <span style={{ color: "var(--green-700)", fontWeight: 600 }}>↑ 18 % de CA</span> vs semaine dernière
              </div>
            </div>
            <div className="pill scheduled" style={{ fontSize: 12, padding: "4px 10px" }}>
              <span className="dot" />Tout va bien · 0 demande perdue cette semaine
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
            <BigKPI label="Demandes reçues" value="58" sub="cette semaine · 24 aujourd'hui" ic={Icons.inbox} accent="var(--brand-500)" trend="32%" trendUp />
            <BigKPI label="Devis envoyés" value="42" sub="6 en attente · 7 prêts" ic={Icons.quote} accent="var(--amber-500)" trend="14%" trendUp />
            <BigKPI label="Taux d'acceptation" value="87 %" sub="36/42 acceptés" ic={Icons.check} accent="var(--green-500)" trend="9 pts" trendUp hero />
            <BigKPI label="Chiffre d'affaires" value="6 480 €" sub="cette semaine · TTC" ic={Icons.euro} accent="var(--ink)" trend="18%" trendUp hero />
            <BigKPI label="Heures gagnées (IA)" value="14,3 h" sub="≈ 2 jours de travail" ic={Icons.sparkle} accent="var(--violet-500)" trend="2,4 h" trendUp />
          </div>

          <div className="card" style={{ padding: 22, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Parcours de la demande au paiement</h3>
                <div className="tiny muted" style={{ marginTop: 2 }}>Cette semaine · suivez où l'argent peut être perdu</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="tiny muted">Conversion globale</span>
                <span className="tnum" style={{ fontSize: 20, fontWeight: 600, color: "var(--green-700)", letterSpacing: "-0.01em" }}>62 %</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <FunnelStage label="Demandes reçues" count={58} value="9 280 €" pct={100} color="#2b6bff" isFirst />
              <FunnelStage label="Devis envoyés" count={42} value="6 720 €" pct={72} dropPct={28} color="#1444c2" />
              <FunnelStage label="Rendez-vous" count={36} value="5 760 €" pct={62} dropPct={14} color="#4a2db5" />
              <FunnelStage label="Interventions" count={31} value="4 960 €" pct={53} dropPct={14} color="#0a7d44" isLast />
            </div>
            <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--red-50)", border: "1px solid #ffd1d6", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--red-500)" }}>⚠</span>
              <div style={{ flex: 1, color: "var(--ink-2)" }}>
                <span style={{ fontWeight: 600 }}>16 demandes perdues entre réception et devis</span> · soit ~ 2 560 € de CA potentiel non capté.
              </div>
              <button className="btn sm" onClick={() => nav('/inbox')}>Analyser</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 18 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Aujourd'hui</h3>
                <div className="tiny muted">Lun. 27 avril</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                {[
                  { n: 3, l: "RDV planifiés", c: "var(--green-500)", bg: "var(--green-50)", ic: Icons.calendar, to: "/schedule" },
                  { n: 2, l: "Demandes urgentes", c: "var(--red-500)", bg: "var(--red-50)", ic: Icons.bolt, to: "/inbox" },
                  { n: 6, l: "Devis prêts à envoyer", c: "var(--amber-500)", bg: "var(--amber-50)", ic: Icons.quote, to: "/quotes" },
                ].map((b, i) => (
                  <div key={i} onClick={() => nav(b.to)} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", cursor: 'pointer' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: b.bg, color: b.c, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{b.ic}</span>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }} className="tnum">{b.n}</div>
                    <div className="tiny muted">{b.l}</div>
                  </div>
                ))}
              </div>
              {[
                { time: "09:00", c: "Mme. Lefèvre", what: "Fuite siphon · Paris 2", st: "new", urgent: true, id: "REQ-2841" },
                { time: "11:30", c: "M. Pernot", what: "Robinetterie · Paris 2", st: "scheduled", id: "REQ-2838" },
                { time: "14:00", c: "Mme. Diop", what: "WC bouché · Paris 19", st: "scheduled", id: "REQ-2837" },
              ].map((d, i) => (
                <div key={i} onClick={() => nav('/requests/' + d.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--line-soft)", cursor: 'pointer' }}>
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 600, width: 46 }}>{d.time}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{d.c}</div>
                    <div className="tiny muted">{d.what}</div>
                  </div>
                  {d.urgent && <span className="pill urgent" style={{ fontSize: 11 }}><span className="dot" />Urgent</span>}
                  <StatusPill status={d.st} />
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Alertes & opportunités</h3>
                <span className="pill urgent" style={{ fontSize: 11 }}><span className="dot" />3 à traiter</span>
              </div>
              {alertActions.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: a.bg, color: a.color, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 600, flex: "none" }}>{a.ic}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{a.t}</div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{a.s}</div>
                  </div>
                  <button className="btn sm" onClick={a.fn}>{a.action}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card ai-stripe" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 6px 16px -6px rgba(111,76,224,0.5)" }}>{Icons.sparkle}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Performance de l'assistant IA</h3>
                <div className="tiny muted">Cette semaine · l'IA travaille pour vous 24/7</div>
              </div>
              <div className="pill ai" style={{ fontSize: 11 }}><span className="dot" />Actif · 100% uptime</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {[
                { l: "Temps moyen génération devis", v: "12 s", s: "vs. 15 min en manuel", c: "var(--violet-700)" },
                { l: "Précision des diagnostics IA", v: "96 %", s: "validés sur 47 interventions", c: "var(--violet-700)" },
                { l: "Heures économisées", v: "14,3 h", s: "≈ 2 jours de travail", c: "var(--green-700)" },
                { l: "CA additionnel grâce à la rapidité", v: "+ 2 850 €", s: "clients servis avant la concurrence", c: "var(--brand-700)" },
              ].map((m, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid var(--line-soft)", borderRadius: 12, padding: "14px 16px" }}>
                  <div className="tiny" style={{ color: "var(--ink-4)", fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{m.l}</div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", color: m.c }} className="tnum">{m.v}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{m.s}</div>
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
