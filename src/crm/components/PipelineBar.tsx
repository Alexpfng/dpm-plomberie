import { useEffect, useState } from "react";
import { supabase } from "@/crm/integrations/supabase/client";

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospects", color: "bg-blue-500" },
  { key: "rdv_booke", label: "RDV", color: "bg-yellow-500" },
  { key: "compte_cree", label: "Compte", color: "bg-emerald-400" },
  { key: "user_actif", label: "Actif", color: "bg-green-600" },
  { key: "client_payant", label: "Payant", color: "bg-purple-500" },
  { key: "lost", label: "Perdu", color: "bg-red-500" },
];

const LOST_STATUSES = ["client_churn", "refus_definitif", "user_inactif"];

export default function PipelineBar() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("prospects").select("product_status");
      if (!data) return;
      const c: Record<string, number> = {};
      PIPELINE_STAGES.forEach((s) => (c[s.key] = 0));
      data.forEach((p: any) => {
        const ps = p.product_status || "prospect";
        if (LOST_STATUSES.includes(ps)) c["lost"] = (c["lost"] || 0) + 1;
        else if (c[ps] !== undefined) c[ps]++;
        else if (["demo_faite", "compte_active"].includes(ps)) {
          if (ps === "demo_faite") c["rdv_booke"]++;
          if (ps === "compte_active") c["compte_cree"]++;
        } else c["prospect"]++;
      });
      setCounts(c);
    };
    fetch();
  }, []);

  return (
    <div className="flex gap-1 w-full overflow-x-auto">
      {PIPELINE_STAGES.map((stage, i) => {
        const count = counts[stage.key] || 0;
        const prev = i > 0 ? counts[PIPELINE_STAGES[i - 1].key] || 0 : 0;
        const convRate = i > 0 && prev > 0 ? Math.round((count / prev) * 100) : null;

        return (
          <div key={stage.key} className="flex-1 min-w-[52px] text-center">
            <div className={`${stage.color} text-white rounded-md py-1.5 sm:py-2 px-1`}>
              <p className="text-base sm:text-lg font-bold">{count}</p>
              <p className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wide opacity-90 truncate">{stage.label}</p>
            </div>
            {convRate !== null && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{convRate}%</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
