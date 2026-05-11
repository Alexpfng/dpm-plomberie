import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';

const WEEK_OFFSET_DAYS = [
  [{ name: "Lun", date: "20", month: "avr" }, { name: "Mar", date: "21", month: "avr" }, { name: "Mer", date: "22", month: "avr" }, { name: "Jeu", date: "23", month: "avr" }, { name: "Ven", date: "24", month: "avr" }, { name: "Sam", date: "25", month: "avr" }],
  [{ name: "Lun", date: "27", month: "avr" }, { name: "Mar", date: "28", month: "avr" }, { name: "Mer", date: "29", month: "avr" }, { name: "Jeu", date: "30", month: "avr" }, { name: "Ven", date: "01", month: "mai" }, { name: "Sam", date: "02", month: "mai" }],
  [{ name: "Lun", date: "04", month: "mai" }, { name: "Mar", date: "05", month: "mai" }, { name: "Mer", date: "06", month: "mai" }, { name: "Jeu", date: "07", month: "mai" }, { name: "Ven", date: "08", month: "mai" }, { name: "Sam", date: "09", month: "mai" }],
];
const WEEK_LABELS = ["Semaine du 20 avril", "Semaine du 27 avril", "Semaine du 4 mai"];
const WEEK_BUSY = [[4,3,5,2,1,0],[5,3,6,4,2,0],[2,4,3,5,1,0]];

const SLOTS = ["08:00 – 10:00", "09:00 – 11:00", "10:00 – 12:00", "13:00 – 15:00", "14:00 – 16:00", "15:00 – 17:00", "16:00 – 18:00"];
const AVAIL = [
  ["busy","busy","free","free","busy","tight","free"],
  ["free","free","tight","free","free","free","busy"],
  ["busy","free","busy","busy","free","tight","free"],
  ["free","busy","free","free","busy","free","tight"],
  ["free","free","free","free","free","free","free"],
  ["free","free","free","busy","busy","busy","busy"],
];

