import { useState, useEffect } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Progress } from "@/crm/components/ui/progress";
import { Badge } from "@/crm/components/ui/badge";
import { Send, Loader2, Users, Clock, Phone, UserPlus } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";

interface Suggestion {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prospectIds: string[];
  color: string;
}

export default function EmailSuggestions() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [templatesRes, campaignsRes] = await Promise.all([
      supabase.from("email_templates").select("id, subject").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, name"),
    ]);

    setTemplates(templatesRes.data || []);
    setCampaigns(campaignsRes.data || []);

    // Compute suggestions
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [prospectsRes, actionsRes, callsRes] = await Promise.all([
      supabase.from("prospects").select("id, first_name, last_name, email, status, created_at")
        .not("email", "is", null).neq("email", ""),
      supabase.from("actions_log").select("prospect_id, action_type, created_at")
        .eq("action_type", "email_sent"),
      supabase.from("call_sessions").select("prospect_id, ended_at, call_qualification")
        .eq("call_qualification", "contact_argumente")
        .gte("ended_at", sevenDaysAgo),
    ]);

    const prospects = prospectsRes.data || [];
    const actions = actionsRes.data || [];
    const calls = callsRes.data || [];

    // Build email history map
    const emailHistory = new Map<string, Date>();
    for (const a of actions) {
      const existing = emailHistory.get(a.prospect_id);
      const d = new Date(a.created_at);
      if (!existing || d > existing) emailHistory.set(a.prospect_id, d);
    }

    const emailedIds = new Set(actions.map(a => a.prospect_id));

    // 1. New prospects never emailed
    const newNoEmail = prospects.filter(p => !emailedIds.has(p.id));

    // 2. Emailed 3+ days ago, no recent email
    const noResponse3d = prospects.filter(p => {
      const lastEmail = emailHistory.get(p.id);
      if (!lastEmail) return false;
      return lastEmail < new Date(threeDaysAgo);
    });

    // 3. Still nouveau/a_rappeler, emailed 7+ days ago
    const relance7d = prospects.filter(p => {
      const lastEmail = emailHistory.get(p.id);
      if (!lastEmail) return false;
      return lastEmail < new Date(sevenDaysAgo) && ["nouveau", "a_rappeler"].includes(p.status);
    });

    // 4. Post-call without follow-up email
    const calledIds = new Set(calls.map(c => c.prospect_id));
    const postCall = prospects.filter(p => {
      if (!calledIds.has(p.id)) return false;
      const lastEmail = emailHistory.get(p.id);
      const call = calls.find(c => c.prospect_id === p.id);
      if (!call) return false;
      return !lastEmail || lastEmail < new Date(call.ended_at);
    });

    const newSuggestions: Suggestion[] = [];
    if (newNoEmail.length > 0) {
      newSuggestions.push({
        key: "new_no_email",
        icon: <UserPlus className="h-5 w-5" />,
        title: `${newNoEmail.length} nouveau(x) prospect(s) sans email`,
        description: "Ces prospects n'ont jamais reçu d'email. Envoyez un premier contact.",
        prospectIds: newNoEmail.map(p => p.id),
        color: "bg-blue-50 border-blue-200",
      });
    }
    if (noResponse3d.length > 0) {
      newSuggestions.push({
        key: "no_response_3d",
        icon: <Clock className="h-5 w-5" />,
        title: `${noResponse3d.length} prospect(s) sans réponse (3j+)`,
        description: "Dernier email envoyé il y a plus de 3 jours sans changement de statut.",
        prospectIds: noResponse3d.map(p => p.id),
        color: "bg-yellow-50 border-yellow-200",
      });
    }
    if (relance7d.length > 0) {
      newSuggestions.push({
        key: "relance_7d",
        icon: <Users className="h-5 w-5" />,
        title: `${relance7d.length} prospect(s) à relancer (7j+)`,
        description: "Toujours en statut nouveau/à rappeler, dernier email il y a 7+ jours.",
        prospectIds: relance7d.map(p => p.id),
        color: "bg-orange-50 border-orange-200",
      });
    }
    if (postCall.length > 0) {
      newSuggestions.push({
        key: "post_call",
        icon: <Phone className="h-5 w-5" />,
        title: `${postCall.length} prospect(s) post-appel sans suivi`,
        description: "Appel argumenté récent sans email de suivi.",
        prospectIds: postCall.map(p => p.id),
        color: "bg-emerald-50 border-emerald-200",
      });
    }

    setSuggestions(newSuggestions);
    setLoading(false);
  };

  const handleSend = async (suggestion: Suggestion) => {
    const templateId = selectedTemplates[suggestion.key];
    if (!templateId) {
      toast({ title: "Sélectionnez un template", variant: "destructive" });
      return;
    }

    setSending(suggestion.key);
    setSendProgress(0);

    const batchSize = 10;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < suggestion.prospectIds.length; i += batchSize) {
      const batch = suggestion.prospectIds.slice(i, i + batchSize);
      try {
        const { data, error } = await supabase.functions.invoke("send-gmail-email", {
          body: { prospect_ids: batch, template_id: templateId },
        });
        if (error || !data?.ok) {
          totalFailed += batch.length;
        } else {
          totalSent += data?.sent || 0;
          totalFailed += (data?.total || 0) - (data?.sent || 0);
        }
      } catch {
        totalFailed += batch.length;
      }
      setSendProgress(Math.round(((i + batch.length) / suggestion.prospectIds.length) * 100));
    }

    setSending(null);
    toast({
      title: "Envoi terminé",
      description: `${totalSent} envoyé(s), ${totalFailed} échec(s)`,
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucune suggestion pour le moment</p>
        <p className="text-sm">Toutes vos actions email sont à jour !</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {suggestions.map((s) => (
        <Card key={s.key} className={`border ${s.color}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {s.icon}
              <CardTitle className="text-base">{s.title}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedTemplates[s.key] || ""}
              onValueChange={(v) => setSelectedTemplates((prev) => ({ ...prev, [s.key]: v }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choisir un template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sending === s.key && (
              <div className="space-y-1">
                <Progress value={sendProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{sendProgress}%</p>
              </div>
            )}

            <Button
              onClick={() => handleSend(s)}
              disabled={sending !== null || !selectedTemplates[s.key]}
              className="w-full"
              size="sm"
            >
              {sending === s.key ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi en cours...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Envoyer à {s.prospectIds.length} prospect(s)</>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
