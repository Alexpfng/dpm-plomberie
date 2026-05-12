import { useState, useEffect } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Button } from "@/crm/components/ui/button";
import { Download, BarChart3, Mail, Users, TrendingUp, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, ComposedChart } from "recharts";

const QUALIFICATION_LABELS: Record<string, string> = {
  repondeur: "📞 Répondeur",
  contact_argumente: "💬 Contact argumenté",
  non_joignable: "❌ Non joignable",
  faux_numero: "🚫 Faux numéro",
  rappel_demande: "🔄 Rappel demandé",
  "": "Non qualifié",
};

const QUAL_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(262, 83%, 58%)", "hsl(200, 18%, 46%)"];
const TEMPLATE_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(0, 72%, 51%)", "hsl(200, 18%, 46%)", "hsl(330, 70%, 50%)"];

export default function Analytics() {
  const [callsByDay, setCallsByDay] = useState<any[]>([]);
  const [callsByHour, setCallsByHour] = useState<any[]>([]);
  const [scriptStats, setScriptStats] = useState<any[]>([]);
  const [qualificationStats, setQualificationStats] = useState<any[]>([]);
  const [dailyQualStats, setDailyQualStats] = useState<any[]>([]);
  const [emailsByDay, setEmailsByDay] = useState<any[]>([]);
  const [emailKpis, setEmailKpis] = useState({ total: 0, avgPerDay: 0, uniqueProspects: 0, coverageRate: 0 });
  const [emailByTemplate, setEmailByTemplate] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [period, setPeriod] = useState("7");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("campaigns").select("id, name").then(({ data }) => { if (data) setCampaigns(data); });
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      const since = daysAgo.toISOString();

      // Calls by day
      let callQuery = supabase.from("call_sessions").select("*").gte("started_at", since);
      const { data: calls } = await callQuery;

      if (calls) {
        const byDay: Record<string, { calls: number; rdv: number; repondeur: number; contact_argumente: number }> = {};
        calls.forEach((c) => {
          const day = new Date(c.started_at).toLocaleDateString("fr-FR");
          if (!byDay[day]) byDay[day] = { calls: 0, rdv: 0, repondeur: 0, contact_argumente: 0 };
          byDay[day].calls++;
          if (c.call_qualification === "repondeur") byDay[day].repondeur++;
          if (c.call_qualification === "contact_argumente") byDay[day].contact_argumente++;
        });

        const { data: rdvLogs } = await supabase.from("actions_log")
          .select("*")
          .eq("action_type", "status_change")
          .gte("created_at", since)
          .contains("details", { to: "rdv_booke" });

        rdvLogs?.forEach((r) => {
          const day = new Date(r.created_at).toLocaleDateString("fr-FR");
          if (!byDay[day]) byDay[day] = { calls: 0, rdv: 0, repondeur: 0, contact_argumente: 0 };
          byDay[day].rdv++;
        });

        setCallsByDay(Object.entries(byDay).map(([day, v]) => ({
          day, ...v,
          taux: v.calls > 0 ? Math.round((v.rdv / v.calls) * 100) : 0
        })));

        setDailyQualStats(Object.entries(byDay).map(([day, v]) => ({
          day, repondeur: v.repondeur, contact_argumente: v.contact_argumente,
          autres: v.calls - v.repondeur - v.contact_argumente,
        })));

        const byHour: Record<number, number> = {};
        for (let i = 7; i <= 20; i++) byHour[i] = 0;
        calls.forEach((c) => {
          const h = new Date(c.started_at).getHours();
          if (byHour[h] !== undefined) byHour[h]++;
        });
        setCallsByHour(Object.entries(byHour).map(([h, count]) => ({ hour: `${h}h`, count })));

        const qualCounts: Record<string, number> = {};
        calls.forEach((c) => {
          const q = c.call_qualification || "";
          qualCounts[q] = (qualCounts[q] || 0) + 1;
        });
        setQualificationStats(Object.entries(qualCounts).map(([key, value]) => ({
          name: QUALIFICATION_LABELS[key] || key || "Non qualifié",
          value,
        })));
      }

      // Email stats (enriched)
      const { data: allEmailLogs } = await supabase.from("actions_log")
        .select("created_at, prospect_id, details")
        .eq("action_type", "email_sent")
        .gte("created_at", since);

      const { data: templates } = await supabase.from("email_templates").select("id, subject");
      const templateMap: Record<string, string> = {};
      templates?.forEach((t) => { templateMap[t.id] = t.subject; });

      if (allEmailLogs) {
        setEmailLogs(allEmailLogs);

        // Emails by day with cumulative
        const emailByDay: Record<string, number> = {};
        allEmailLogs.forEach((e) => {
          const day = new Date(e.created_at).toLocaleDateString("fr-FR");
          emailByDay[day] = (emailByDay[day] || 0) + 1;
        });
        let cumul = 0;
        const emailDayData = Object.entries(emailByDay).map(([day, count]) => {
          cumul += count;
          return { day, emails: count, cumul };
        });
        setEmailsByDay(emailDayData);

        // KPIs
        const uniqueProspects = new Set(allEmailLogs.map((e) => e.prospect_id)).size;
        const daysCount = parseInt(period);
        const { count: prospectsWithEmail } = await supabase.from("prospects").select("id", { count: "exact", head: true }).not("email", "is", null).neq("email", "");
        const coverageRate = prospectsWithEmail && prospectsWithEmail > 0 ? Math.round((uniqueProspects / prospectsWithEmail) * 100) : 0;

        setEmailKpis({
          total: allEmailLogs.length,
          avgPerDay: daysCount > 0 ? Math.round((allEmailLogs.length / daysCount) * 10) / 10 : 0,
          uniqueProspects,
          coverageRate,
        });

        // By template
        const byTpl: Record<string, number> = {};
        allEmailLogs.forEach((e) => {
          const d = e.details as any;
          const tplId = d?.template_id || "unknown";
          const name = templateMap[tplId] || "Sans template";
          byTpl[name] = (byTpl[name] || 0) + 1;
        });
        setEmailByTemplate(Object.entries(byTpl).map(([name, value]) => ({ name, value })));
      }

      // Script performance
      const { data: sessions } = await supabase.from("call_sessions").select("script_id, duration_seconds, outcome, call_qualification").gte("started_at", since).not("script_id", "is", null);
      const { data: scripts } = await supabase.from("scripts").select("id, title");
      if (sessions && scripts) {
        const byScript: Record<string, { title: string; calls: number; totalDuration: number; repondeur: number; contact_argumente: number }> = {};
        scripts.forEach((s) => { byScript[s.id] = { title: s.title, calls: 0, totalDuration: 0, repondeur: 0, contact_argumente: 0 }; });
        sessions.forEach((s: any) => {
          if (byScript[s.script_id]) {
            byScript[s.script_id].calls++;
            byScript[s.script_id].totalDuration += s.duration_seconds || 0;
            if (s.call_qualification === "repondeur") byScript[s.script_id].repondeur++;
            if (s.call_qualification === "contact_argumente") byScript[s.script_id].contact_argumente++;
          }
        });
        setScriptStats(Object.values(byScript).filter((s) => s.calls > 0).map((s) => ({
          ...s, avgDuration: s.calls > 0 ? Math.round(s.totalDuration / s.calls) : 0,
        })));
      }
    };
    fetchAnalytics();
  }, [period, campaignFilter]);

  const exportCSV = async (type: string) => {
    let csvContent = "";
    if (type === "prospects") {
      const { data } = await supabase.from("prospects").select("*");
      if (!data) return;
      const headers = ["Prénom", "Nom", "Société", "Téléphone", "Email", "Ville", "Spécialité", "Statut", "Score", "Intérêt", "Tentatives", "Appels", "Dernier contact"];
      csvContent = headers.join(";") + "\n";
      data.forEach((p) => {
        csvContent += [p.first_name, p.last_name, p.company, p.phone, p.email, p.city, p.specialty, p.status, p.score, p.interest_level, p.total_attempts, p.total_calls, p.last_contact].join(";") + "\n";
      });
    } else if (type === "activation") {
      const { data } = await supabase.from("prospects").select("*, companies(raison_sociale)");
      if (!data) return;
      const headers = ["Nom", "Société", "Statut Produit", "Date compte créé", "Dernière activité", "Nb devis", "Nb clients", "Score"];
      csvContent = headers.join(";") + "\n";
      data.forEach((p: any) => {
        csvContent += [
          `${p.first_name} ${p.last_name}`, p.companies?.raison_sociale || p.company || "",
          p.product_status, p.date_compte_cree ? new Date(p.date_compte_cree).toLocaleDateString("fr-FR") : "",
          p.date_derniere_activite ? new Date(p.date_derniere_activite).toLocaleDateString("fr-FR") : "",
          p.nb_devis_crees || 0, p.nb_clients_crees || 0, p.score || 0
        ].join(";") + "\n";
      });
    } else if (type === "daily") {
      csvContent = callsByDay.map((d) => `${d.day};${d.calls};${d.repondeur};${d.contact_argumente};${d.rdv};${d.taux}%`).join("\n");
      csvContent = "Jour;Appels;Répondeurs;Contacts Arg.;RDV;Taux\n" + csvContent;
    } else if (type === "emails") {
      const { data: templates } = await supabase.from("email_templates").select("id, subject");
      const tplMap: Record<string, string> = {};
      templates?.forEach((t) => { tplMap[t.id] = t.subject; });
      const headers = ["Date", "Prospect ID", "Template", "Sujet"];
      csvContent = headers.join(";") + "\n";
      emailLogs.forEach((e) => {
        const d = e.details as any;
        const tplId = d?.template_id || "";
        csvContent += [
          new Date(e.created_at).toLocaleDateString("fr-FR"),
          e.prospect_id,
          tplMap[tplId] || tplId,
          tplMap[tplId] || "N/A"
        ].join(";") + "\n";
      });
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulbiz_${type}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance détaillée</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportCSV("daily")}><Download className="mr-1 h-4 w-4" />Stats</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("prospects")}><Download className="mr-1 h-4 w-4" />Prospects</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("activation")}><Download className="mr-1 h-4 w-4" />Activation</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("emails")}><Download className="mr-1 h-4 w-4" />Emails</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] sm:w-[150px] h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="14">14 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Toutes campagnes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes campagnes</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Email KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><Mail className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Emails envoyés</p>
              <p className="text-xl font-bold">{emailKpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><TrendingUp className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Moy. / jour</p>
              <p className="text-xl font-bold">{emailKpis.avgPerDay}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Prospects contactés</p>
              <p className="text-xl font-bold">{emailKpis.uniqueProspects}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><Percent className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Taux couverture</p>
              <p className="text-xl font-bold">{emailKpis.coverageRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calls & RDV by day */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Appels, RDV & Qualification / jour</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="calls" name="Appels" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repondeur" name="Répondeurs" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contact_argumente" name="Contacts arg." fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rdv" name="RDV" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Qualification pie chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Répartition des qualifications</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            {qualificationStats.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={qualificationStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {qualificationStats.map((_, i) => <Cell key={i} fill={QUAL_COLORS[i % QUAL_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Conversion rate */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Taux de conversion</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="taux" name="Taux %" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répondeur vs Contact argumenté par jour */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Répondeur vs Contact argumenté</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyQualStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="repondeur" name="Répondeur" fill="hsl(38, 92%, 50%)" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="contact_argumente" name="Contact arg." fill="hsl(262, 83%, 58%)" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="autres" name="Autres" fill="hsl(200, 18%, 46%)" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calls by hour */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Appels par heure</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Appels" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emails sent per day with cumulative line */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Emails envoyés / jour</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            {emailsByDay.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Aucun email envoyé</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={emailsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="emails" name="Emails / jour" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumul" name="Cumul" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Emails by template */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Emails par template</CardTitle></CardHeader>
          <CardContent className="h-[280px] sm:h-[300px]">
            {emailByTemplate.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={emailByTemplate} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.substring(0, 20)}${name.length > 20 ? "…" : ""} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {emailByTemplate.map((_, i) => <Cell key={i} fill={TEMPLATE_COLORS[i % TEMPLATE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Script performance with qualification */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-lg">Performance par script</CardTitle></CardHeader>
          <CardContent>
            {scriptStats.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {scriptStats.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{s.title}</span>
                      <span className="text-xs text-muted-foreground">{s.calls} appels</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Moy: {Math.floor(s.avgDuration / 60)}:{(s.avgDuration % 60).toString().padStart(2, "0")}</span>
                      <span>📞 Rép: {s.repondeur}</span>
                      <span>💬 Contact: {s.contact_argumente}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
