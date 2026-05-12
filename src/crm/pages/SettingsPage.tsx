import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Textarea } from "@/crm/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/crm/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/crm/components/ui/dialog";
import { Mail, Settings, CheckCircle, Loader2, MessageSquare, RotateCcw, Save, Users, Copy, Pencil, Phone, UserPlus } from "lucide-react";
import { supabase } from "@/crm/integrations/supabase/client";
import { useToast } from "@/crm/hooks/use-toast";
import { BULBIZ_PITCH_SMS } from "@/crm/lib/smsTemplate";
import { getLocalSmsTemplate, setLocalSmsTemplate } from "@/crm/lib/localMode";
import { useProfile, type CrmRole, type Profile } from "@/crm/context/ProfileContext";

const ROLE_LABELS: Record<CrmRole, string> = {
  admin: "Administrateur",
  commercial: "Commercial",
  comptable: "Comptable",
};

const ROLE_COLORS: Record<CrmRole, string> = {
  admin: "bg-[rgba(124,58,237,0.12)] text-[#7c3aed]",
  commercial: "bg-[rgba(37,99,235,0.12)] text-[#2563eb]",
  comptable: "bg-[rgba(234,88,12,0.12)] text-[#ea580c]",
};

function RoleBadge({ role }: { role: string }) {
  const r = (role || "commercial") as CrmRole;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${ROLE_COLORS[r] || ROLE_COLORS.commercial}`}>
      {ROLE_LABELS[r] || r}
    </span>
  );
}

function TeamTab() {
  const { profile: myProfile } = useProfile();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<CrmRole>("commercial");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const signupUrl = `${window.location.origin}/crm/signup`;
  const isAdmin = myProfile?.crm_role === "admin";

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("id, user_id, full_name, email, crm_role, phone, avatar_url, created_at").order("created_at");
    setMembers(((data || []) as Profile[]).map(m => ({ crm_role: "commercial", email: null, phone: null, ...m })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openEdit = (m: Profile) => {
    setEditTarget(m);
    setEditRole((m.crm_role || "commercial") as CrmRole);
    setEditName(m.full_name || "");
    setEditPhone(m.phone || "");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    await supabase.from("profiles").update({
      crm_role: editRole,
      full_name: editName.trim() || editTarget.full_name,
      phone: editPhone.trim() || null,
    }).eq("id", editTarget.id);
    toast({ title: "Profil mis à jour" });
    setSaving(false);
    setEditTarget(null);
    fetchMembers();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(signupUrl);
    toast({ title: "Lien copié !" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: 13, color: "hsl(var(--crm-muted-foreground))" }}>
          {members.length} membre{members.length !== 1 ? "s" : ""} dans l'équipe
        </p>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Inviter un collaborateur
        </Button>
      </div>

      {/* Members list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "hsl(var(--crm-muted-foreground))", fontSize: 13 }}>
          Aucun membre — invitez vos collaborateurs via le lien d'inscription
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: "hsl(var(--crm-card))", border: "1px solid hsl(var(--crm-border))",
                borderRadius: "var(--crm-radius)", transition: "border-color 0.15s",
              }}
            >
              {/* Avatar initials */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: m.user_id === myProfile?.user_id ? "rgba(37,99,235,0.15)" : "rgba(100,100,100,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: m.user_id === myProfile?.user_id ? "#2563eb" : "hsl(var(--crm-muted-foreground))",
              }}>
                {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--crm-foreground))" }}>
                    {m.full_name || m.email || "—"}
                  </span>
                  {m.user_id === myProfile?.user_id && (
                    <span style={{ fontSize: 10, color: "hsl(var(--crm-muted-foreground))", fontWeight: 500 }}>(vous)</span>
                  )}
                  <RoleBadge role={m.crm_role} />
                </div>
                <div style={{ fontSize: 11, color: "hsl(var(--crm-muted-foreground))", marginTop: 2, display: "flex", gap: 12 }}>
                  {m.email && <span>{m.email}</span>}
                  {m.phone && <span><Phone size={10} style={{ display: "inline", marginRight: 3 }} />{m.phone}</span>}
                </div>
              </div>

              {/* Edit button (only admins) */}
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)} style={{ flexShrink: 0 }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit member dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label>Nom complet</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Prénom Nom" />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+33 6 xx xx xx xx" />
            </div>
            <div className="space-y-1">
              <Label>Rôle</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as CrmRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="comptable">Comptable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveEdit} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un collaborateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p style={{ fontSize: 13, color: "hsl(var(--crm-muted-foreground))", lineHeight: 1.6 }}>
              Partagez ce lien à votre collaborateur. Il pourra créer son compte et accéder à la plateforme.
              Une fois connecté, il apparaîtra dans cette liste — vous pourrez alors lui assigner un rôle.
            </p>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
              background: "hsl(var(--crm-muted))", borderRadius: 10, border: "1px solid hsl(var(--crm-border))",
            }}>
              <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "hsl(var(--crm-foreground))", wordBreak: "break-all" }}>
                {signupUrl}
              </span>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div style={{ fontSize: 12, color: "hsl(var(--crm-muted-foreground))", lineHeight: 1.6 }}>
              <strong>Rôles disponibles :</strong><br />
              <span style={{ color: "#7c3aed" }}>Administrateur</span> — accès complet, gestion de l'équipe<br />
              <span style={{ color: "#2563eb" }}>Commercial</span> — appels, prospects, campagnes assignées<br />
              <span style={{ color: "#ea580c" }}>Comptable</span> — consultation uniquement (analytics)
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  const { profile: myProfile } = useProfile();
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const [smsContent, setSmsContent] = useState<string>(BULBIZ_PITCH_SMS);
  const [smsLoading, setSmsLoading] = useState(true);
  const [smsSaving, setSmsSaving] = useState(false);

  const fetchGmailStatus = useCallback(async () => {
    const { data } = await (supabase.from("gmail_tokens") as any).select("gmail_address").maybeSingle();
    setGmailAddress(data?.gmail_address || null);
    setLoading(false);
  }, []);

  const fetchSmsTemplate = useCallback(async () => {
    setSmsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSmsContent(getLocalSmsTemplate(BULBIZ_PITCH_SMS));
      setSmsLoading(false);
      return;
    }
    const { data } = await (supabase.from("sms_templates") as any).select("content").maybeSingle();
    setSmsContent(data?.content?.trim() ? data.content : getLocalSmsTemplate(BULBIZ_PITCH_SMS));
    setSmsLoading(false);
  }, []);

  useEffect(() => {
    fetchGmailStatus();
    fetchSmsTemplate();
  }, [fetchGmailStatus, fetchSmsTemplate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    const handleCallback = async () => {
      setConnecting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");
        const redirectUri = `${window.location.origin}/crm/settings`;
        const { data, error } = await supabase.functions.invoke("gmail-auth-callback", {
          body: { code, redirect_uri: redirectUri },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Erreur inconnue");
        toast({ title: "Gmail connecté !", description: `Connecté en tant que ${data.gmail_address}` });
        setGmailAddress(data.gmail_address);
        window.history.replaceState({}, "", "/crm/settings");
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally {
        setConnecting(false);
      }
    };
    handleCallback();
  }, [toast]);

  const connectGmail = async () => {
    try {
      const redirectUri = `${window.location.origin}/crm/settings`;
      const { data, error } = await supabase.functions.invoke("gmail-auth-url", {
        body: { redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast({ title: "Erreur", description: data?.error || "Impossible de générer l'URL", variant: "destructive" });
        return;
      }
      window.location.href = data.auth_url;
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const disconnectGmail = async () => {
    await (supabase.from("gmail_tokens") as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setGmailAddress(null);
    toast({ title: "Gmail déconnecté" });
  };

  const saveSmsTemplate = async () => {
    setSmsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLocalSmsTemplate(smsContent);
        toast({ title: "Message SMS enregistré" });
        return;
      }
      const { error } = await (supabase.from("sms_templates") as any).upsert(
        { user_id: user.id, content: smsContent },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      toast({ title: "Message SMS enregistré" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSmsSaving(false);
    }
  };

  const resetSmsTemplate = () => {
    setSmsContent(BULBIZ_PITCH_SMS);
    setLocalSmsTemplate(BULBIZ_PITCH_SMS);
    toast({ title: "Texte réinitialisé", description: "Cliquez sur Enregistrer pour confirmer." });
  };

  const charCount = smsContent.length;
  const smsParts = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="crm-page">
      <Tabs defaultValue="integrations">
        <TabsList className="mb-2">
          <TabsTrigger value="integrations">
            <Settings className="h-3.5 w-3.5 mr-1.5" />Intégrations
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-3.5 w-3.5 mr-1.5" />Équipe
          </TabsTrigger>
        </TabsList>

        {/* ── Intégrations tab ── */}
        <TabsContent value="integrations" className="space-y-4 mt-0">

          {/* Mon profil */}
          {myProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Mon profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Nom :</span> {myProfile.full_name || "—"}</p>
                <p><span className="text-muted-foreground">Email :</span> {myProfile.email || "—"}</p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rôle :</span>
                  <RoleBadge role={myProfile.crm_role} />
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />Connexion Gmail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connectez votre compte Gmail pour envoyer des emails directement depuis Bulbiz Sales.
              </p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : gmailAddress ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Connecté : <strong>{gmailAddress}</strong></span>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectGmail}>Déconnecter Gmail</Button>
                </div>
              ) : connecting ? (
                <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion en cours...</Button>
              ) : (
                <Button onClick={connectGmail}>
                  <Mail className="mr-2 h-4 w-4" />Connecter Gmail
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />Message SMS pré-rempli
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ce message s'envoie quand vous cliquez sur <strong>"SMS Bulbiz"</strong> depuis une fiche prospect.
              </p>
              {smsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Textarea
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    rows={14}
                    className="font-mono text-sm"
                    placeholder="Votre message SMS..."
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{charCount} caractères · {smsParts} SMS {smsParts > 1 ? "(multi-parts)" : "(160 car. max)"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveSmsTemplate} disabled={smsSaving}>
                      {smsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={resetSmsTemplate} disabled={smsSaving}>
                      <RotateCcw className="mr-2 h-4 w-4" />Réinitialiser
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Équipe tab ── */}
        <TabsContent value="team" className="mt-0">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
