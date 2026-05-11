import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Topbar, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';

const INITIAL_LINES = [
  { d: "Diagnostic et démontage siphon", q: 1, u: "Forfait", p: 45.00, conf: 98 },
  { d: "Joint torique d'étanchéité 32 mm (réf. JT-32)", q: 2, u: "Pièce", p: 4.50, conf: 96 },
  { d: "Raccord PVC sortie siphon Ø 40 mm", q: 1, u: "Pièce", p: 8.90, conf: 92 },
  { d: "Main d'œuvre — remplacement et étanchéité", q: 0.75, u: "h", p: 65.00, conf: 99 },
  { d: "Test étanchéité + nettoyage zone", q: 1, u: "Forfait", p: 25.00, conf: 95 },
  { d: "Déplacement zone Paris 2", q: 1, u: "Forfait", p: 35.00, conf: 100 },
];

const fmt = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function QuoteScreen() {
  const nav = useNavigate();
  const [lines, setLines] = useState(INITIAL_LINES);
  const [editIdx, setEditIdx] = useState(null);
  const [showToast, Toast] = useToast();

  const subtotalHT = lines.reduce((s, l) => s + l.q * l.p, 0);
  const tva = subtotalHT * 0.10;
  const totalTTC = subtotalHT + tva;

  const updateLine = (i, field, val) => {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: field === 'q' || field === 'p' ? parseFloat(val) || 0 : val } : l));
  };

  const addLine = () => {
    setLines(ls => [...ls, { d: "Nouvelle ligne", q: 1, u: "Forfait", p: 0, conf: 90 }]);
    setEditIdx(lines.length);
  };

  const removeLine = (i) => {
    setLines(ls => ls.filter((_, idx) => idx !== i));
    setEditIdx(null);
  };

  const applyDiscount = () => {
    setLines(ls => ls.filter(l => !l.d.startsWith("Déplacement")));
    showToast('Remise appliquée — déplacement offert (-35 €)', 'success');
  };

  const handleSend = () => {
    showToast(`Devis DEV-2025-0418 envoyé à Mme. Lefèvre · ${fmt(totalTTC)}`, 'success');
  };

  const handlePDF = () => {
    showToast('Génération du PDF en cours…', 'info');
    setTimeout(() => showToast('PDF prêt — DEV-2025-0418.pdf', 'success'), 1500);
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Devis", "DEV-2025-0418 · Mme. Lefèvre"]}
          right={
            <>
              <button className="btn" onClick={() => nav('/inbox')}>{Icons.back} Retour</button>
              <button className="btn" onClick={handlePDF}>{Icons.download} PDF</button>
              <button className="btn primary" onClick={handleSend}>{Icons.send} Envoyer au client</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="ai-stripe" style={{ borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", display: "grid", placeItems: "center", color: "#fff" }}>{Icons.bolt}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Devis généré en <span className="ai-grad">12 secondes</span></div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{lines.length} lignes · Référencé sur 23 interventions similaires · Tous les champs sont modifiables</div>
              </div>
              <span className="pill ai" style={{ fontSize: 11 }}><span className="dot" />Confiance moyenne 96 %</span>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="label">Devis</div>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 4 }}>DEV-2025-0418</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>Émis le 27 avril 2026 · Validité 30 jours</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>DPM Plomberie</div>
                  <div>SIRET 488 920 471 00018</div>
                  <div>3 rue Bichat, 75010 Paris</div>
                </div>
              </div>

              <div style={{ padding: "18px 26px", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Client</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Mme. Lefèvre</div>
                  <div className="tiny" style={{ color: "var(--ink-3)", marginTop: 2 }}>12 rue de la Paix, 75002 Paris</div>
                  <div className="tiny" style={{ color: "var(--ink-3)" }}>+33 6 12 34 56 78</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Intervention</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Réparation fuite — siphon évier cuisine</div>
                  <div className="tiny" style={{ color: "var(--ink-3)", marginTop: 2 }}>Durée estimée : 45 min · Garantie 6 mois</div>
                </div>
              </div>

              <div style={{ padding: "4px 26px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 90px 90px 30px", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontWeight: 600 }}>
                  <div>Description</div><div style={{ textAlign: "right" }}>Qté</div><div>Unité</div><div style={{ textAlign: "right" }}>P.U. HT</div><div style={{ textAlign: "right" }}>Total HT</div><div></div>
                </div>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 90px 90px 30px", gap: 14, padding: "10px 0", borderBottom: i < lines.length - 1 ? "1px solid var(--line-soft)" : "none", alignItems: "center", fontSize: 13, background: editIdx === i ? "var(--brand-50)" : "transparent" }}>
                    {editIdx === i ? (
                      <>
                        <input value={l.d} onChange={e => updateLine(i, 'd', e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--brand-300)", borderRadius: 6, fontSize: 13, outline: "none" }} />
                        <input type="number" value={l.q} onChange={e => updateLine(i, 'q', e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--brand-300)", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "right" }} />
                        <input value={l.u} onChange={e => updateLine(i, 'u', e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--brand-300)", borderRadius: 6, fontSize: 13, outline: "none" }} />
                        <input type="number" value={l.p} onChange={e => updateLine(i, 'p', e.target.value)} style={{ padding: "4px 8px", border: "1px solid var(--brand-300)", borderRadius: 6, fontSize: 13, outline: "none", textAlign: "right" }} />
                        <div style={{ textAlign: "right", fontWeight: 500 }} className="tnum">{fmt(l.q * l.p)}</div>
                        <button onClick={() => removeLine(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red-500)", fontSize: 16, padding: 0 }}>×</button>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "var(--ink)" }}>{l.d}</span>
                          <span className="pill ai" style={{ fontSize: 9.5, padding: "1px 6px" }}><span style={{ color: "var(--violet-500)", fontSize: 9 }}>●</span>{l.conf}%</span>
                        </div>
                        <div style={{ textAlign: "right" }} className="tnum">{l.q}</div>
                        <div className="tiny muted">{l.u}</div>
                        <div style={{ textAlign: "right" }} className="tnum">{fmt(l.p)}</div>
                        <div style={{ textAlign: "right", fontWeight: 500 }} className="tnum">{fmt(l.q * l.p)}</div>
                        <button onClick={() => setEditIdx(editIdx === i ? null : i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-5)", padding: 0 }}>{Icons.edit}</button>
                      </>
                    )}
                  </div>
                ))}
                <div style={{ padding: "10px 0", borderTop: "1px dashed var(--line-strong)" }}>
                  <button className="btn sm ghost" onClick={addLine}>{Icons.plus} Ajouter une ligne</button>
                </div>
              </div>

              <div style={{ padding: "18px 26px", background: "var(--bg-soft)", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ minWidth: 280, fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span className="muted">Sous-total HT</span><span className="tnum">{fmt(subtotalHT)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span className="muted">TVA 10 %</span><span className="tnum">{fmt(tva)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "1px solid var(--line-strong)", marginTop: 8, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
                    <span>Total TTC</span><span className="tnum">{fmt(totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="label" style={{ marginBottom: 12 }}>Indicateurs IA</div>
              {[
                { l: "Précision tarifaire", v: 96, sub: "Vs. 23 devis similaires" },
                { l: "Complétude lignes", v: 100, sub: "Tous les postes courants" },
                { l: "Conformité TVA", v: 100, sub: "Travaux entretien — 10 %" },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                    <span>{m.l}</span>
                    <span className="tnum" style={{ fontWeight: 600, color: "var(--violet-700)" }}>{m.v}%</span>
                  </div>
                  <div className="bar"><i style={{ width: m.v + "%" }} /></div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="label" style={{ marginBottom: 10 }}>Comparé à votre historique</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span className="muted">Devis moyen</span><span className="tnum">198,40 €</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span className="muted">Ce devis</span><span className="tnum" style={{ fontWeight: 600 }}>{fmt(totalTTC)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span className="muted">Taux d'acceptation estimé</span><span style={{ color: "var(--green-700)", fontWeight: 600 }}>87 %</span>
              </div>
            </div>

            <div className="ai-stripe" style={{ borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--violet-500)" }}>{Icons.sparkle}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Suggestion de l'IA</span>
              </div>
              <div className="tiny" style={{ color: "var(--ink-3)", lineHeight: 1.55 }}>
                Mme. Lefèvre est une cliente fidèle (3 interventions). Vous pouvez offrir le déplacement (-35 €) sans impact significatif sur la marge.
              </div>
              <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={applyDiscount}>Appliquer la remise</button>
            </div>

            <button className="btn brand" style={{ padding: "12px 14px", justifyContent: "center" }} onClick={handleSend}>
              {Icons.send} Envoyer le devis · {fmt(totalTTC)}
            </button>
            <button className="btn" style={{ justifyContent: "center" }} onClick={() => nav('/schedule')}>
              {Icons.calendar} + Proposer un créneau
            </button>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
