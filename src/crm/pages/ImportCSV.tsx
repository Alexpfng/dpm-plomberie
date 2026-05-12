import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Button } from "@/crm/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/crm/components/ui/table";
import { Label } from "@/crm/components/ui/label";
import { Input } from "@/crm/components/ui/input";
import { Badge } from "@/crm/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/crm/components/ui/dialog";
import { Upload, FileUp, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Plus, Save, Lightbulb } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import * as XLSX from "xlsx";

// ─── Constants ───────────────────────────────────────────────────────
const STANDARD_FIELDS = [
  { value: "first_name", label: "Prénom", icon: "👤", group: "contact" },
  { value: "last_name", label: "Nom", icon: "👤", group: "contact" },
  { value: "company", label: "Société / Raison sociale", icon: "🏢", group: "contact" },
  { value: "phone", label: "Téléphone principal", icon: "📞", group: "contact" },
  { value: "email", label: "Email", icon: "📧", group: "contact" },
  { value: "city", label: "Ville", icon: "📍", group: "contact" },
  { value: "specialty", label: "Spécialité", icon: "🔧", group: "contact" },
  { value: "source", label: "Source", icon: "📥", group: "contact" },
  { value: "poste", label: "Poste / Fonction", icon: "💼", group: "contact" },
  { value: "linkedin", label: "LinkedIn perso", icon: "🔗", group: "contact" },
  { value: "siret", label: "SIRET", icon: "🏢", group: "company" },
  { value: "siren", label: "SIREN", icon: "🏢", group: "company" },
  { value: "code_naf", label: "Code NAF", icon: "🏢", group: "company" },
  { value: "nombre_employes", label: "Nb employés", icon: "🏢", group: "company" },
  { value: "date_creation_entreprise", label: "Date création entreprise", icon: "🏢", group: "company" },
  { value: "site_internet", label: "Site internet", icon: "🌐", group: "company" },
  { value: "linkedin_entreprise", label: "LinkedIn entreprise", icon: "🔗", group: "company" },
  { value: "adresse", label: "Adresse", icon: "📍", group: "company" },
  { value: "departement", label: "Département", icon: "📍", group: "company" },
  { value: "region", label: "Région", icon: "📍", group: "company" },
  { value: "forme_juridique", label: "Forme juridique", icon: "🏢", group: "company" },
  { value: "notes_internes", label: "Notes", icon: "📝", group: "contact" },
];

const CONTACT_DB_FIELDS = ["first_name", "last_name", "phone", "email", "city", "specialty", "source", "poste", "linkedin", "company", "notes_internes"];
const COMPANY_DB_FIELDS = ["siret", "siren", "code_naf", "nombre_employes", "date_creation_entreprise", "site_internet", "linkedin_entreprise", "adresse", "departement", "region", "forme_juridique"];

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s.\-()]/g, "");
  if (cleaned.startsWith("0")) cleaned = "+33" + cleaned.slice(1);
  return cleaned;
}

function detectColumnType(header: string, sampleValues: string[]): string | null {
  const patterns: Record<string, RegExp> = {
    first_name: /pr[eé]nom|first.?name/i,
    last_name: /^nom$|last.?name|surname/i,
    company: /soci[eé]t[eé]|company|entreprise|raison/i,
    phone: /t[eé]l[eé]phone|phone|tel$|mobile/i,
    email: /email|mail|courriel/i,
    city: /ville|city|localit/i,
    specialty: /sp[eé]cialit[eé]|specialty|m[eé]tier/i,
    source: /source|origine/i,
    poste: /poste|fonction|title|job/i,
    linkedin: /linkedin\s*perso/i,
    siret: /siret/i,
    siren: /siren/i,
    code_naf: /naf|ape/i,
    nombre_employes: /employ[eé]|effectif|salari/i,
    date_creation_entreprise: /date.*cr[eé]ation|cr[eé]ation.*date/i,
    site_internet: /site|web|url/i,
    linkedin_entreprise: /linkedin\s*(entreprise|soci)/i,
    adresse: /adresse|address/i,
    departement: /d[eé]partement|dept/i,
    region: /r[eé]gion/i,
    forme_juridique: /forme.*juridique|statut.*juridique/i,
    notes_internes: /note|commentaire|observation/i,
  };

  for (const [col, re] of Object.entries(patterns)) {
    if (re.test(header)) return col;
  }

  // Smart detection from values
  const nonEmpty = sampleValues.filter(Boolean);
  if (nonEmpty.length > 0) {
    const mobileCount = nonEmpty.filter(v => /^0[67]/.test(v.replace(/[\s.\-]/g, ""))).length;
    if (mobileCount / nonEmpty.length > 0.5) return "phone";
    const emailCount = nonEmpty.filter(v => /@/.test(v)).length;
    if (emailCount / nonEmpty.length > 0.5) return "email";
  }

  return null;
}

