import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Badge } from "@/crm/components/ui/badge";
import { Zap } from "lucide-react";

interface ScoreBreakdownProps {
  prospect: any;
  company?: any;
}

interface ScoreLine {
  label: string;
  points: number;
  maxPoints: number;
  active: boolean;
}

export function computeScoreBreakdown(prospect: any, company?: any): { lines: ScoreLine[]; total: number } {
  const lines: ScoreLine[] = [];

  // 1. NAF code bonus
  const naf = company?.code_naf || "";
  const nafActive = naf.startsWith("41") || naf.startsWith("43");
  lines.push({ label: "Code NAF (41/43)", points: nafActive ? 10 : 0, maxPoints: 10, active: nafActive });

  // 2. Company age
  const dateCreation = company?.date_creation;
  let agePoints = 0;
  if (dateCreation) {
    const age = (Date.now() - new Date(dateCreation).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age >= 2) agePoints = 10;
  }
  lines.push({ label: "Ancienneté ≥ 2 ans", points: agePoints, maxPoints: 10, active: agePoints > 0 });

  // 3. Product status
  const ps = prospect.product_status || "prospect";
  let psPoints = 0;
  if (ps === "rdv_booke") psPoints = 20;
  else if (ps === "demo_faite") psPoints = 25;
  else if (ps === "compte_cree") psPoints = 30;
  else if (ps === "compte_active") psPoints = 40;
  else if (ps === "user_actif") psPoints = 50;
  else if (ps === "client_payant") psPoints = 60;
  lines.push({ label: `Statut produit (${ps.replace(/_/g, " ")})`, points: psPoints, maxPoints: 60, active: psPoints > 0 });

  // 4. Score de dispersion
  const disp = prospect.score_dispersion || 0;
  const dispPoints = disp * 5;
  lines.push({ label: `Dispersion (${disp}/5)`, points: dispPoints, maxPoints: 25, active: dispPoints > 0 });

  // 5. Volume hebdo (chantiers > 5)
  const chantiers = prospect.nb_chantiers_semaine || 0;
  const volActive = chantiers > 5;
  lines.push({ label: "Chantiers/sem > 5", points: volActive ? 15 : 0, maxPoints: 15, active: volActive });

  // 6. Structure entreprise
  const struct = prospect.structure_entreprise || "";
  const structActive = ["4-7", "8+", "avec_conducteur"].includes(struct);
  lines.push({ label: `Structure (${struct || "—"})`, points: structActive ? 10 : 0, maxPoints: 10, active: structActive });

  // 7. Temps admin/jour
  const temps = prospect.temps_admin_jour || "";
  const tempsActive = ["1h_2h", "2h_plus"].includes(temps);
  lines.push({ label: `Temps admin (${temps || "—"})`, points: tempsActive ? 15 : 0, maxPoints: 15, active: tempsActive });

  // 8. Call behavior
  const calls = prospect.total_calls || 0;
  const callPoints = Math.min(calls * 2, 10);
  lines.push({ label: `Appels passés (${calls})`, points: callPoints, maxPoints: 10, active: callPoints > 0 });

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { lines, total };
}

export default function ScoreBreakdown({ prospect, company }: ScoreBreakdownProps) {
  const { lines, total } = computeScoreBreakdown(prospect, company);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />Score détaillé
          <Badge variant="default" className="ml-auto text-xs">{total} pts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className={line.active ? "text-foreground" : "text-muted-foreground"}>
              {line.active ? "✅" : "⬜"} {line.label}
            </span>
            <span className={line.active ? "font-semibold text-foreground" : "text-muted-foreground"}>
              +{line.points}/{line.maxPoints}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
