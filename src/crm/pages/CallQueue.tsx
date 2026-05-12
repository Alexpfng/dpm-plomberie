import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Badge } from "@/crm/components/ui/badge";
import { PhoneCall, Play, Filter, AlertCircle, Phone, Mail, Voicemail, CalendarCheck, TrendingUp, Users } from "lucide-react";
import { PRODUCT_STATUS_OPTIONS } from "@/crm/lib/productStatus";
import QuickAddProspect from "@/crm/components/QuickAddProspect";
import { listLocalProspects } from "@/crm/lib/localMode";

export default function CallQueue() {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dispersionFilter, setDispersionFilter] = useState("all");
  const [todayStats, setTodayStats] = useState({ calls: 0, voicemails: 0, rdv: 0, contacts: 0, rate: "0%" });

  useEffect(() => {
    supabase.from("campaigns").select("id, name").then(({ data }) => { if (data) setCampaigns(data); });
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Use call_qualification from call_sessions for accurate counts
    const { data: todayCalls } = await supabase.from("call_sessions").select("call_qualification").gte("started_at", todayStr + "T00:00:00");
    const { count: rdvCount } = await supabase.from("actions_log").select("*", { count: "exact", head: true }).eq("action_type", "status_change").gte("created_at", todayStr + "T00:00:00").contains("details", { to: "rdv_booke" });

    const calls = todayCalls?.length || 0;
    const voicemails = todayCalls?.filter((c: any) => c.call_qualification === "repondeur").length || 0;
    const contacts = todayCalls?.filter((c: any) => c.call_qualification === "contact_argumente").length || 0;
    const rdv = rdvCount || 0;
    const rate = calls > 0 ? `${Math.round((rdv / calls) * 100)}%` : "0%";
    setTodayStats({ calls, voicemails, rdv, contacts, rate });
  };

  useEffect(() => {
    const fetchQueue = async () => {
      const { data } = await supabase.from("prospects").select("*");
      const today = new Date().toISOString().split("T")[0];
      let merged = [...(data || []), ...listLocalProspects()];
      if (filter === "nouveaux") merged = merged.filter((p: any) => p.status === "nouveau");
      else if (filter === "rappels") merged = merged.filter((p: any) => p.status === "rappel" && (!p.next_followup || p.next_followup <= `${today}T23:59:59`));
      else if (filter === "potentiel") merged = merged.filter((p: any) => (p.score || 0) >= 15);
      else if (filter === "repondeurs") merged = merged.filter((p: any) => p.status === "repondeur");
      if (campaignFilter !== "all") merged = merged.filter((p: any) => p.campaign_id === campaignFilter);
      if (productFilter !== "all") merged = merged.filter((p: any) => p.product_status === productFilter);
      if (dispersionFilter === "high") merged = merged.filter((p: any) => (p.score_dispersion || 0) >= 4);
      else if (dispersionFilter === "medium") merged = merged.filter((p: any) => [2, 3].includes(p.score_dispersion || 0));
      else if (dispersionFilter === "low") merged = merged.filter((p: any) => (p.score_dispersion || 0) === 1);
      merged.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      setProspects(merged);
    };
    fetchQueue();
  }, [filter, campaignFilter, productFilter, dispersionFilter]);

  const startFlow = () => {
    if (prospects.length === 0) return;
    const ids = prospects.map((p) => p.id);
    navigate(`/crm/prospects/${ids[0]}?flow=1&queue=${encodeURIComponent(JSON.stringify(ids))}`);
  };

  const statCards = [
    { label: "Appels", value: todayStats.calls, icon: Phone, color: "text-primary" },
    { label: "Répondeurs", value: todayStats.voicemails, icon: Voicemail, color: "text-[hsl(var(--warning))]" },
    { label: "RDV", value: todayStats.rdv, icon: CalendarCheck, color: "text-[hsl(var(--success))]" },
    { label: "Contacts arg.", value: todayStats.contacts, icon: Users, color: "text-primary" },
    { label: "Taux", value: todayStats.rate, icon: TrendingUp, color: "text-[hsl(var(--success))]" },
  ];

  const statColors = [
    { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    { bg: 'rgba(234,88,12,0.1)', color: '#ea580c' },
    { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' },
    { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
    { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  ];

  return (
    <div className="crm-page">
      {/* Launch button + count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))' }}>
          {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} dans la file
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <QuickAddProspect onCreated={() => window.location.reload()} triggerVariant="outline" triggerSize="sm" />
          <Button onClick={startFlow} disabled={prospects.length === 0} style={{ gap: 8 }}>
            <Play className="h-4 w-4" />
            Démarrer le flow ({prospects.length})
          </Button>
        </div>
      </div>

      {/* Stats du jour */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {statCards.map((s, i) => (
          <div key={s.label} className="crm-stat-card" style={{ padding: '14px 16px', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="crm-stat-icon" style={{ width: 30, height: 30, borderRadius: 9, background: statColors[i].bg }}>
                <s.icon size={14} color={statColors[i].color} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.8)', border: '1px solid hsl(var(--crm-border))', borderRadius: '1rem' }}>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px] sm:w-[180px] h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="nouveaux">Nouveaux</SelectItem>
              <SelectItem value="rappels">Rappels aujourd'hui</SelectItem>
              <SelectItem value="repondeurs">Répondeurs</SelectItem>
              <SelectItem value="potentiel">Score ≥15</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[140px] sm:w-[200px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Campagne" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {PRODUCT_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dispersionFilter} onValueChange={setDispersionFilter}>
          <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Dispersion" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute dispersion</SelectItem>
            <SelectItem value="high">🔴 Gros bazar (4-5)</SelectItem>
            <SelectItem value="medium">🟡 Moyen (2-3)</SelectItem>
            <SelectItem value="low">🟢 Centralisé (1)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prospect cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {prospects.map((p, i) => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/crm/prospects/${p.id}`)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                <Badge variant="outline" className="text-[10px]">{p.status === "repondeur" ? "📞 Répondeur" : p.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="font-semibold text-sm sm:text-base truncate">{p.first_name} {p.last_name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{p.company || "—"} • {p.city || "—"}</p>
              <div className="flex items-center justify-between mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <span>🔥 {p.score || 0}</span>
                {p.next_followup && <span>📅 {new Date(p.next_followup).toLocaleDateString("fr-FR")}</span>}
              </div>
              {p.product_status === "compte_cree" && (
                <div className="flex items-center gap-1 mt-1 text-[hsl(var(--warning))] text-[10px] font-medium">
                  <AlertCircle className="h-3 w-3" />Compte créé – non activé
                </div>
              )}
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.phone) window.location.href = `tel:${p.phone}`;
                    navigate(`/crm/prospects/${p.id}`);
                  }}
                  disabled={!p.phone}
                >
                  <Phone className="h-3.5 w-3.5 mr-1" />Appeler
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.email) window.location.href = `mailto:${p.email}`;
                  }}
                  disabled={!p.email}
                >
                  <Mail className="h-3.5 w-3.5 mr-1" />Email
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {prospects.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">Aucun prospect avec ces filtres</p>
        )}
      </div>
    </div>
  );
}
