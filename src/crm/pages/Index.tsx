import { useEffect, useState } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Phone, CalendarCheck, Mail, TrendingUp, AlertTriangle, Clock, ChevronRight, Zap, Users } from "lucide-react";
import { Button } from "@/crm/components/ui/button";
import { useNavigate } from "react-router-dom";
import { listLocalProspects } from "@/crm/lib/localMode";

/* ── Stat card ── */
function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; sub?: string;
  icon: any; iconBg: string; iconColor: string;
}) {
  return (
    <div className="crm-stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="crm-stat-icon" style={{ background: iconBg }}>
          <Icon size={16} color={iconColor} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 1, color: 'hsl(var(--crm-foreground))' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'hsl(var(--crm-muted-foreground))', marginTop: 5 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Funnel stage ── */
function FunnelStage({ label, count, total, color }: { label: string; count: number; total: number; color: string; }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ flex: 1, padding: '16px 14px', borderRight: '1px solid hsl(var(--crm-border))', textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ marginTop: 8, height: 3, borderRadius: 999, background: 'hsl(var(--crm-border))' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, minWidth: pct > 0 ? 4 : 0, transition: 'width 500ms ease' }} />
      </div>
      <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 4 }}>{pct}%</div>
    </div>
  );
}

/* ── Reminder row ── */
function ReminderRow({ r, urgent, navigate }: { r: any; urgent?: boolean; navigate: any }) {
  const name = `${r.prospects?.first_name || ''} ${r.prospects?.last_name || ''}`.trim() || '—';
  const date = urgent ? r.reminder_date : r.reminder_time?.slice(0, 5);
  return (
    <div className="crm-row" onClick={() => navigate(`/crm/prospects/${r.prospect_id}`)}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: urgent ? 'rgba(220,38,38,0.1)' : 'rgba(43,107,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {urgent
          ? <AlertTriangle size={14} color="#dc2626" />
          : <Clock size={14} color="#2563eb" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--crm-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'hsl(var(--crm-muted-foreground))' }}>{r.reminder_type || 'Appel'}</div>
      </div>
      <span className={`crm-badge ${urgent ? 'red' : 'blue'}`}>{date}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ calls: 0, rdv: 0, emails: 0, rate: "0%" });
  const [overdueReminders, setOverdueReminders] = useState<any[]>([]);
  const [todayReminders, setTodayReminders] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [funnel, setFunnel] = useState({ total: 0, rdv: 0, comptes: 0, actifs: 0, payants: 0 });

  const today = new Date();
  const h = today.getHours();
  const greeting = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    const load = async () => {
      const todayStr = today.toISOString().split("T")[0];

      const [{ count: callCount }, { count: rdvCount }, { count: emailCount }] = await Promise.all([
        supabase.from("call_sessions").select("*", { count: "exact", head: true }).gte("started_at", todayStr + "T00:00:00"),
        supabase.from("actions_log").select("*", { count: "exact", head: true }).eq("action_type", "status_change").gte("created_at", todayStr + "T00:00:00").contains("details", { to: "rdv_booke" }),
        supabase.from("actions_log").select("*", { count: "exact", head: true }).eq("action_type", "email").gte("created_at", todayStr + "T00:00:00"),
      ]);

      const calls = callCount || 0, rdv = rdvCount || 0;
      setStats({ calls, rdv, emails: emailCount || 0, rate: calls > 0 ? `${Math.round((rdv / calls) * 100)}%` : "0%" });

      const { data: allProspects } = await supabase.from("prospects").select("product_status");
      const merged = [...(allProspects || []), ...listLocalProspects()];
      const f = { total: merged.length, rdv: 0, comptes: 0, actifs: 0, payants: 0 };
      merged.forEach((p: any) => {
        const ps = p.product_status;
        if (["rdv_booke","demo_faite","compte_cree","compte_active","user_actif","client_payant"].includes(ps)) f.rdv++;
        if (["compte_cree","compte_active","user_actif","client_payant"].includes(ps)) f.comptes++;
        if (["user_actif","client_payant"].includes(ps)) f.actifs++;
        if (ps === "client_payant") f.payants++;
      });
      setFunnel(f);

      const [{ data: overdue }, { data: todayR }, { data: camps }] = await Promise.all([
        supabase.from("reminders").select("*, prospects(first_name, last_name)").eq("completed", false).lt("reminder_date", todayStr).order("reminder_date").limit(6),
        supabase.from("reminders").select("*, prospects(first_name, last_name)").eq("completed", false).eq("reminder_date", todayStr).order("reminder_time").limit(6),
        supabase.from("campaigns").select("id, name, objective, status").eq("status", "active").limit(5),
      ]);
      if (overdue) setOverdueReminders(overdue);
      if (todayR) setTodayReminders(todayR);
      if (camps) setActiveCampaigns(camps);
    };
    load();
  }, []);

  const statCards = [
    { label: "Appels today", value: String(stats.calls), sub: "sessions enregistrées", icon: Phone,        iconBg: 'rgba(37,99,235,0.12)',  iconColor: '#2563eb' },
    { label: "RDV bookés",   value: String(stats.rdv),   sub: "depuis minuit",         icon: CalendarCheck, iconBg: 'rgba(22,163,74,0.12)',  iconColor: '#16a34a' },
    { label: "Emails envoyés",value: String(stats.emails),sub: "aujourd'hui",           icon: Mail,          iconBg: 'rgba(234,88,12,0.12)',  iconColor: '#ea580c' },
    { label: "Taux RDV",     value: stats.rate,          sub: "appel → rendez-vous",   icon: TrendingUp,    iconBg: 'rgba(111,76,224,0.12)', iconColor: '#7c3aed' },
  ];

  const allReminders = [...overdueReminders.map(r => ({ ...r, urgent: true })), ...todayReminders.map(r => ({ ...r, urgent: false }))];

  return (
    <div className="crm-page">

      {/* ── Greeting ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'hsl(var(--crm-foreground))' }}>
            {greeting}, David 👋
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(var(--crm-muted-foreground))', margin: '3px 0 0', textTransform: 'capitalize' }}>{dateStr}</p>
        </div>
        <Button onClick={() => navigate("/crm/call-queue")} style={{ gap: 8 }}>
          <Phone size={15} />
          Lancer les appels
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* ── Funnel ── */}
      <div className="crm-funnel">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid hsl(var(--crm-border))', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color="hsl(var(--crm-primary))" />
          <span style={{ fontSize: 12, fontWeight: 650, color: 'hsl(var(--crm-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline d'activation</span>
        </div>
        <div style={{ display: 'flex' }}>
          <FunnelStage label="Total"   count={funnel.total}   total={funnel.total}   color="#2563eb" />
          <FunnelStage label="RDV+"    count={funnel.rdv}     total={funnel.total}   color="#16a34a" />
          <FunnelStage label="Comptes" count={funnel.comptes} total={funnel.rdv}     color="#ea580c" />
          <FunnelStage label="Actifs"  count={funnel.actifs}  total={funnel.comptes} color="#7c3aed" />
          <div style={{ flex: 1, padding: '16px 14px', textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#0891b2' }}>{funnel.payants}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payants</div>
            <div style={{ marginTop: 8, height: 3, borderRadius: 999, background: 'hsl(var(--crm-border))' }}>
              <div style={{ height: '100%', width: `${funnel.actifs > 0 ? Math.round((funnel.payants / funnel.actifs) * 100) : 0}%`, borderRadius: 999, background: '#0891b2', minWidth: 0, transition: 'width 500ms ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#0891b2', fontWeight: 600, marginTop: 4 }}>
              {funnel.actifs > 0 ? `${Math.round((funnel.payants / funnel.actifs) * 100)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom 2 cols ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* Reminders */}
        <div className="crm-panel">
          <div className="crm-panel-header">
            <h3>
              <Clock size={14} color="#2563eb" />
              Relances à faire
              {(overdueReminders.length + todayReminders.length) > 0 && (
                <span className="crm-badge red" style={{ marginLeft: 4 }}>{overdueReminders.length + todayReminders.length}</span>
              )}
            </h3>
            <button onClick={() => navigate('/crm/call-queue')} style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          <div className="crm-panel-body">
            {allReminders.length === 0 ? (
              <div className="crm-empty">🎉 Aucune relance en attente</div>
            ) : (
              allReminders.slice(0, 8).map(r => (
                <ReminderRow key={r.id} r={r} urgent={r.urgent} navigate={navigate} />
              ))
            )}
          </div>
        </div>

        {/* Campaigns */}
        <div className="crm-panel">
          <div className="crm-panel-header">
            <h3>
              <Users size={14} color="#7c3aed" />
              Campagnes actives
            </h3>
            <button onClick={() => navigate('/crm/campaigns')} style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Gérer <ChevronRight size={12} />
            </button>
          </div>
          <div className="crm-panel-body">
            {activeCampaigns.length === 0 ? (
              <div className="crm-empty">
                <p>Aucune campagne active</p>
                <button
                  onClick={() => navigate('/crm/campaigns')}
                  style={{ marginTop: 10, padding: '6px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Créer une campagne
                </button>
              </div>
            ) : (
              activeCampaigns.map(c => (
                <div key={c.id} className="crm-row" onClick={() => navigate(`/crm/campaigns/${c.id}`)}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(124,58,237,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>🚀</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--crm-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--crm-muted-foreground))' }}>{c.objective || 'Pas d\'objectif'}</div>
                  </div>
                  <span className="crm-badge violet">Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
