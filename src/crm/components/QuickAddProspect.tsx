import { useState } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/crm/components/ui/dialog";
import { Button } from "@/crm/components/ui/button";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Textarea } from "@/crm/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Plus, Phone, AlertTriangle } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createLocalProspect, listLocalProspects } from "@/crm/lib/localMode";

interface QuickAddProspectProps {
  campaignId?: string;
  onCreated?: () => void;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
}

export default function QuickAddProspect({ campaignId, onCreated, triggerVariant = "default", triggerSize = "default" }: QuickAddProspectProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [siret, setSiret] = useState("");
  const [codeNaf, setCodeNaf] = useState("");
  const [effectif, setEffectif] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicate, setDuplicate] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const reset = () => {
    setPhone(""); setFirstName(""); setLastName(""); setCompany("");
    setEmail(""); setCity(""); setSiret(""); setCodeNaf(""); setEffectif("");
    setLinkedin(""); setSiteWeb(""); setNotes(""); setDuplicate(null); setShowOptional(false);
  };

  const checkDuplicate = async (): Promise<any | null> => {
    if (!phone && !email && !siret) return null;
    setChecking(true);
    const localDuplicate = listLocalProspects().find((prospect) =>
      (phone && prospect.phone === phone) || (email && prospect.email === email),
    );
    if (localDuplicate) {
      setChecking(false);
      return localDuplicate;
    }
    if (phone) {
      const { data } = await supabase.from("prospects").select("id, first_name, last_name, phone, email, company").eq("phone", phone).limit(1);
      if (data && data.length > 0) { setChecking(false); return data[0]; }
    }
    if (email) {
      const { data } = await supabase.from("prospects").select("id, first_name, last_name, phone, email, company").eq("email", email).limit(1);
      if (data && data.length > 0) { setChecking(false); return data[0]; }
    }
    setChecking(false);
    return null;
  };

  const handleCreate = async (andCall = false) => {
    if (!phone && !firstName) {
      toast({ title: "Téléphone ou prénom requis", variant: "destructive" });
      return;
    }
    setCreating(true);

    // Check duplicates
    const dup = await checkDuplicate();
    if (dup) {
      setDuplicate(dup);
      setCreating(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const prospect = createLocalProspect({
        phone: phone || null,
        first_name: firstName || null,
        last_name: lastName || null,
        company: company || null,
        email: email || null,
        city: city || null,
        linkedin: linkedin || null,
        notes_internes: notes || null,
        campaign_id: campaignId || null,
      });
      toast({ title: "Prospect créé ✓", description: "Enregistré dans cette application." });
      setCreating(false);
      setOpen(false);
      reset();
      onCreated?.();
      if (andCall && prospect && phone) {
        window.location.href = `tel:${phone}`;
        navigate(`/crm/prospects/${prospect.id}`);
      }
      return;
    }

    // Create company if SIRET provided
    let companyId: string | null = null;
    if (siret || company) {
      // Check existing company
      if (siret) {
        const { data: existingCo } = await supabase.from("companies").select("id").eq("siret", siret).limit(1);
        if (existingCo && existingCo.length > 0) {
          companyId = existingCo[0].id;
        }
      }
      if (!companyId && company) {
        const { data: newCo } = await supabase.from("companies").insert({
          raison_sociale: company,
          siret: siret || null,
          code_naf: codeNaf || null,
          tranche_effectif: effectif || null,
          site_internet: siteWeb || null,
          owner_id: user.id,
        }).select("id").single();
        if (newCo) companyId = newCo.id;
      }
    }

    const { data: prospect, error } = await supabase.from("prospects").insert({
      phone: phone || null,
      first_name: firstName || null,
      last_name: lastName || null,
      company: company || null,
      email: email || null,
      city: city || null,
      linkedin: linkedin || null,
      notes_internes: notes || null,
      company_id: companyId,
      campaign_id: campaignId || null,
      owner_id: user.id,
    }).select("id").single();

    setCreating(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Prospect créé ✓" });
    setOpen(false);
    reset();
    onCreated?.();

    if (andCall && prospect && phone) {
      window.location.href = `tel:${phone}`;
      navigate(`/crm/prospects/${prospect.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Plus className="mr-1 h-4 w-4" />Ajouter un prospect
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajout rapide de prospect</DialogTitle></DialogHeader>

        {duplicate && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ce prospect existe déjà</p>
              <p className="text-muted-foreground">{duplicate.first_name} {duplicate.last_name} • {duplicate.phone || duplicate.email}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => { navigate(`/crm/prospects/${duplicate.id}`); setOpen(false); }}>Voir la fiche</Button>
                <Button size="sm" variant="ghost" onClick={() => setDuplicate(null)}>Créer quand même</Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Téléphone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prénom</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Société</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Entreprise SAS" />
          </div>

          {!showOptional && (
            <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setShowOptional(true)}>
              + Champs optionnels
            </Button>
          )}

          {showOptional && (
            <div className="space-y-2 border-t pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." type="email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ville</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SIRET</Label>
                  <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code NAF</Label>
                  <Input value={codeNaf} onChange={(e) => setCodeNaf(e.target.value)} placeholder="4322A" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Effectif</Label>
                  <Input value={effectif} onChange={(e) => setEffectif(e.target.value)} placeholder="2-5" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LinkedIn</Label>
                  <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Site web</Label>
                <Input value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes..." />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => handleCreate(false)} disabled={creating} className="flex-1">
              Créer
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={creating} variant="secondary" className="flex-1">
              <Phone className="mr-1 h-4 w-4" />Créer & appeler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
