import { useState, useEffect } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Button } from "@/crm/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/crm/components/ui/dialog";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Textarea } from "@/crm/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Progress } from "@/crm/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/crm/components/ui/tabs";
import { Plus, Trash2, Edit, Send, Loader2, Mail, Lightbulb, Zap } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import EmailSuggestions from "@/crm/components/email/EmailSuggestions";
import EmailAutomations from "@/crm/components/email/EmailAutomations";

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();

  // Send dialog state
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState<string | null>(null);
  const [sendTemplate, setSendTemplate] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [prospectsWithEmail, setProspectsWithEmail] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<{ sent: number; failed: number } | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data);
  };

  useEffect(() => {
    fetchTemplates();
    supabase.from("campaigns").select("id, name").then(({ data }) => { if (data) setCampaigns(data); });
    (supabase.from("gmail_tokens") as any).select("gmail_address").maybeSingle().then(({ data }: any) => {
      setGmailConnected(!!data?.gmail_address);
    });
  }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editId) {
      await supabase.from("email_templates").update({ subject, body }).eq("id", editId);
      toast({ title: "Template modifié" });
    } else {
      await supabase.from("email_templates").insert({ subject, body, owner_id: user.id });
      toast({ title: "Template créé" });
    }
    setOpen(false);
    setEditId(null);
    setSubject("");
    setBody("");
    fetchTemplates();
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setSubject(t.subject);
    setBody(t.body);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
    toast({ title: "Template supprimé" });
    fetchTemplates();
  };

  const openSendDialog = async (template: any) => {
    setSendTemplateId(template.id);
    setSendTemplate(template);
    setSendResults(null);
    setSendProgress(0);
    setCampaignFilter("all");
    await fetchProspectsForSend("all");
    setSendOpen(true);
  };

  const fetchProspectsForSend = async (campFilter: string) => {
    let query = supabase.from("prospects").select("id, first_name, last_name, email, city, specialty, company")
      .not("email", "is", null).neq("email", "");
    if (campFilter !== "all") query = query.eq("campaign_id", campFilter);
    const { data } = await query;
    setProspectsWithEmail(data || []);
  };

  const handleCampaignFilterChange = (val: string) => {
    setCampaignFilter(val);
    fetchProspectsForSend(val);
  };

  const handleSendEmails = async () => {
    if (!sendTemplateId || prospectsWithEmail.length === 0) return;
    setSending(true);
    setSendResults(null);
    setSendProgress(0);

    const prospectIds = prospectsWithEmail.map((p) => p.id);
    const batchSize = 10;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < prospectIds.length; i += batchSize) {
      const batch = prospectIds.slice(i, i + batchSize);
      try {
        const { data, error } = await supabase.functions.invoke("send-gmail-email", {
          body: { prospect_ids: batch, template_id: sendTemplateId },
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
      setSendProgress(Math.round(((i + batch.length) / prospectIds.length) * 100));
    }

    setSendResults({ sent: totalSent, failed: totalFailed });
    setSending(false);
    toast({
      title: `Envoi terminé`,
      description: `${totalSent} email(s) envoyé(s), ${totalFailed} échec(s)`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emails</h1>
        <p className="text-muted-foreground">Templates, suggestions intelligentes et automatisations</p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-4 w-4" />Templates
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="h-4 w-4" />Suggestions
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" />Automatisations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setSubject(""); setBody(""); } }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Nouveau template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>{editId ? "Modifier" : "Créer"} un template</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Objet</Label>
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Découvrez Bulbiz" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contenu</Label>
                      <p className="text-xs text-muted-foreground">Variables : {"{{prenom}}"}, {"{{nom}}"}, {"{{ville}}"}, {"{{specialite}}"}, {"{{entreprise}}"}</p>
                      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Bonjour {{prenom}}..." />
                    </div>
                    <Button onClick={handleSave} className="w-full">{editId ? "Enregistrer" : "Créer"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Send Dialog */}
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Envoyer par email</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  {!gmailConnected ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">Vous devez d'abord connecter votre Gmail dans les Paramètres.</p>
                      <Button variant="outline" onClick={() => window.location.href = "/settings"}>
                        Aller aux Paramètres
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm">Template</Label>
                        <p className="text-sm font-medium">{sendTemplate?.subject}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Filtrer par campagne</Label>
                        <Select value={campaignFilter} onValueChange={handleCampaignFilterChange}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les campagnes</SelectItem>
                            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm">
                        <strong>{prospectsWithEmail.length}</strong> prospect(s) avec un email
                      </p>
                      {sending && (
                        <div className="space-y-2">
                          <Progress value={sendProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">{sendProgress}%</p>
                        </div>
                      )}
                      {sendResults && (
                        <div className="text-sm space-y-1">
                          <p className="text-green-600">✅ {sendResults.sent} envoyé(s)</p>
                          {sendResults.failed > 0 && <p className="text-destructive">❌ {sendResults.failed} échec(s)</p>}
                        </div>
                      )}
                      <Button onClick={handleSendEmails} disabled={sending || prospectsWithEmail.length === 0} className="w-full">
                        {sending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi en cours...</>
                        ) : (
                          <><Send className="mr-2 h-4 w-4" />Envoyer à {prospectsWithEmail.length} prospect(s)</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length === 0 ? (
                <p className="text-muted-foreground col-span-2 text-center py-8">Aucun template créé</p>
              ) : templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t.subject}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openSendDialog(t)} title="Envoyer">
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(t)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <EmailSuggestions />
        </TabsContent>

        <TabsContent value="automations">
          <EmailAutomations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