function ClientPreview({ slot }) {
  return (
    <div style={{ width: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 22, padding: 14, boxShadow: "var(--shadow-md)", maxWidth: 320, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,var(--brand-500),var(--brand-700))", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>D</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>DPM Plomberie</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.4, marginBottom: 6 }}>Bonjour Mme. Lefèvre 👋</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 14 }}>
        Voici 3 créneaux pour réparer la fuite sous votre évier. Cliquez pour confirmer.
      </div>
      {[
        { t: slot, sel: true },
        { t: "Mer. 29 avr · 10:00 – 12:00" },
        { t: "Jeu. 30 avr · 14:00 – 16:00" },
      ].map((s, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 10, marginBottom: 8, background: s.sel ? "var(--brand-50)" : "#fff", border: s.sel ? "2px solid var(--brand-500)" : "1px solid var(--line)", fontSize: 12.5, fontWeight: s.sel ? 600 : 500, color: s.sel ? "var(--brand-700)" : "var(--ink-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {s.t}
          {s.sel && <span style={{ fontSize: 10 }}>✓ Choisi</span>}
        </div>
      ))}
      <button style={{ width: "100%", marginTop: 6, padding: "10px", background: "var(--brand-500)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirmer le rendez-vous</button>
      <div className="tiny muted" style={{ textAlign: "center", marginTop: 10 }}>Sécurisé · Annulation gratuite jusqu'à 2 h avant</div>
    </div>
  );
}

export default function ScheduleScreen() {
  const nav = useNavigate();
  const [selected, setSelected] = useState({ day: 1, slot: 1 });
  const [weekIdx, setWeekIdx] = useState(1);
  const [showToast, Toast] = useToast();

  const DAYS = WEEK_OFFSET_DAYS[weekIdx];
  const busyArr = WEEK_BUSY[weekIdx];

  const handleSend = () => {
    const day = DAYS[selected.day];
    showToast(`Créneau envoyé par SMS à Mme. Lefèvre — ${day.name}. ${day.date} ${day.month} · ${SLOTS[selected.slot]}`, 'success');
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Planning", "Proposer un créneau · Mme. Lefèvre"]}
          right={
            <>
              <button className="btn" onClick={() => nav('/inbox')}>{Icons.back} Retour</button>
              <button className="btn brand" onClick={handleSend}>{Icons.send} Envoyer au client</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 22, alignItems: "start" }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{WEEK_LABELS[weekIdx]}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>Créneaux libres affichés en blanc · IA optimise par zone géographique</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => setWeekIdx(i => Math.max(0, i - 1))}>‹</button>
                <button className="btn sm" onClick={() => setWeekIdx(1)}>Aujourd'hui</button>
                <button className="btn sm" onClick={() => setWeekIdx(i => Math.min(WEEK_OFFSET_DAYS.length - 1, i + 1))}>›</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(6,1fr)", gap: 6, marginBottom: 6 }}>
              <div></div>
              {DAYS.map((d, i) => (
                <div key={i} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: i === selected.day ? "var(--brand-50)" : "transparent" }}>
                  <div className="tiny muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: i === selected.day ? "var(--brand-700)" : "var(--ink)" }}>{d.date}</div>
                  <div className="tiny muted">{busyArr[i] === 0 ? "Libre" : busyArr[i] + " RDV"}</div>
                </div>
              ))}
            </div>

            {SLOTS.map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "60px repeat(6,1fr)", gap: 6, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
                  {s.split(" – ")[0]}
                </div>
                {DAYS.map((d, di) => {
                  const a = AVAIL[di][si];
                  const isSel = selected.day === di && selected.slot === si;
                  return (
                    <button key={di} onClick={() => { if (a !== "busy") setSelected({ day: di, slot: si }); }} disabled={a === "busy"} style={{
                      height: 52, borderRadius: 8,
                      border: isSel ? "2px solid var(--brand-500)" : "1px solid var(--line)",
                      background: isSel ? "var(--brand-50)" : a === "busy" ? "repeating-linear-gradient(135deg,#f1f3f6 0 6px,#f7f8fa 6px 12px)" : a === "tight" ? "var(--amber-50)" : "#fff",
                      color: a === "busy" ? "var(--ink-5)" : a === "tight" ? "var(--amber-700)" : isSel ? "var(--brand-700)" : "var(--ink-3)",
                      cursor: a === "busy" ? "not-allowed" : "pointer",
                      fontSize: 11.5, fontWeight: isSel ? 600 : 500, padding: "6px 8px", textAlign: "left",
                      display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                      boxShadow: isSel ? "0 0 0 3px rgba(43,107,255,0.12)" : "none",
                    }}>
                      {a === "busy" ? <span style={{ fontSize: 10 }}>Indisponible</span> : (
                        <>
                          <span style={{ fontWeight: 600, color: isSel ? "var(--brand-700)" : "var(--ink)" }}>{s}</span>
                          {a === "tight" ? <span style={{ fontSize: 10 }}>Trajet serré</span> : <span style={{ fontSize: 10, color: "var(--green-700)" }}>● Libre</span>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-3)", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 3 }} />Disponible</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "var(--amber-50)", border: "1px solid #ffe6bb", borderRadius: 3 }} />Trajet serré (IA)</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "repeating-linear-gradient(135deg,#f1f3f6 0 4px,#f7f8fa 4px 8px)", border: "1px solid var(--line)", borderRadius: 3 }} />Pris</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "var(--brand-50)", border: "2px solid var(--brand-500)", borderRadius: 3 }} />Sélectionné</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="label" style={{ marginBottom: 10 }}>Créneau sélectionné</div>
              <div style={{ background: "var(--brand-50)", border: "1px solid var(--brand-100)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--brand-900)" }}>
                  {DAYS[selected.day].name}. {DAYS[selected.day].date} {DAYS[selected.day].month}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--brand-700)", marginTop: 2 }}>{SLOTS[selected.slot]}</div>
                <div className="tiny" style={{ color: "var(--ink-3)", marginTop: 6 }}>Fenêtre de 2 h · Notification SMS 1 h avant</div>
              </div>
              <div className="ai-stripe" style={{ borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink-2)" }}>Tournée optimisée par l'IA</div>
                  <div className="tiny" style={{ color: "var(--ink-3)", marginTop: 2 }}>+1 RDV à 600 m (M. Pernot, 10:30) · trajet réduit de 18 min</div>
                </div>
              </div>
              <div className="label" style={{ marginBottom: 8 }}>Intervention</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Mme. Lefèvre</div>
              <div className="tiny" style={{ color: "var(--ink-3)" }}>12 rue de la Paix, 75002 Paris</div>
              <div className="tiny" style={{ color: "var(--ink-3)", marginTop: 2 }}>Réparation fuite siphon · ~ 45 min</div>
            </div>

            <div className="card" style={{ padding: 16, background: "var(--bg-soft)" }}>
              <div className="label" style={{ marginBottom: 10 }}>Aperçu côté client</div>
              <ClientPreview slot={`${DAYS[selected.day].name}. ${DAYS[selected.day].date} ${DAYS[selected.day].month} · ${SLOTS[selected.slot]}`} />
            </div>

            <button className="btn brand" style={{ padding: "12px 14px", justifyContent: "center" }} onClick={handleSend}>
              {Icons.send} Envoyer au client par SMS
            </button>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
