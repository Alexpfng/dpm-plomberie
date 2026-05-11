import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Topbar, StatusPill, useToast } from '../components/Shared';
import { Icons } from '../components/Icons';
import { SAMPLE_REQUESTS } from '../data/sampleData';

const AI_SUGGESTION = "Bonjour, j'ai bien pris en compte votre demande. Notre technicien diagnostique une fuite au niveau du joint siphon. Nous pouvons intervenir dès aujourd'hui — je vous envoie un devis sous 2 minutes. Bonne journée !";

export default function DetailScreen() {
  const nav = useNavigate();
  const { id } = useParams();
  const r = SAMPLE_REQUESTS.find(r => r.id === id) || SAMPLE_REQUESTS[0];
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const [showToast, Toast] = useToast();

  const handleSend = () => {
    if (!reply.trim()) return;
    setSent(true);
    setReply('');
    showToast(`Réponse envoyée à ${r.client} via ${r.channel}`, 'success');
  };

  const handleSuggest = () => {
    setReply(AI_SUGGESTION);
    showToast('Suggestion IA chargée', 'info');
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar
          crumbs={["Boîte de réception", r.client + " · " + r.id]}
          right={
            <>
              <button className="btn" onClick={() => nav('/inbox')}>{Icons.back} Retour</button>
              <button className="btn" onClick={() => nav('/schedule')}>{Icons.calendar} Planifier</button>
              <button className="btn brand" onClick={() => nav('/quotes/new')}>{Icons.bolt} Générer le devis</button>
            </>
          }
        />
        <div className="page-content" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: r.color, color: r.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 16 }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.01em" }}>{r.client}</h2>
                    <span className="mono tiny muted">{r.id}</span>
                    <StatusPill status={r.status} />
                    {r.urgent && <span className="pill urgent"><span className="dot" />Urgent</span>}
                  </div>
                  <div style={{ marginTop: 6, color: "var(--ink-3)", fontSize: 13.5, display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.pin}{r.address}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.phone}+33 6 12 34 56 78</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Icons.mail}client@example.fr</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="label" style={{ marginBottom: 14 }}>Demande client · {r.channel}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flex: "none", background: r.color, color: r.fg, display: "grid", placeItems: "center", fontWeight: 600, fontSize: 11 }}>{r.initials}</div>
                <div style={{ flex: 1, background: "var(--bg-soft)", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
                    Bonjour, j'ai une fuite sous mon évier de cuisine depuis ce matin. Ça coule en continu et j'ai dû mettre un seau. Est-ce que vous pouvez passer aujourd'hui ? J'ai mis une photo, on voit bien d'où ça vient je crois.
                  </div>
                  <div className="tiny muted" style={{ marginTop: 8 }}>{r.received} · {r.channel}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginLeft: 44 }}>
                <div className="ph" style={{ aspectRatio: "4/3" }}>photo · siphon</div>
                <div className="ph" style={{ aspectRatio: "4/3" }}>photo · sous évier</div>
                <div className="ph" style={{ aspectRatio: "4/3" }}>photo · seau</div>
              </div>

              {sent && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--green-50)", border: "1px solid #c7f0d8", borderRadius: 10, fontSize: 13, color: "var(--green-700)", display: 'flex', alignItems: 'center', gap: 8 }}>
                  {Icons.check} Message envoyé à {r.client}
                </div>
              )}

              <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={"Répondre à " + r.client + "…"}
                  style={{ flex: 1, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5, outline: "none", background: "var(--bg-softer)" }}
                />
                <button className="btn ghost" title="Suggestion IA" onClick={handleSuggest}>{Icons.sparkle}</button>
                <button className="btn primary" onClick={handleSend}>{Icons.send} Envoyer</button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
            <div className="card ai-stripe" style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6f4ce0,#2b6bff)", display: "grid", placeItems: "center", color: "#fff" }}>{Icons.sparkle}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.005em" }}>Analyse de l'assistant IA</div>
                  <div className="tiny muted">Analysée en 8 s · 3 photos · 1 message</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 6 }}>Problème détecté</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>{r.aiIssue}</div>
                <div className="tiny" style={{ marginTop: 4, color: "var(--ink-3)" }}>
                  Confiance : <span className="ai-grad" style={{ fontWeight: 600 }}>{r.aiConfidence} %</span>
                  <span style={{ margin: "0 6px", color: "var(--ink-5)" }}>·</span>
                  Vue 47 fois sur les 12 derniers mois
                </div>
                <div className="bar" style={{ marginTop: 8 }}><i style={{ width: r.aiConfidence + "%" }} /></div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 8 }}>Actions suggérées</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { ic: Icons.tool, t: "Remplacer joint torique 32 mm", c: "Pièce courante en stock" },
                    { ic: Icons.tool, t: "Vérifier raccord PVC siphon", c: "5 min sur place" },
                    { ic: Icons.shieldCheck, t: "Test étanchéité 10 min", c: "Garantie 6 mois" },
                  ].map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "#fff", border: "1px solid var(--line-soft)", borderRadius: 10 }}>
                      <span style={{ color: "var(--brand-500)", marginTop: 1 }}>{a.ic}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.t}</div>
                        <div className="tiny muted">{a.c}</div>
                      </div>
                      <span style={{ color: "var(--ink-5)" }}>{Icons.check}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid var(--line-soft)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="label" style={{ padding: 0 }}>Coût estimé</span>
                  <span className="pill ai" style={{ fontSize: 10.5 }}>basé sur 23 interventions</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <div className="tnum" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{r.estimate}</div>
                  <div className="tiny muted">TTC · 45 min sur place</div>
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
                  <span>Pièces ~ 18 €</span>
                  <span>Main d'œuvre ~ 165 €</span>
                  <span>Déplacement ~ 35 €</span>
                </div>
              </div>

              <button className="btn brand" style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }} onClick={() => nav('/quotes/new')}>
                {Icons.bolt} Générer le devis maintenant
              </button>
              <button className="btn ghost" style={{ width: "100%", justifyContent: "center", marginTop: 6, padding: "8px 14px" }} onClick={() => nav('/schedule')}>
                {Icons.calendar} Proposer un créneau au client
              </button>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="label" style={{ marginBottom: 10 }}>Client</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12.5 }}>
                <div><div className="muted tiny">Interventions</div><div style={{ fontWeight: 600, fontSize: 15 }} className="tnum">3</div></div>
                <div><div className="muted tiny">Total facturé</div><div style={{ fontWeight: 600, fontSize: 15 }} className="tnum">487 €</div></div>
                <div><div className="muted tiny">Dernière visite</div><div style={{ fontWeight: 500 }}>Sept. 2025</div></div>
                <div><div className="muted tiny">Satisfaction</div><div style={{ fontWeight: 600, color: "var(--green-700)" }}>★ 5,0</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {Toast}
    </div>
  );
}
