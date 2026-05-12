import { useState, useEffect } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/crm/components/ui/dialog";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Switch } from "@/crm/components/ui/switch";
import { Badge } from "@/crm/components/ui/badge";
import { Plus, Trash2, Edit, Loader2, Zap } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";

const TRIGGER_OPTIONS = [
  { value: "nouveau_prospect", label: "Nouveau prospect", description: "Prospect créé il y a X jours, jamais contacté par email" },
  { value: "sans_reponse_j3", label: "Sans réponse (3j)", description: "Dernier email il y a 3+ jours, pas de changement" },
  { value: "relance_j7", label: "Relance (7j)", description: "Dernier email il y a 7+ jours, toujours nouveau/à rappeler" },
  { value: "post_appel", label: "Post-appel", description: "Appel argumenté il y a X jours, pas d'email envoyé après" },
];

export default function EmailAutomations() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [triggerType, setTriggerType] = useState("nouveau_prospect");
  const [templateId, setTemplateId] = useState("");
  const [delayDays, setDelayDays] = useState(0);
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterMinScore, setFilterMinScore] = useState("");
  const { toast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    const [autoRes, templRes, campRes] = await Promise.all([
      supabase.from("email_automations").select("*, email_templates(subject)").order("created_at", { ascending: false }),
      supabase.from("email_templates").select("id, subject").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, name"),
    ]);
    setAutomations(autoRes.data || []);
    setTemplates(templRes.data || []);
    setCampaigns(campRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setEditId(null);
    setTriggerType("nouveau_prospect");
    setTemplateId("");
    setDelayDays(0);
    setFilterCampaign("all");
    setFilterMinScore("");
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !templateId) return;

    const filters: any = {};
    if (filterCampaign !== "all") filters.campaign_id = filterCampaign;
    if (filterMinScore) filters.min_score = parseInt(filterMinScore);

    if (editId) {
      await supabase.from("email_automations").update({
        trigger_type: triggerType,
        template_id: templateId,
        delay_days: delayDays,
        filters,
      }).eq("id", editId);
      toast({ title: "Automatisation modifiée" });
    } else {
      await supabase.from("email_automations").insert({
        owner_id: user.id,
        trigger_type: triggerType,
        template_id: templateId,
        delay_days: delayDays,
        filters,
      });
      toast({ title: "Automatisation créée" });
    }
    setOpen(false);
    resetForm();
    fetchAll();
  };

  const handleEdit = (a: any) => {
    setEditId(a.id);
    setTriggerType(a.trigger_type);
    setTemplateId(a.template_id);
    setDelayDays(a.delay_days);
    const f = a.filters || {};
    setFilterCampaign(f.campaign_id || "all");
    setFilterMinScore(f.min_score?.toString() || "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_automations").delete().eq("id", id);
    toast({ title: "Automatisation supprimée" });
    fetchAll();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from("email_automations").update({ enabled }).eq("id", id);
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
  };

  const getTriggerLabel = (t: string) => TRIGGER_OPTIONS.find(o => o.value === t)?.label || t;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle automatisation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Modifier" : "Créer"} une automatisation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Déclencheur</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {TRIGGER_OPTIONS.find(o => o.value === triggerType)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Template email</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(triggerType === "nouveau_prospect" || triggerType === "post_appel") && (
                <div className="space-y-2">
                  <Label>Délai (jours)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={delayDays}
                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Filtrer par campagne</Label>
                <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {campaigns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Score minimum</Label>
                <Input
                  type="number"
                  placeholder="Aucun"
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(e.target.value)}
                />
              </div>

              <Button onClick={handleSave} disabled={!templateId} className="w-full">
                {editId ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucune automatisation</p>
          <p className="text-sm">Créez des règles pour envoyer automatiquement des emails.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${a.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    <CardTitle className="text-base">{getTriggerLabel(a.trigger_type)}</CardTitle>
                  </div>
                  <Switch
                    checked={a.enabled}
                    onCheckedChange={(v) => handleToggle(a.id, v)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  Template : <span className="font-medium">{a.email_templates?.subject || "—"}</span>
                </p>
                {a.delay_days > 0 && (
                  <p className="text-sm text-muted-foreground">Délai : {a.delay_days} jour(s)</p>
                )}
                {a.filters?.campaign_id && (
                  <Badge variant="outline" className="text-xs">Campagne filtrée</Badge>
                )}
                {a.filters?.min_score && (
                  <Badge variant="outline" className="text-xs">Score min: {a.filters.min_score}</Badge>
                )}
                <div className="flex gap-1 pt-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(a)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
