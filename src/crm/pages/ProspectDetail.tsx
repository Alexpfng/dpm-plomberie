import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Label } from "@/crm/components/ui/label";
import { Badge } from "@/crm/components/ui/badge";
import { Input } from "@/crm/components/ui/input";
import { Textarea } from "@/crm/components/ui/textarea";
import { Switch } from "@/crm/components/ui/switch";
import { Phone, Mail, CalendarCheck, Link2, Clock, Star, ChevronRight, Tag, Timer, TimerOff, Building2, ExternalLink, Copy, Globe, Zap, Pencil, Save, SkipForward, MessageSquare, Trash2, Archive, MoreHorizontal, CheckCircle2, Circle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/crm/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/crm/components/ui/dropdown-menu";
import { useToast } from "@/crm/hooks/use-toast";
import { PRODUCT_STATUS_OPTIONS, getProductStatusBadge } from "@/crm/lib/productStatus";
import { EditableField } from "@/crm/components/EditableField";
import { Popover, PopoverContent, PopoverTrigger } from "@/crm/components/ui/popover";
import { Calendar } from "@/crm/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/crm/lib/utils";
import RichTextEditor, { renderScriptHtml } from "@/crm/components/RichTextEditor";
import ScoreBreakdown from "@/crm/components/ScoreBreakdown";
import RdvBookingDialog from "@/crm/components/RdvBookingDialog";
import { buildSmsLink, fetchUserSmsTemplate, BULBIZ_PITCH_SMS } from "@/crm/lib/smsTemplate";
import { Checkbox } from "@/crm/components/ui/checkbox";
import { appendLocalAction, deleteLocalProspect, getLocalProspect, isLocalProspectId, listLocalActions, updateLocalProspect } from "@/crm/lib/localMode";

const STATUS_OPTIONS = [
  { value: "nouveau", label: "Nouveau", key: "" },
  { value: "appele_non_joint", label: "Appelé – Non joint", key: "n" },
  { value: "repondeur", label: "Répondeur", key: "v" },
  { value: "rappel", label: "Rappel", key: "r" },
  { value: "interesse", label: "Intéressé", key: "i" },
  { value: "lien_envoye", label: "Lien envoyé", key: "" },
  { value: "rdv_booke", label: "RDV booké", key: "b" },
  { value: "refus", label: "Refus", key: "" },
  { value: "mauvais_numero", label: "Mauvais numéro", key: "" },
  { value: "hors_cible", label: "Hors cible", key: "" },
];

const STRUCTURE_OPTIONS = [
  { value: "", label: "—" },
  { value: "seul", label: "Seul" },
  { value: "2-3", label: "2-3 personnes" },
  { value: "4-7", label: "4-7 personnes" },
  { value: "8+", label: "8+ personnes" },
  { value: "avec_bureau", label: "Avec bureau / assistante" },
  { value: "avec_conducteur", label: "Avec conducteur de travaux" },
];
const TEMPS_ADMIN_OPTIONS = [
  { value: "", label: "—" },
  { value: "moins_30min", label: "< 30 min" },
  { value: "30min_1h", label: "30 min – 1h" },
  { value: "1h_2h", label: "1h – 2h" },
  { value: "2h_plus", label: "2h+" },
];
const URGENCY_OPTIONS = [
  { value: "", label: "—" }, { value: "faible", label: "Faible" },
  { value: "moyen", label: "Moyen" }, { value: "fort", label: "Fort" },
];
const DEFAULT_TAGS = ["gros_potentiel", "chaud", "à_relancer", "refus_définitif", "besoin_education", "curieux"];

const QUICK_NOTES = [
  { label: "💰 Prix", text: "Objection prix – " },
  { label: "⏰ Pas le temps", text: "Pas le temps – " },
  { label: "💻 Déjà logiciel", text: "Utilise déjà un logiciel – " },
  { label: "🤔 Curieux", text: "Curieux, à relancer – " },
  { label: "📞 Relancer", text: "À relancer – " },
  { label: "✅ Intéressé", text: "Intéressé – " },
];

export default function ProspectDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const flowMode = searchParams.get("flow") === "1";
  const queueIdsParam = searchParams.get("queue");
  const queueIds: string[] = queueIdsParam ? JSON.parse(decodeURIComponent(queueIdsParam)) : [];
  const currentIndex = queueIds.indexOf(paramId || "");

  const navigate = useNavigate();
  const [prospect, setProspect] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [script, setScript] = useState<string>("");
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [allScripts, setAllScripts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [prospectTags, setProspectTags] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [callActive, setCallActive] = useState(false);
  const [callStart, setCallStart] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [callQualification, setCallQualification] = useState("");
  const qualFieldsChangedRef = useRef(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderType, setReminderType] = useState("call");
  const [notesInternes, setNotesInternes] = useState("");
  const [editingScript, setEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState("");
  const [autoNext, setAutoNext] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rdvDialogOpen, setRdvDialogOpen] = useState(false);
  const [rdvDialogMode, setRdvDialogMode] = useState<"create" | "edit" | "cancel">("create");
  const [appointment, setAppointment] = useState<any>(null);
  const actionInProgressRef = useRef(false);
  const { toast } = useToast();
  const id = paramId;
  const isLocalProspect = isLocalProspectId(id);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isLocalProspect) {
      const localProspect = getLocalProspect(id);
      setProspect(localProspect);
      setCompany(null);
      setActions(listLocalActions(id));
      setProspectTags([]);
      setAllTags([]);
      setAllScripts([]);
      setCampaigns([]);
      setAppointment(null);
      setNotesInternes(localProspect?.notes_internes || "");
      return;
    }
    const { data: p } = await supabase.from("prospects").select("*").eq("id", id).single();
    if (p) {
      setProspect(p);
      setNotesInternes(p.notes_internes || "");
      if (p.company_id) {
        const { data: co } = await supabase.from("companies").select("*").eq("id", p.company_id).single();
        if (co) setCompany(co);
      } else {
        setCompany(null);
      }
      if (p.campaign_id) {
        const { data: campaign } = await supabase.from("campaigns").select("script_id").eq("id", p.campaign_id).single();
        if (campaign?.script_id) {
          const { data: s } = await supabase.from("scripts").select("id, content").eq("id", campaign.script_id).single();
          if (s) { setScript(s.content); setScriptId(s.id); }
        } else { setScript(""); setScriptId(null); }
      } else { setScript(""); setScriptId(null); }
    }
    const { data: logs } = await supabase.from("actions_log").select("*").eq("prospect_id", id).order("created_at", { ascending: false });
    if (logs) setActions(logs);
    const { data: pt } = await supabase.from("prospect_tags").select("*, tags(*)").eq("prospect_id", id);
    if (pt) setProspectTags(pt);
    const { data: at } = await supabase.from("tags").select("*");
    if (at) setAllTags(at);
    const { data: sc } = await supabase.from("scripts").select("id, title");
    if (sc) setAllScripts(sc);
    const { data: ca } = await supabase.from("campaigns").select("id, name");
    if (ca) setCampaigns(ca);
    // Fetch active appointment
    const { data: appt } = await supabase.from("appointments").select("*").eq("prospect_id", id).eq("status", "booked").maybeSingle();
    setAppointment(appt);
  }, [id, isLocalProspect]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!callActive || !callStart) return;
    const interval = setInterval(() => { setCallDuration(Math.floor((Date.now() - callStart.getTime()) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, [callActive, callStart]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      if (key === "n") updateStatus("appele_non_joint");
      if (key === "v") updateStatus("repondeur");
      if (key === "r") updateStatus("rappel");
      if (key === "i") updateStatus("interesse");
      if (key === "b") updateStatus("rdv_booke");
      if (key === "arrowright" && flowMode) goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Statuts qui nécessitent un appel actif pour être significatifs dans les stats
  const CALL_OUTCOME_STATUSES = ["appele_non_joint", "repondeur"];

  const updateStatus = async (status: string) => {
    if (!prospect) return;
    if (actionInProgressRef.current) return;
    
    // For RDV, open dialog instead of direct status change
    if (status === "rdv_booke") {
      const { data: existing } = await supabase
        .from("appointments").select("id").eq("prospect_id", prospect.id).eq("status", "booked").maybeSingle();
      if (existing) {
        toast({ title: "Un RDV est déjà booké pour ce prospect", variant: "destructive" });
        return;
      }
      setRdvDialogMode("create");
      setRdvDialogOpen(true);
      return;
    }

    // Warn if setting call-outcome status without active call
    if (CALL_OUTCOME_STATUSES.includes(status) && !callActive) {
      // Still allow it but don't count in call stats
    }

    actionInProgressRef.current = true;
    try {
      if (isLocalProspect) {
        const updated = updateLocalProspect(prospect.id, { status, last_contact: new Date().toISOString() });
        appendLocalAction(prospect.id, "status_change", { from: prospect.status, to: status, local: true });
        if (updated) setProspect(updated);
        toast({ title: `Statut → ${STATUS_OPTIONS.find(s => s.value === status)?.label}` });
        if (autoNext && flowMode && ["appele_non_joint", "repondeur", "rdv_booke", "refus", "mauvais_numero", "hors_cible"].includes(status)) {
          setTimeout(() => goNext(), 800);
        }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("prospects").update({ status, last_contact: new Date().toISOString() }).eq("id", prospect.id);
      // Only log call-related action if call is active, otherwise log as manual status change
      const actionType = (CALL_OUTCOME_STATUSES.includes(status) && callActive) ? "status_change" : "status_change_manual";
      await supabase.from("actions_log").insert({ prospect_id: prospect.id, action_type: callActive ? "status_change" : "status_change_manual", details: { from: prospect.status, to: status, call_active: callActive }, user_id: user!.id });
      setProspect({ ...prospect, status });
      toast({ title: `Statut → ${STATUS_OPTIONS.find(s => s.value === status)?.label}` });
      if (autoNext && flowMode && ["appele_non_joint", "repondeur", "rdv_booke", "refus", "mauvais_numero", "hors_cible"].includes(status)) {
        setTimeout(() => goNext(), 800);
      }
    } finally {
      actionInProgressRef.current = false;
    }
  };

  const QUAL_FIELDS = ["interest_level", "nb_chantiers_semaine", "nb_devis_semaine", "structure_entreprise", "temps_admin_jour", "score_dispersion", "urgency"];

  const updateField = async (field: string, value: any) => {
    if (!prospect) return;
    if (isLocalProspect) {
      const updated = updateLocalProspect(prospect.id, { [field]: value });
      if (updated) setProspect(updated);
      return;
    }
    await supabase.from("prospects").update({ [field]: value }).eq("id", prospect.id);
    setProspect({ ...prospect, [field]: value });
    // Auto-qualify as "contact argumenté" if qualification field changed during active call
    if (callActive && QUAL_FIELDS.includes(field)) {
      qualFieldsChangedRef.current = true;
      if (!callQualification || callQualification === "repondeur") {
        setCallQualification("contact_argumente");
      }
    }
  };

  const updateCompanyField = async (field: string, value: any) => {
    if (!company) return;
    if (isLocalProspect) return;
    await supabase.from("companies").update({ [field]: value }).eq("id", company.id);
    setCompany({ ...company, [field]: value });
  };

  const autoSaveNotes = (val: string) => {
    setNotesInternes(val);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      if (!prospect) return;
      if (isLocalProspect) {
        const updated = updateLocalProspect(prospect.id, { notes_internes: val });
        if (updated) setProspect(updated);
        return;
      }
      await supabase.from("prospects").update({ notes_internes: val }).eq("id", prospect.id);
    }, 1000);
  };

  const insertQuickNote = (text: string) => {
    const newNotes = notesInternes ? `${notesInternes}\n${text}` : text;
    autoSaveNotes(newNotes);
  };

  const startCall = async () => {
    if (!prospect) return;
    const now = new Date();
    setCallActive(true); setCallStart(now); setCallDuration(0); setCallQualification(""); qualFieldsChangedRef.current = false;
    if (isLocalProspect) {
      const updated = updateLocalProspect(prospect.id, { total_attempts: (prospect.total_attempts || 0) + 1 });
      if (updated) setProspect(updated);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("call_sessions").insert({ prospect_id: prospect.id, user_id: user.id, started_at: now.toISOString(), script_id: scriptId }).select().single();
    if (data) setCallSessionId(data.id);
    await supabase.from("prospects").update({ total_attempts: (prospect.total_attempts || 0) + 1 }).eq("id", prospect.id);
  };

  const endCall = async () => {
    if (!callStart) return;
    const ended = new Date();
    const dur = Math.floor((ended.getTime() - callStart.getTime()) / 1000);
    if (isLocalProspect && prospect) {
      appendLocalAction(prospect.id, "call", { duration_seconds: dur, qualification: callQualification || "manual" });
      const updated = updateLocalProspect(prospect.id, {
        total_calls: (prospect.total_calls || 0) + 1,
        last_contact: ended.toISOString(),
      });
      if (updated) setProspect(updated);
      setCallActive(false); setCallStart(null); setCallSessionId(null); setCallQualification("");
      toast({ title: `Appel terminé (${fmtDur(dur)})` });
      fetchData();
      return;
    }
    if (!callSessionId) return;
    await supabase.from("call_sessions").update({ 
      ended_at: ended.toISOString(), 
      duration_seconds: dur,
      call_qualification: callQualification || null,
    }).eq("id", callSessionId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && prospect) {
      await supabase.from("actions_log").insert({ prospect_id: prospect.id, action_type: "call", details: { duration_seconds: dur, script_id: scriptId, qualification: callQualification }, user_id: user.id });
      await supabase.from("prospects").update({ total_calls: (prospect.total_calls || 0) + 1, last_contact: ended.toISOString() }).eq("id", prospect.id);
    }
    setCallActive(false); setCallStart(null); setCallSessionId(null); setCallQualification("");
    toast({ title: `Appel terminé (${fmtDur(dur)})` });
    fetchData();
  };

  const addTag = async (tagId: string) => { await supabase.from("prospect_tags").insert({ prospect_id: id, tag_id: tagId }); fetchData(); };
  const removeTag = async (ptId: string) => { await supabase.from("prospect_tags").delete().eq("id", ptId); fetchData(); };
  const createAndAddTag = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: tag } = await supabase.from("tags").insert({ name, owner_id: user.id }).select().single();
    if (tag) { await supabase.from("prospect_tags").insert({ prospect_id: id, tag_id: tag.id }); fetchData(); }
  };

  const addReminder = async () => {
    if (!reminderDate || !prospect) return;
    if (isLocalProspect) {
      const updated = updateLocalProspect(prospect.id, { next_followup: reminderDate.toISOString() });
      if (updated) setProspect(updated);
      appendLocalAction(prospect.id, "reminder", { reminder_date: format(reminderDate, "yyyy-MM-dd"), reminder_time: reminderTime, reminder_type: reminderType });
      toast({ title: "Rappel planifié ✓" });
      setReminderDate(undefined);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("reminders").insert({ prospect_id: prospect.id, user_id: user.id, reminder_date: format(reminderDate, "yyyy-MM-dd"), reminder_time: reminderTime, reminder_type: reminderType });
    await supabase.from("prospects").update({ next_followup: reminderDate.toISOString() }).eq("id", prospect.id);
    toast({ title: "Rappel planifié ✓" }); setReminderDate(undefined);
    if (autoNext && flowMode) setTimeout(() => goNext(), 800);
  };

  const changeCampaign = async (campaignId: string) => {
    if (!prospect) return;
    const val = campaignId === "none" ? null : campaignId;
    if (isLocalProspect) {
      const updated = updateLocalProspect(prospect.id, { campaign_id: val });
      if (updated) setProspect(updated);
      toast({ title: "Campagne mise à jour" });
      return;
    }
    await supabase.from("prospects").update({ campaign_id: val }).eq("id", prospect.id);
    setProspect({ ...prospect, campaign_id: val });
    toast({ title: "Campagne mise à jour" });
    if (val) {
      const { data: campaign } = await supabase.from("campaigns").select("script_id").eq("id", val).single();
      if (campaign?.script_id) {
        const { data: s } = await supabase.from("scripts").select("id, content").eq("id", campaign.script_id).single();
        if (s) { setScript(s.content); setScriptId(s.id); return; }
      }
    }
    setScript(""); setScriptId(null);
  };

  const switchScript = async (newScriptId: string) => {
    const { data: s } = await supabase.from("scripts").select("id, content").eq("id", newScriptId).single();
    if (s) { setScript(s.content); setScriptId(s.id); setEditingScript(false); }
  };

  const saveScriptEdit = async () => {
    if (!scriptId) return;
    await supabase.from("scripts").update({ content: scriptDraft }).eq("id", scriptId);
    setScript(scriptDraft);
    setEditingScript(false);
    toast({ title: "Script sauvegardé ✓" });
  };

  const goNext = () => {
    if (!flowMode || queueIds.length === 0) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex < queueIds.length) navigate(`/crm/prospects/${queueIds[nextIndex]}?flow=1&queue=${encodeURIComponent(JSON.stringify(queueIds))}`);
    else { toast({ title: "File terminée ! 🎉" }); navigate("/crm/call-queue"); }
  };

  const deleteProspect = async () => {
    if (!prospect) return;
    if (isLocalProspect) {
      deleteLocalProspect(prospect.id);
      toast({ title: "Prospect supprimé" });
      navigate("/crm/prospects");
      return;
    }
    await supabase.from("prospect_tags").delete().eq("prospect_id", prospect.id);
    await supabase.from("actions_log").delete().eq("prospect_id", prospect.id);
    await supabase.from("reminders").delete().eq("prospect_id", prospect.id);
    await supabase.from("call_sessions").delete().eq("prospect_id", prospect.id);
    await supabase.from("prospects").delete().eq("id", prospect.id);
    toast({ title: "Prospect supprimé" });
    navigate("/crm/prospects");
  };

  const archiveProspect = async () => {
    if (!prospect) return;
    if (isLocalProspect) {
      const updated = updateLocalProspect(prospect.id, { status: "hors_cible" });
      if (updated) setProspect(updated);
      toast({ title: "Prospect marqué hors cible" });
      if (flowMode) goNext();
      else navigate("/crm/prospects");
      return;
    }
    await supabase.from("prospects").update({ status: "hors_cible" }).eq("id", prospect.id);
    toast({ title: "Prospect marqué hors cible" });
    if (flowMode) goNext();
    else navigate("/crm/prospects");
  };

  const getRenderedScript = () => {
    if (!script || !prospect) return "<p class='text-muted-foreground'>Aucun script associé. Associez un script via la campagne ou sélectionnez-en un ci-dessus.</p>";
    return renderScriptHtml(script, {
      prenom: prospect.first_name || "",
      nom: prospect.last_name || "",
      entreprise: prospect.company || company?.raison_sociale || "",
      ville: prospect.city || company?.ville || "",
      specialite: prospect.specialty || "",
      poste: prospect.poste || "",
    });
  };

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!prospect) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const linkedTags = prospectTags.map((pt: any) => ({ ptId: pt.id, ...(pt.tags || {}) }));
  const availableTags = allTags.filter((t) => !linkedTags.some((lt: any) => lt.id === t.id));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">{prospect.first_name} {prospect.last_name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
            {prospect.poste && <span className="truncate">{prospect.poste}</span>}
            {company && <span className="truncate">• {company.raison_sociale}</span>}
            <span>🔥 {prospect.score || 0}</span>
            {flowMode && <Badge variant="outline" className="text-[10px]">#{currentIndex + 1}/{queueIds.length}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {flowMode && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <SkipForward className="h-3.5 w-3.5" />
              <Switch checked={autoNext} onCheckedChange={setAutoNext} className="scale-75" />
            </div>
          )}
          <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">N</kbd>
            <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">V</kbd>
            <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">R</kbd>
            <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">I</kbd>
            <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">B</kbd>
          </div>
          {flowMode && <Button size="sm" onClick={goNext}>Suivant <ChevronRight className="ml-1 h-4 w-4" /></Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={archiveProspect}><Archive className="mr-2 h-4 w-4" />Hors cible</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Call bar - responsive */}
      <div className="flex flex-wrap items-center gap-2">
        {!callActive ? (
          <>
            <Button size="sm" onClick={() => { startCall(); if (prospect.phone) window.location.href = `tel:${prospect.phone}`; }}>
              <Timer className="mr-1.5 h-4 w-4" />Appeler
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!prospect.phone}
              title={prospect.phone ? "Envoyer le SMS Bulbiz pré-rempli" : "Aucun numéro de téléphone"}
              onClick={async () => {
                if (!prospect.phone) return;
                const body = await fetchUserSmsTemplate();
                window.location.href = buildSmsLink(prospect.phone, body);
                if (isLocalProspect) {
                  appendLocalAction(prospect.id, "sms_sent", {
                    template: body !== BULBIZ_PITCH_SMS ? "custom" : "bulbiz_pitch",
                    phone: prospect.phone,
                    local: true,
                  });
                  fetchData();
                  return;
                }
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const isCustom = body !== BULBIZ_PITCH_SMS;
                    await supabase.from("actions_log").insert({
                      prospect_id: prospect.id,
                      user_id: user.id,
                      action_type: "sms_sent",
                      details: { template: isCustom ? "custom" : "bulbiz_pitch", phone: prospect.phone },
                    });
                    fetchData();
                  }
                } catch (e) {
                  // silent: l'app SMS s'est déjà ouverte
                }
              }}
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />SMS Bulbiz
            </Button>
          </>
        ) : (
          <>
            <Select value={callQualification} onValueChange={setCallQualification}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Qualification" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="repondeur">📞 Répondeur</SelectItem>
                <SelectItem value="contact_argumente">💬 Contact argumenté</SelectItem>
                <SelectItem value="non_joignable">❌ Non joignable</SelectItem>
                <SelectItem value="faux_numero">🚫 Faux numéro</SelectItem>
                <SelectItem value="rappel_demande">🔄 Rappel demandé</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" onClick={endCall}>
              <TimerOff className="mr-1.5 h-4 w-4" />Fin ({fmtDur(callDuration)})
            </Button>
          </>
        )}
        <Select value={prospect.status} onValueChange={updateStatus}>
          <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={prospect.product_status || "prospect"} onValueChange={(v) => updateField("product_status", v)}>
          <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{PRODUCT_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={prospect.campaign_id || "none"} onValueChange={changeCampaign}>
          <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Campagne" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 3 columns: Script | Contact+Qualification | Company+Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Col 1: Script - hidden on mobile by default, shown via toggle */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">📝 Script</CardTitle>
              <div className="flex items-center gap-1">
                {scriptId && !editingScript && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setScriptDraft(script); setEditingScript(true); }}>
                    <Pencil className="h-3 w-3 mr-1" />Modifier
                  </Button>
                )}
                {editingScript && (
                  <Button size="sm" variant="default" className="h-6 text-xs" onClick={saveScriptEdit}>
                    <Save className="h-3 w-3 mr-1" />Sauver
                  </Button>
                )}
              </div>
            </div>
            <Select value={scriptId || ""} onValueChange={switchScript}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Changer de script" /></SelectTrigger>
              <SelectContent>
                {allScripts.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {editingScript ? (
              <RichTextEditor
                content={scriptDraft}
                onChange={setScriptDraft}
                minHeight="300px"
              />
            ) : (
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed [&_p]:my-0.5"
                dangerouslySetInnerHTML={{ __html: getRenderedScript() }}
              />
            )}
          </CardContent>
        </Card>

        {/* Col 2: Contact + Qualification */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">👤 Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <EditableField label="Prénom" value={prospect.first_name} onChange={(v) => updateField("first_name", v)} />
              <EditableField label="Nom" value={prospect.last_name} onChange={(v) => updateField("last_name", v)} />
              <EditableField label="Poste" value={prospect.poste} onChange={(v) => updateField("poste", v)} />
              <div className="space-y-1">
                <EditableField label="Téléphone" value={prospect.phone} onChange={(v) => updateField("phone", v)} copyable />
                {prospect.phone && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const smsSent = actions.some(a => a.action_type === "sms_sent");
                      return (
                        <button
                          type="button"
                          onClick={async () => {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;
                            if (!smsSent) {
                              await supabase.from("actions_log").insert({
                                prospect_id: prospect.id,
                                user_id: user.id,
                                action_type: "sms_sent",
                                details: { phone: prospect.phone, manual: true },
                              });
                              toast({ title: "SMS marqué comme envoyé ✅" });
                            } else {
                              const { data: last } = await supabase
                                .from("actions_log")
                                .select("id")
                                .eq("prospect_id", prospect.id)
                                .eq("action_type", "sms_sent")
                                .order("created_at", { ascending: false })
                                .limit(1)
                                .maybeSingle();
                              if (last) {
                                await supabase.from("actions_log").delete().eq("id", last.id);
                                toast({ title: "Marquage SMS retiré" });
                              }
                            }
                            fetchData();
                          }}
                          className={`flex items-center gap-1.5 cursor-pointer select-none rounded-md border px-3 py-1.5 transition-colors ${
                            smsSent
                              ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {smsSent ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          <span className={`text-xs ${smsSent ? "font-semibold" : "font-medium"}`}>SMS envoyé</span>
                        </button>
                      );
                    })()}
                    {actions.filter(a => a.action_type === "sms_sent").length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        💬 {actions.filter(a => a.action_type === "sms_sent").length} SMS envoyé(s)
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <EditableField label="Email" value={prospect.email} onChange={(v) => updateField("email", v)} copyable type="email" />
                <div className="flex items-center gap-2">
                  {prospect.email ? (
                    <Badge variant="outline" className="text-[10px]">
                      📧 {actions.filter(a => a.action_type === "email_sent").length} email(s) envoyé(s)
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={async () => {
                        toast({ title: "Recherche en cours..." });
                        const { data, error } = await supabase.functions.invoke("find-prospect-emails", {
                          body: { prospect_ids: [prospect.id] },
                        });
                        if (data?.ok && data.found > 0) {
                          const found = data.results.find((r: any) => r.email);
                          if (found) {
                            setProspect({ ...prospect, email: found.email });
                            toast({ title: `Email trouvé : ${found.email}` });
                          }
                        } else {
                          toast({ title: "Aucun email trouvé", variant: "destructive" });
                        }
                      }}
                    >
                      🔍 Trouver email
                    </Button>
                  )}
                </div>
              </div>
              <EditableField label="Spécialité" value={prospect.specialty} onChange={(v) => updateField("specialty", v)} />
              <EditableField label="Ville" value={prospect.city} onChange={(v) => updateField("city", v)} />
              <EditableField label="Source" value={prospect.source} onChange={(v) => updateField("source", v)} />
              {prospect.linkedin && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">LinkedIn</span>
                  <a href={prospect.linkedin} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline"><Link2 className="h-3 w-3" />Profil</a>
                </div>
              )}
            </div>
            {/* Qualification */}
            <div className="pt-2 border-t space-y-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Qualification</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-14">Intérêt</span>
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => updateField("interest_level", n)} className="focus:outline-none">
                    <Star className={cn("h-4 w-4", n <= (prospect.interest_level || 0) ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Chantiers / sem.</span>
                  <Input type="number" className="h-7 text-xs" value={prospect.nb_chantiers_semaine ?? ""} onChange={(e) => updateField("nb_chantiers_semaine", e.target.value ? parseInt(e.target.value) : null)} placeholder="0" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Devis / sem.</span>
                  <Input type="number" className="h-7 text-xs" value={prospect.nb_devis_semaine ?? ""} onChange={(e) => updateField("nb_devis_semaine", e.target.value ? parseInt(e.target.value) : null)} placeholder="0" />
                </div>
                <MiniSelect label="Structure" value={prospect.structure_entreprise} options={STRUCTURE_OPTIONS.map(s => ({ value: s.value || "none", label: s.label }))} onChange={(v) => updateField("structure_entreprise", v === "none" ? "" : v)} />
                <MiniSelect label="Temps admin" value={prospect.temps_admin_jour} options={TEMPS_ADMIN_OPTIONS.map(t => ({ value: t.value || "none", label: t.label }))} onChange={(v) => updateField("temps_admin_jour", v === "none" ? "" : v)} />
                <MiniSelect label="Urgence" value={prospect.urgency} options={URGENCY_OPTIONS.map(u => ({ value: u.value || "none", label: u.label }))} onChange={(v) => updateField("urgency", v === "none" ? "" : v)} />
              </div>
              {/* Score de dispersion */}
              <div>
                <span className="text-xs text-muted-foreground">Dispersion</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} onClick={() => updateField("score_dispersion", n)} className={cn("h-6 w-6 rounded text-xs font-bold border transition-colors", n <= (prospect.score_dispersion || 0) ? "bg-destructive/80 text-destructive-foreground border-destructive" : "bg-muted text-muted-foreground border-border hover:border-primary/50")}>
                      {n}
                    </button>
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">{prospect.score_dispersion === 1 ? "Centralisé" : prospect.score_dispersion === 5 ? "Gros bazar" : ""}</span>
                </div>
              </div>
            </div>
            {/* Tags */}
            <div className="pt-2 border-t space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1"><Tag className="h-3 w-3" />Tags</span>
              <div className="flex flex-wrap gap-1">
                {linkedTags.map((t: any) => <Badge key={t.ptId} variant="secondary" className="cursor-pointer text-[10px]" onClick={() => removeTag(t.ptId)}>#{t.name} ×</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableTags.map((t) => <Badge key={t.id} variant="outline" className="cursor-pointer text-[10px] hover:bg-primary/10" onClick={() => addTag(t.id)}>+ {t.name}</Badge>)}
                {DEFAULT_TAGS.filter(d => !allTags.some(t => t.name === d)).map((d) => <Badge key={d} variant="outline" className="cursor-pointer text-[10px] hover:bg-primary/10" onClick={() => createAndAddTag(d)}>+ {d}</Badge>)}
              </div>
            </div>
            {/* Activation dates */}
            {(prospect.date_compte_cree || prospect.date_derniere_activite) && (
              <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                {prospect.date_compte_cree && <p>📅 Compte créé : {new Date(prospect.date_compte_cree).toLocaleDateString("fr-FR")}</p>}
                {prospect.date_premiere_connexion && <p>🔑 1ère connexion : {new Date(prospect.date_premiere_connexion).toLocaleDateString("fr-FR")}</p>}
                {prospect.date_derniere_activite && <p>⏰ Dernière activité : {new Date(prospect.date_derniere_activite).toLocaleDateString("fr-FR")}</p>}
                {(prospect.nb_devis_crees > 0 || prospect.nb_clients_crees > 0) && (
                  <p>📊 {prospect.nb_devis_crees || 0} devis • {prospect.nb_clients_crees || 0} clients</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Col 3: Score + Company + Actions */}
        <div className="space-y-3">
          {/* Score breakdown */}
          <ScoreBreakdown prospect={prospect} company={company} />
          {/* Company */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {company ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <EditableField label="Raison sociale" value={company.raison_sociale} onChange={(v) => updateCompanyField("raison_sociale", v)} small />
                    <EditableField label="SIRET" value={company.siret} onChange={(v) => updateCompanyField("siret", v)} copyable small />
                    <EditableField label="SIREN" value={company.siren} onChange={(v) => updateCompanyField("siren", v)} copyable small />
                    <EditableField label="Code NAF" value={company.code_naf} onChange={(v) => updateCompanyField("code_naf", v)} small />
                    <EditableField label="Effectif" value={company.tranche_effectif} onChange={(v) => updateCompanyField("tranche_effectif", v)} small />
                    <EditableField label="Ville" value={company.ville} onChange={(v) => updateCompanyField("ville", v)} small />
                    <EditableField label="Tél." value={company.telephone_standard} onChange={(v) => updateCompanyField("telephone_standard", v)} small />
                    <EditableField label="Site web" value={company.site_internet} onChange={(v) => updateCompanyField("site_internet", v)} small />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {company.site_internet && <a href={company.site_internet.startsWith("http") ? company.site_internet : `https://${company.site_internet}`} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline"><Globe className="h-3 w-3" />Ouvrir</a>}
                    {company.linkedin_entreprise && <a href={company.linkedin_entreprise} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline"><Link2 className="h-3 w-3" />LinkedIn</a>}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs text-center py-2">Aucune entreprise liée</p>
              )}
            </CardContent>
          </Card>

          {/* Quick actions + Reminder */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">⚡ Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus("rdv_booke")}><CalendarCheck className="mr-1 h-3 w-3" />RDV</Button>
                <Button size="sm" variant="outline" className="text-xs h-7" disabled><Mail className="mr-1 h-3 w-3" />Email</Button>
              </div>
              {/* Appointment info */}
              {appointment && (
                <div className="p-2 rounded bg-primary/10 border border-primary/20 text-xs space-y-1">
                  <p className="font-semibold text-primary">📅 RDV booké</p>
                  <p>{new Date(appointment.appointment_date).toLocaleDateString("fr-FR")} à {appointment.appointment_time?.slice(0, 5)}</p>
                  {appointment.address && <p>📍 {appointment.address}</p>}
                  {appointment.notes && <p>💬 {appointment.notes}</p>}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="text-[10px] h-6 flex-1" onClick={() => { setRdvDialogMode("edit"); setRdvDialogOpen(true); }}>✏️ Modifier</Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-6 flex-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRdvDialogMode("cancel"); setRdvDialogOpen(true); }}>❌ Annuler</Button>
                  </div>
                </div>
              )}
              {/* Rappel rapide */}
              <div className="pt-2 border-t space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Planifier rappel</span>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("flex-1 text-xs h-7", !reminderDate && "text-muted-foreground")}>
                        {reminderDate ? format(reminderDate, "dd/MM/yyyy") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={reminderDate} onSelect={setReminderDate} className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                  <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="w-20 h-7 text-xs" />
                </div>
                <div className="flex gap-1">
                  <Select value={reminderType} onValueChange={setReminderType}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Appel</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs" onClick={addReminder} disabled={!reminderDate}>OK</Button>
                </div>
              </div>
              {/* Stats */}
              <div className="pt-2 border-t text-xs text-muted-foreground space-y-0.5">
                <p>📞 {prospect.total_calls || 0} appels • {prospect.total_attempts || 0} tentatives</p>
                {prospect.last_contact && <p>Dernier : {new Date(prospect.last_contact).toLocaleString("fr-FR")}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes rapides */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />Notes d'appel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {QUICK_NOTES.map((qn) => (
              <Button key={qn.label} size="sm" variant="outline" className="text-[10px] sm:text-xs h-6" onClick={() => insertQuickNote(qn.text)}>
                {qn.label}
              </Button>
            ))}
          </div>
          <Textarea
            value={notesInternes}
            onChange={(e) => autoSaveNotes(e.target.value)}
            rows={3}
            className="text-sm"
            placeholder="Notes libres... (sauvegarde automatique)"
          />
          <p className="text-[10px] text-muted-foreground">💾 Sauvegarde automatique</p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm uppercase tracking-wide text-muted-foreground">Journal d'actions</CardTitle></CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune action enregistrée</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {actions.map((a) => (
                <div key={a.id} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                  {a.action_type === "email_sent" ? (
                    <Mail className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  ) : a.action_type === "sms_sent" ? (
                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {a.action_type === "email_sent" ? (
                      <p className="font-medium truncate">
                        📧 Email envoyé{a.details?.subject ? ` : "${a.details.subject}"` : ""}
                      </p>
                    ) : a.action_type === "sms_sent" ? (
                      <p className="font-medium truncate">
                        💬 SMS Bulbiz envoyé
                      </p>
                    ) : (
                      <p className="font-medium capitalize truncate">{a.action_type.replace(/_/g, " ")}
                        {a.details?.duration_seconds ? ` (${fmtDur(a.details.duration_seconds)})` : ""}
                        {a.details?.from ? ` : ${a.details.from} → ${a.details.to}` : ""}
                        {a.details?.cancellation_reason ? ` — ${a.details.cancellation_reason}` : ""}
                        {a.details?.qualification ? ` [${a.details.qualification}]` : ""}
                      </p>
                    )}
                    <p className="text-muted-foreground text-[10px]">
                      {new Date(a.created_at).toLocaleDateString("fr-FR")} à {new Date(a.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RDV Booking Dialog */}
      <RdvBookingDialog
        open={rdvDialogOpen}
        onOpenChange={setRdvDialogOpen}
        prospectId={prospect.id}
        prospectName={`${prospect.first_name} ${prospect.last_name}`}
        existingAppointment={appointment}
        mode={rdvDialogMode}
        onBooked={() => {
          fetchData();
          if (rdvDialogMode === "create") {
            setProspect({ ...prospect, status: "rdv_booke" });
            if (autoNext && flowMode) setTimeout(() => goNext(), 800);
          } else if (rdvDialogMode === "cancel") {
            setProspect({ ...prospect, status: "rappel" });
          }
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera définitivement {prospect.first_name} {prospect.last_name} et tout son historique.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProspect} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniSelect({ label, value, options, onChange }: { label: string; value?: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