// ─── Types ───────────────────────────────────────────────────────────
type MappingEntry = { type: "standard"; field: string } | { type: "custom"; label: string } | { type: "skip" };

interface DuplicateInfo {
  rowIndex: number;
  reason: string;
  existingId: string;
}

// ─── Component ───────────────────────────────────────────────────────
export default function ImportCSV() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, MappingEntry>>({});
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ contacts: number; companies: number; duplicates: number } | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [customFieldDialog, setCustomFieldDialog] = useState<number | null>(null);
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [savedMappings, setSavedMappings] = useState<any[]>([]);
  const [saveMappingName, setSaveMappingName] = useState("");
  const [showSaveMapping, setShowSaveMapping] = useState(false);
  const [existingCustomFields, setExistingCustomFields] = useState<any[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("campaigns").select("id, name").then(({ data }) => { if (data) setCampaigns(data); });
    supabase.from("saved_mappings").select("*").then(({ data }) => { if (data) setSavedMappings(data); });
    supabase.from("custom_fields").select("*").then(({ data }) => { if (data) setExistingCustomFields(data); });
  }, []);

  // ─── File parsing ──────────────────────────────────────────────────
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const sep = lines[0].includes(";") ? ";" : ",";
    const h = lines[0].split(sep).map(s => s.trim().replace(/^"|"$/g, ""));
    const r = lines.slice(1).map(l => l.split(sep).map(s => s.trim().replace(/^"|"$/g, "")));
    setHeaders(h);
    setRows(r);
    autoMap(h, r);
  };

  const parseExcel = (buffer: ArrayBuffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (data.length < 2) return;
    const h = data[0].map(v => String(v).trim());
    const r = data.slice(1).map(row => row.map(v => String(v).trim()));
    setHeaders(h);
    setRows(r);
    autoMap(h, r);
  };

  const autoMap = (h: string[], r: string[][]) => {
    const m: Record<number, MappingEntry> = {};
    const used = new Set<string>();
    h.forEach((header, i) => {
      const samples = r.slice(0, 10).map(row => row[i] || "");
      const detected = detectColumnType(header, samples);
      if (detected && !used.has(detected)) {
        m[i] = { type: "standard", field: detected };
        used.add(detected);
      } else {
        m[i] = { type: "skip" };
      }
    });
    setMapping(m);
  };

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = e => { if (e.target?.result) parseExcel(e.target.result as ArrayBuffer); };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = e => { if (e.target?.result) parseCSV(e.target.result as string); };
      reader.readAsText(f);
    }
    setFile(f);
    setStep(2);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ─── Mapping changes ──────────────────────────────────────────────
  const setColumnMapping = (colIdx: number, value: string) => {
    if (value === "skip") {
      setMapping(prev => ({ ...prev, [colIdx]: { type: "skip" } }));
    } else if (value === "custom_new") {
      setCustomFieldDialog(colIdx);
    } else if (value.startsWith("custom:")) {
      const cf = existingCustomFields.find(f => f.id === value.replace("custom:", ""));
      if (cf) setMapping(prev => ({ ...prev, [colIdx]: { type: "custom", label: cf.field_label } }));
    } else {
      setMapping(prev => ({ ...prev, [colIdx]: { type: "standard", field: value } }));
    }
  };

  const createCustomField = async () => {
    if (!customFieldLabel.trim() || customFieldDialog === null) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const fieldName = customFieldLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const { data } = await supabase.from("custom_fields").insert({
      owner_id: user.id,
      field_name: fieldName,
      field_label: customFieldLabel.trim(),
    }).select().single();
    if (data) {
      setExistingCustomFields(prev => [...prev, data]);
      setMapping(prev => ({ ...prev, [customFieldDialog]: { type: "custom", label: data.field_label } }));
    }
    setCustomFieldDialog(null);
    setCustomFieldLabel("");
  };

  const applySavedMapping = (saved: any) => {
    const savedMap = saved.mapping as Record<string, string>;
    const newMapping: Record<number, MappingEntry> = {};
    headers.forEach((h, i) => {
      if (savedMap[h]) {
        const val = savedMap[h];
        if (val === "skip") {
          newMapping[i] = { type: "skip" };
        } else if (val.startsWith("custom:")) {
          newMapping[i] = { type: "custom", label: val.replace("custom:", "") };
        } else {
          newMapping[i] = { type: "standard", field: val };
        }
      } else {
        newMapping[i] = { type: "skip" };
      }
    });
    setMapping(newMapping);
    toast({ title: "Mapping appliqué", description: `Mapping "${saved.name}" chargé` });
  };

  const saveCurrentMapping = async () => {
    if (!saveMappingName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const mapObj: Record<string, string> = {};
    headers.forEach((h, i) => {
      const entry = mapping[i];
      if (!entry || entry.type === "skip") mapObj[h] = "skip";
      else if (entry.type === "standard") mapObj[h] = entry.field;
      else if (entry.type === "custom") mapObj[h] = `custom:${entry.label}`;
    });
    await supabase.from("saved_mappings").insert({ owner_id: user.id, name: saveMappingName.trim(), mapping: mapObj });
    setShowSaveMapping(false);
    setSaveMappingName("");
    toast({ title: "Mapping sauvegardé" });
  };

  // ─── Duplicate scanning (batch) ────────────────────────────────────
  const scanDuplicates = async () => {
    setScanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setScanning(false); return; }

      const phoneIdx = Object.entries(mapping).find(([_, e]) => e.type === "standard" && e.field === "phone")?.[0];
      const emailIdx = Object.entries(mapping).find(([_, e]) => e.type === "standard" && e.field === "email")?.[0];
      const siretIdx = Object.entries(mapping).find(([_, e]) => e.type === "standard" && e.field === "siret")?.[0];

      const found: DuplicateInfo[] = [];
      const foundRows = new Set<number>();

      // Batch: collect all unique values first
      const sirets = new Map<string, number[]>();
      const phones = new Map<string, number[]>();
      const emails = new Map<string, number[]>();

      rows.forEach((row, i) => {
        if (siretIdx && row[Number(siretIdx)]?.trim()) {
          const v = row[Number(siretIdx)].trim();
          if (!sirets.has(v)) sirets.set(v, []);
          sirets.get(v)!.push(i);
        }
        if (phoneIdx && row[Number(phoneIdx)]?.trim()) {
          const v = cleanPhone(row[Number(phoneIdx)]);
          if (!phones.has(v)) phones.set(v, []);
          phones.get(v)!.push(i);
        }
        if (emailIdx && row[Number(emailIdx)]?.trim()) {
          const v = row[Number(emailIdx)].trim().toLowerCase();
          if (!emails.has(v)) emails.set(v, []);
          emails.get(v)!.push(i);
        }
      });

      // Batch query SIRET
      if (sirets.size > 0) {
        const siretValues = Array.from(sirets.keys());
        for (let b = 0; b < siretValues.length; b += 50) {
          const batch = siretValues.slice(b, b + 50);
          const { data } = await supabase.from("companies").select("id, siret").in("siret", batch).eq("owner_id", user.id);
          if (data) {
            for (const c of data) {
              const rowIdxs = sirets.get(c.siret!) || [];
              for (const ri of rowIdxs) {
                if (!foundRows.has(ri)) {
                  found.push({ rowIndex: ri, reason: `SIRET ${c.siret}`, existingId: c.id });
                  foundRows.add(ri);
                }
              }
            }
          }
        }
      }

      // Batch query phones
      if (phones.size > 0) {
        const phoneValues = Array.from(phones.keys());
        for (let b = 0; b < phoneValues.length; b += 50) {
          const batch = phoneValues.slice(b, b + 50);
          const { data } = await supabase.from("prospects").select("id, phone").in("phone", batch).eq("owner_id", user.id);
          if (data) {
            for (const p of data) {
              const rowIdxs = phones.get(p.phone!) || [];
              for (const ri of rowIdxs) {
                if (!foundRows.has(ri)) {
                  found.push({ rowIndex: ri, reason: `Tél ${p.phone}`, existingId: p.id });
                  foundRows.add(ri);
                }
              }
            }
          }
        }
      }

      // Batch query emails
      if (emails.size > 0) {
        const emailValues = Array.from(emails.keys());
        for (let b = 0; b < emailValues.length; b += 50) {
          const batch = emailValues.slice(b, b + 50);
          const { data } = await supabase.from("prospects").select("id, email").in("email", batch).eq("owner_id", user.id);
          if (data) {
            for (const p of data) {
              const rowIdxs = emails.get(p.email?.toLowerCase() || "") || [];
              for (const ri of rowIdxs) {
                if (!foundRows.has(ri)) {
                  found.push({ rowIndex: ri, reason: `Email ${p.email}`, existingId: p.id });
                  foundRows.add(ri);
                }
              }
            }
          }
        }
      }

      setDuplicates(found);
      setStep(3);
    } catch (err) {
      console.error("Scan error:", err);
      toast({ title: "Erreur", description: "Erreur lors de l'analyse des doublons", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  // ─── Import ────────────────────────────────────────────────────────
  const handleImport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setImporting(true);

    const dupRowIndexes = new Set(skipDuplicates ? duplicates.map(d => d.rowIndex) : []);
    let companiesCreated = 0;
    let contactsCreated = 0;

    const mappedCompanyFields = Object.entries(mapping).filter(([_, e]) => e.type === "standard" && COMPANY_DB_FIELDS.includes(e.field));
    const hasCompanyData = mappedCompanyFields.length > 0 || Object.entries(mapping).some(([_, e]) => e.type === "standard" && e.field === "company");
    const customMappings = Object.entries(mapping).filter(([_, e]) => e.type === "custom") as [string, { type: "custom"; label: string }][];

    for (let ri = 0; ri < rows.length; ri++) {
      if (dupRowIndexes.has(ri)) continue;
      const row = rows[ri];

      const rowData: Record<string, string> = {};
      Object.entries(mapping).forEach(([idx, entry]) => {
        if (entry.type === "standard") rowData[entry.field] = row[Number(idx)] || "";
      });

      // Company
      let companyId: string | null = null;
      if (hasCompanyData && (rowData.company || rowData.siret)) {
        const companyInsert: any = { owner_id: user.id, raison_sociale: rowData.company || "Sans nom" };
        if (rowData.siret) companyInsert.siret = rowData.siret;
        if (rowData.siren) companyInsert.siren = rowData.siren;
        if (rowData.code_naf) companyInsert.code_naf = rowData.code_naf;
        if (rowData.nombre_employes) companyInsert.nombre_employes = parseInt(rowData.nombre_employes) || 0;
        if (rowData.date_creation_entreprise) companyInsert.date_creation = rowData.date_creation_entreprise;
        if (rowData.site_internet) companyInsert.site_internet = rowData.site_internet;
        if (rowData.linkedin_entreprise) companyInsert.linkedin_entreprise = rowData.linkedin_entreprise;
        if (rowData.adresse) companyInsert.adresse = rowData.adresse;
        if (rowData.city) companyInsert.ville = rowData.city;
        if (rowData.departement) companyInsert.departement = rowData.departement;
        if (rowData.region) companyInsert.region = rowData.region;
        if (rowData.forme_juridique) companyInsert.forme_juridique = rowData.forme_juridique;
        const { data: co } = await supabase.from("companies").insert(companyInsert).select("id").single();
        if (co) { companyId = co.id; companiesCreated++; }
      }

      // Prospect
      const prospect: any = { owner_id: user.id, status: "nouveau", date_premier_contact: new Date().toISOString() };
      if (selectedCampaign) prospect.campaign_id = selectedCampaign;
      if (companyId) prospect.company_id = companyId;
      if (rowData.first_name) prospect.first_name = rowData.first_name;
      if (rowData.last_name) prospect.last_name = rowData.last_name;
      if (rowData.phone) prospect.phone = cleanPhone(rowData.phone);
      if (rowData.email) prospect.email = rowData.email;
      if (rowData.city) prospect.city = rowData.city;
      if (rowData.specialty) prospect.specialty = rowData.specialty;
      if (rowData.source) prospect.source = rowData.source;
      if (rowData.company) prospect.company = rowData.company;
      if (rowData.poste) prospect.poste = rowData.poste;
      if (rowData.linkedin) prospect.linkedin = rowData.linkedin;
      if (rowData.notes_internes) prospect.notes_internes = rowData.notes_internes;

      const { data: newProspect } = await supabase.from("prospects").insert(prospect).select("id").single();
      if (newProspect) {
        contactsCreated++;
        // Custom fields
        for (const [idx, entry] of customMappings) {
          const val = row[Number(idx)] || "";
          if (!val) continue;
          const cf = existingCustomFields.find(f => f.field_label === entry.label);
          if (cf) {
            await supabase.from("custom_field_values").insert({ prospect_id: newProspect.id, custom_field_id: cf.id, value: val });
          }
        }
      }
    }

    setImporting(false);
    setImportStats({ contacts: contactsCreated, companies: companiesCreated, duplicates: dupRowIndexes.size });
    toast({ title: "Import terminé", description: `${contactsCreated} contacts, ${companiesCreated} entreprises, ${dupRowIndexes.size} doublons ignorés` });
    setStep(4);
  };

  // ─── Helpers ───────────────────────────────────────────────────────
  const getMappingValue = (entry: MappingEntry | undefined): string => {
    if (!entry || entry.type === "skip") return "skip";
    if (entry.type === "standard") return entry.field;
    return `custom:${entry.label}`;
  };

  const getMappingLabel = (entry: MappingEntry | undefined): string => {
    if (!entry || entry.type === "skip") return "Ignoré";
    if (entry.type === "standard") {
      const f = STANDARD_FIELDS.find(sf => sf.value === entry.field);
      return f ? `${f.icon} ${f.label}` : entry.field;
    }
    return `🏷️ ${entry.label}`;
  };

  const getSuggestionText = (colIdx: number): string | null => {
    const entry = mapping[colIdx];
    if (!entry || entry.type !== "skip") return null;
    const samples = rows.slice(0, 5).map(r => r[colIdx] || "");
    const nonEmpty = samples.filter(Boolean);
    if (nonEmpty.length === 0) return null;
    const mobileCount = nonEmpty.filter(v => /^0[67]/.test(v.replace(/[\s.\-]/g, ""))).length;
    if (mobileCount / nonEmpty.length > 0.5) return "📱 Détecté comme téléphone mobile";
    const emailCount = nonEmpty.filter(v => /@/.test(v)).length;
    if (emailCount / nonEmpty.length > 0.5) return "📧 Détecté comme email";
    return null;
  };

  const mappedCount = Object.values(mapping).filter(e => e.type !== "skip").length;
  const ignoredCount = Object.values(mapping).filter(e => e.type === "skip").length;
  const customCount = Object.values(mapping).filter(e => e.type === "custom").length;

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import CSV / Excel</h1>
        <p className="text-muted-foreground">Import guidé en {step === 4 ? "4" : "4"} étapes</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "Upload" },
          { n: 2, label: "Mapping" },
          { n: 3, label: "Vérification" },
          { n: 4, label: "Résultat" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step > n ? <CheckCircle2 className="h-5 w-5" /> : n}
            </div>
            <span className={`text-sm hidden sm:block ${step >= n ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
            {n < 4 && <div className={`flex-1 h-0.5 ${step > n ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Upload ──────────────────────────────────────── */}
      {step === 1 && (
        <Card
          className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium">Glissez votre fichier CSV ou Excel ici</p>
            <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner (.csv, .xlsx, .xls)</p>
            <p className="text-xs text-muted-foreground mt-2">Colonnes supportées : prénom, nom, société, SIRET, téléphone, email, LinkedIn…</p>
            <input id="csv-input" type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 2: Mapping ─────────────────────────────────────── */}
      {step === 2 && (
        <>
          {/* Saved mappings */}
          {savedMappings.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Mappings sauvegardés</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedMappings.map(sm => (
                    <Button key={sm.id} variant="outline" size="sm" onClick={() => applySavedMapping(sm)}>
                      {sm.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Mapping des colonnes — {file?.name}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{mappedCount} mappées</Badge>
                  <Badge variant="outline">{ignoredCount} ignorées</Badge>
                  {customCount > 0 && <Badge className="bg-accent text-accent-foreground">{customCount} personnalisées</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Pour chaque colonne, confirmez ou corrigez le champ correspondant. Les suggestions automatiques sont marquées avec 💡.
              </p>

              {headers.map((h, i) => {
                const entry = mapping[i];
                const suggestion = getSuggestionText(i);
                const samples = rows.slice(0, 3).map(r => r[i] || "").filter(Boolean);

                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{h}</span>
                        {entry?.type !== "skip" && (
                          <Badge variant="default" className="text-xs">💡 Auto</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {samples.map((s, si) => (
                          <span key={si} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[150px]">{s}</span>
                        ))}
                      </div>
                      {suggestion && entry?.type === "skip" && (
                        <p className="text-xs text-primary mt-1">{suggestion}</p>
                      )}
                    </div>
                    <div className="w-[220px] flex-shrink-0">
                      <Select value={getMappingValue(entry)} onValueChange={v => setColumnMapping(i, v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">— Ignorer —</SelectItem>
                          <SelectItem value="__group_contact" disabled className="font-bold text-xs uppercase tracking-wide">
                            Contact
                          </SelectItem>
                          {STANDARD_FIELDS.filter(f => f.group === "contact").map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.icon} {f.label}</SelectItem>
                          ))}
                          <SelectItem value="__group_company" disabled className="font-bold text-xs uppercase tracking-wide">
                            Entreprise
                          </SelectItem>
                          {STANDARD_FIELDS.filter(f => f.group === "company").map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.icon} {f.label}</SelectItem>
                          ))}
                          {existingCustomFields.length > 0 && (
                            <SelectItem value="__group_custom" disabled className="font-bold text-xs uppercase tracking-wide">
                              Champs personnalisés
                            </SelectItem>
                          )}
                          {existingCustomFields.map(cf => (
                            <SelectItem key={cf.id} value={`custom:${cf.id}`}>🏷️ {cf.field_label}</SelectItem>
                          ))}
                          <SelectItem value="custom_new">
                            <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Créer champ personnalisé</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Aperçu ({rows.length} lignes)</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="text-xs whitespace-nowrap">
                        <div>{h}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">{getMappingLabel(mapping[i])}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className="text-xs">{cell}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setHeaders([]); setRows([]); }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSaveMapping(true)}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder mapping
              </Button>
              <Button onClick={scanDuplicates} disabled={scanning || mappedCount === 0}>
                {scanning ? "Analyse…" : "Suivant"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ─── STEP 3: Verification & Import ────────────────────────── */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Récapitulatif avant import</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{rows.length}</div>
                  <div className="text-sm text-muted-foreground">lignes détectées</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{mappedCount}</div>
                  <div className="text-sm text-muted-foreground">colonnes mappées</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{ignoredCount}</div>
                  <div className="text-sm text-muted-foreground">colonnes ignorées</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{customCount}</div>
                  <div className="text-sm text-muted-foreground">champs personnalisés</div>
                </div>
              </div>

              {duplicates.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[hsl(38,92%,50%)]">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">⚠️ {duplicates.length} doublons potentiels détectés</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {duplicates.slice(0, 10).map((d, i) => (
                      <div key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span>Ligne {d.rowIndex + 1}:</span>
                        <span>{d.reason}</span>
                      </div>
                    ))}
                    {duplicates.length > 10 && <p className="text-sm text-muted-foreground">…et {duplicates.length - 10} autres</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant={skipDuplicates ? "default" : "outline"} size="sm" onClick={() => setSkipDuplicates(true)}>
                      Ignorer les doublons
                    </Button>
                    <Button variant={!skipDuplicates ? "default" : "outline"} size="sm" onClick={() => setSkipDuplicates(false)}>
                      Importer quand même
                    </Button>
                  </div>
                </div>
              )}

              {duplicates.length === 0 && (
                <div className="flex items-center gap-2 text-[hsl(142,71%,45%)] p-4 bg-[hsl(142,76%,95%)] dark:bg-[hsl(142,76%,10%)] rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Aucun doublon détecté</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Campagne (optionnel)" /></SelectTrigger>
                  <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Modifier mapping
            </Button>
            <Button onClick={handleImport} disabled={importing} size="lg">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Import en cours…" : `Importer ${rows.length - (skipDuplicates ? duplicates.length : 0)} contacts`}
            </Button>
          </div>
        </>
      )}

      {/* ─── STEP 4: Result ──────────────────────────────────────── */}
      {step === 4 && importStats && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-[hsl(142,71%,45%)] mx-auto" />
            <h2 className="text-xl font-bold">Import terminé !</h2>
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold">{importStats.contacts}</div>
                <div className="text-muted-foreground">contacts importés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{importStats.companies}</div>
                <div className="text-muted-foreground">entreprises créées</div>
              </div>
              {importStats.duplicates > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-[hsl(38,92%,50%)]">{importStats.duplicates}</div>
                  <div className="text-muted-foreground">doublons ignorés</div>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => { setStep(1); setFile(null); setHeaders([]); setRows([]); setImportStats(null); setDuplicates([]); }}>
                Nouvel import
              </Button>
              <Button onClick={() => window.location.href = "/crm/prospects"}>
                Voir les prospects
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────────── */}
      <Dialog open={customFieldDialog !== null} onOpenChange={open => { if (!open) setCustomFieldDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un champ personnalisé</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nom du champ</Label>
            <Input placeholder="Ex: Type chantier, Source salon, CA estimé…" value={customFieldLabel} onChange={e => setCustomFieldLabel(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ce champ sera sauvegardé et réutilisable pour vos prochains imports.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomFieldDialog(null)}>Annuler</Button>
            <Button onClick={createCustomField} disabled={!customFieldLabel.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveMapping} onOpenChange={setShowSaveMapping}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sauvegarder ce mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nom du mapping</Label>
            <Input placeholder="Ex: Format INSEE, Export LinkedIn…" value={saveMappingName} onChange={e => setSaveMappingName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveMapping(false)}>Annuler</Button>
            <Button onClick={saveCurrentMapping} disabled={!saveMappingName.trim()}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
