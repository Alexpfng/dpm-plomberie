import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/crm/components/ui/table";
import { ArrowLeft, Building2, Users, Globe, Link2 as Linkedin, Copy, Edit, Save } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import { Badge } from "@/crm/components/ui/badge";

const FORME_OPTIONS = ["", "SAS", "SARL", "EI", "EURL", "SA", "SCI", "Auto-entrepreneur", "Autre"];
const TRANCHE_OPTIONS = ["", "1", "2-5", "6-10", "10+"];

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data: c } = await supabase.from("companies").select("*").eq("id", id).single();
      if (c) { setCompany(c); setForm(c); }
      const { data: p } = await supabase.from("prospects").select("*").eq("company_id", id).order("created_at", { ascending: false });
      if (p) setContacts(p);
    };
    fetch();
  }, [id]);

  const saveCompany = async () => {
    const { error } = await supabase.from("companies").update(form).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { setCompany(form); setEditing(false); toast({ title: "Entreprise mise à jour" }); }
  };

  const copyText = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copié !" }); };

  if (!company) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const companyAge = company.date_creation ? Math.floor((Date.now() - new Date(company.date_creation).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />{company.raison_sociale}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {company.forme_juridique && <span>{company.forme_juridique}</span>}
            {company.statut_activite === "active" ? <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">Active</Badge> : <Badge variant="destructive" className="text-xs">Radiée</Badge>}
            {companyAge !== null && <span>• {companyAge} ans</span>}
          </div>
        </div>
        <Button variant={editing ? "default" : "outline"} onClick={() => editing ? saveCompany() : setEditing(true)}>
          {editing ? <><Save className="mr-2 h-4 w-4" />Enregistrer</> : <><Edit className="mr-2 h-4 w-4" />Modifier</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Informations légales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Raison sociale" value={form.raison_sociale} editing={editing} onChange={(v) => setForm({...form, raison_sociale: v})} />
              <Field label="SIRET" value={form.siret} editing={editing} onChange={(v) => setForm({...form, siret: v})} copyable />
              <Field label="SIREN" value={form.siren} editing={editing} onChange={(v) => setForm({...form, siren: v})} copyable />
              <Field label="Code NAF" value={form.code_naf} editing={editing} onChange={(v) => setForm({...form, code_naf: v})} />
              {editing ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Forme juridique</Label>
                  <Select value={form.forme_juridique || ""} onValueChange={(v) => setForm({...form, forme_juridique: v})}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{FORME_OPTIONS.map(f => <SelectItem key={f} value={f || "none"}>{f || "—"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : <Field label="Forme juridique" value={form.forme_juridique} />}
              <Field label="Date création" value={form.date_creation} editing={editing} onChange={(v) => setForm({...form, date_creation: v})} type="date" />
              <Field label="Nb employés" value={String(form.nombre_employes || "")} editing={editing} onChange={(v) => setForm({...form, nombre_employes: parseInt(v) || 0})} />
              {editing ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Tranche effectif</Label>
                  <Select value={form.tranche_effectif || ""} onValueChange={(v) => setForm({...form, tranche_effectif: v})}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{TRANCHE_OPTIONS.map(t => <SelectItem key={t} value={t || "none"}>{t || "—"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : <Field label="Tranche effectif" value={form.tranche_effectif} />}
              <Field label="Chiffre d'affaires" value={form.chiffre_affaires} editing={editing} onChange={(v) => setForm({...form, chiffre_affaires: v})} />
            </div>
          </CardContent>
        </Card>

        {/* Coordinates */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Coordonnées</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label="Adresse" value={form.adresse} editing={editing} onChange={(v) => setForm({...form, adresse: v})} /></div>
              <Field label="Ville" value={form.ville} editing={editing} onChange={(v) => setForm({...form, ville: v})} />
              <Field label="Département" value={form.departement} editing={editing} onChange={(v) => setForm({...form, departement: v})} />
              <Field label="Région" value={form.region} editing={editing} onChange={(v) => setForm({...form, region: v})} />
              <Field label="Tél. standard" value={form.telephone_standard} editing={editing} onChange={(v) => setForm({...form, telephone_standard: v})} />
              <Field label="Email" value={form.email_generique} editing={editing} onChange={(v) => setForm({...form, email_generique: v})} copyable />
              <Field label="Site internet" value={form.site_internet} editing={editing} onChange={(v) => setForm({...form, site_internet: v})} link />
              <Field label="LinkedIn" value={form.linkedin_entreprise} editing={editing} onChange={(v) => setForm({...form, linkedin_entreprise: v})} link />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Contacts liés ({contacts.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun contact</TableCell></TableRow>
              ) : contacts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/crm/prospects/${c.id}`)}>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell>{c.poste || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.status}</Badge></TableCell>
                  <TableCell>🔥 {c.score || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, editing, onChange, copyable, link, type }: {
  label: string; value?: string; editing?: boolean; onChange?: (v: string) => void;
  copyable?: boolean; link?: boolean; type?: string;
}) {
  if (editing && onChange) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" type={type} />
      </div>
    );
  }
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {link && value ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1">
            {value} <Globe className="h-3 w-3" />
          </a>
        ) : <p className="font-medium text-sm">{value || "—"}</p>}
        {copyable && value && <button onClick={() => navigator.clipboard.writeText(value)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>}
      </div>
    </div>
  );
}
