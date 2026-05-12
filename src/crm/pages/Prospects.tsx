import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Button } from "@/crm/components/ui/button";
import { Card, CardContent } from "@/crm/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/crm/components/ui/table";
import { Badge } from "@/crm/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Upload, Eye, Phone, Filter, Download, Star, Trash2, ArrowRightLeft, FolderOpen, Search, Loader2, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Input } from "@/crm/components/ui/input";
import { Checkbox } from "@/crm/components/ui/checkbox";
import { PRODUCT_STATUS_OPTIONS, getProductStatusBadge } from "@/crm/lib/productStatus";
import QuickAddProspect from "@/crm/components/QuickAddProspect";
import { useToast } from "@/crm/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/crm/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/crm/components/ui/dialog";
import { deleteLocalProspect, isLocalProspectId, listLocalProspects, updateLocalProspect } from "@/crm/lib/localMode";

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "nouveau", label: "Nouveau" },
  { value: "appele_non_joint", label: "Appelé – Non joint" },
  { value: "rappel", label: "Rappel" },
  { value: "interesse", label: "Intéressé" },
  { value: "lien_envoye", label: "Lien envoyé" },
  { value: "rdv_booke", label: "RDV booké" },
  { value: "refus", label: "Refus" },
  { value: "mauvais_numero", label: "Mauvais numéro" },
  { value: "hors_cible", label: "Hors cible" },
];

export default function Prospects() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [nafFilter, setNafFilter] = useState("");
  const [dispersionFilter, setDispersionFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [bulkCampaignOpen, setBulkCampaignOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCampaignId, setBulkCampaignId] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [findingEmails, setFindingEmails] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const campaignMap = useMemo(() => {
    const m: Record<string, string> = {};
    campaigns.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [campaigns]);

  const fetchProspects = async () => {
    let query = supabase.from("prospects").select("*, companies(raison_sociale, code_naf, region, tranche_effectif, date_creation)").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (productStatusFilter !== "all") query = query.eq("product_status", productStatusFilter);
    if (campaignFilter === "none") query = query.is("campaign_id", null);
    else if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);
    if (scoreMin) query = query.gte("score", parseInt(scoreMin));
    const { data } = await query;
    let filtered = [...(data || []), ...listLocalProspects()];
    if (filtered) {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((p: any) =>
          `${p.first_name} ${p.last_name} ${p.company} ${p.city} ${p.phone} ${p.email}`.toLowerCase().includes(q)
        );
      }
      if (regionFilter) filtered = filtered.filter((p: any) => p.companies?.region?.toLowerCase().includes(regionFilter.toLowerCase()));
      if (nafFilter) filtered = filtered.filter((p: any) => p.companies?.code_naf?.startsWith(nafFilter));
      if (dispersionFilter === "high") filtered = filtered.filter((p: any) => (p.score_dispersion || 0) >= 4);
      else if (dispersionFilter === "medium") filtered = filtered.filter((p: any) => [2, 3].includes(p.score_dispersion || 0));
      else if (dispersionFilter === "low") filtered = filtered.filter((p: any) => (p.score_dispersion || 0) === 1);
      setProspects(filtered);
    }
  };

  useEffect(() => { fetchProspects(); }, [statusFilter, productStatusFilter, campaignFilter, scoreMin, dispersionFilter]);
  useEffect(() => { supabase.from("campaigns").select("id, name").then(({ data }) => { if (data) setCampaigns(data); }); }, []);

  const updateStatus = async (id: string, status: string) => {
    if (isLocalProspectId(id)) updateLocalProspect(id, { status });
    else await supabase.from("prospects").update({ status }).eq("id", id);
    fetchProspects();
  };

  const changeProspectCampaign = async (prospectId: string, campaignId: string | null) => {
    if (isLocalProspectId(prospectId)) updateLocalProspect(prospectId, { campaign_id: campaignId });
    else await supabase.from("prospects").update({ campaign_id: campaignId }).eq("id", prospectId);
    fetchProspects();
    toast({ title: campaignId ? `Prospect affecté à "${campaignMap[campaignId] || ""}"` : "Prospect retiré de la campagne" });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === prospects.length) setSelected(new Set());
    else setSelected(new Set(prospects.map(p => p.id)));
  };

  const bulkChangeStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const ids = Array.from(selected);
    ids.filter(isLocalProspectId).forEach((id) => updateLocalProspect(id, { status: bulkStatus }));
    const remoteIds = ids.filter((id) => !isLocalProspectId(id));
    for (let i = 0; i < remoteIds.length; i += 50) {
      await supabase.from("prospects").update({ status: bulkStatus }).in("id", remoteIds.slice(i, i + 50));
    }
    toast({ title: `${selected.size} prospects mis à jour` });
    setSelected(new Set());
    setBulkStatusOpen(false);
    fetchProspects();
  };

  const bulkMoveCampaign = async () => {
    if (!bulkCampaignId || selected.size === 0) return;
    const cid = bulkCampaignId === "none" ? null : bulkCampaignId;
    const ids = Array.from(selected);
    ids.filter(isLocalProspectId).forEach((id) => updateLocalProspect(id, { campaign_id: cid }));
    const remoteIds = ids.filter((id) => !isLocalProspectId(id));
    for (let i = 0; i < remoteIds.length; i += 50) {
      await supabase.from("prospects").update({ campaign_id: cid }).in("id", remoteIds.slice(i, i + 50));
    }
    toast({ title: `${selected.size} prospects déplacés` });
    setSelected(new Set());
    setBulkCampaignOpen(false);
    fetchProspects();
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    for (const id of selected) {
      if (isLocalProspectId(id)) {
        deleteLocalProspect(id);
      } else {
        await supabase.from("prospect_tags").delete().eq("prospect_id", id);
        await supabase.from("actions_log").delete().eq("prospect_id", id);
        await supabase.from("reminders").delete().eq("prospect_id", id);
        await supabase.from("call_sessions").delete().eq("prospect_id", id);
        await supabase.from("prospects").delete().eq("id", id);
      }
    }
    toast({ title: `${selected.size} prospects supprimés` });
    setSelected(new Set());
    setBulkDeleteOpen(false);
    fetchProspects();
  };

  const bulkFindEmails = async () => {
    const noEmailProspects = prospects.filter((p: any) => !p.email && !isLocalProspectId(p.id));
    if (noEmailProspects.length === 0) {
      toast({ title: "Aucun prospect compatible à enrichir" });
      return;
    }
    setFindingEmails(true);
    const ids = noEmailProspects.map((p: any) => p.id);
    const batchSize = 5;
    let totalFound = 0;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      try {
        const { data } = await supabase.functions.invoke("find-prospect-emails", {
          body: { prospect_ids: batch },
        });
        if (data?.ok) totalFound += data.found || 0;
      } catch { /* continue */ }
    }
    setFindingEmails(false);
    toast({
      title: `Recherche terminée`,
      description: `${totalFound} email(s) trouvé(s) sur ${noEmailProspects.length} prospect(s)`,
    });
    fetchProspects();
  };

  const exportCSV = () => {
    const headers = ["Prénom", "Nom", "Société", "Téléphone", "Email", "Ville", "Statut", "Score", "Intérêt", "NAF", "Région", "Campagne"];
    let csv = headers.join(";") + "\n";
    prospects.forEach((p: any) => {
      csv += [p.first_name, p.last_name, p.company || p.companies?.raison_sociale, p.phone, p.email, p.city, p.status, p.score, p.interest_level, p.companies?.code_naf, p.companies?.region, campaignMap[p.campaign_id] || ""].join(";") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prospects_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Mobile card view for prospects
  const MobileProspectCard = ({ p }: { p: any }) => (
    <Card className="cursor-pointer" onClick={() => navigate(`/crm/prospects/${p.id}`)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{p.first_name} {p.last_name}</p>
            <p className="text-xs text-muted-foreground truncate">{p.companies?.raison_sociale || p.company || "—"}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">{p.status.replace(/_/g, " ")}</Badge>
            {(() => { const b = getProductStatusBadge(p.product_status); return <Badge className={`${b.color} text-[10px]`}>{b.label}</Badge>; })()}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>🔥 {p.score || 0}</span>
          <span>{p.city || "—"}</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t">
          {p.phone && (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" asChild onClick={(e) => e.stopPropagation()}>
              <a href={`tel:${p.phone}`}><Phone className="h-3 w-3 mr-1" />Appeler</a>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/crm/prospects/${p.id}`); }}>
            <Eye className="h-3 w-3 mr-1" />Voir
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="crm-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))' }}>
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outline" size="sm" onClick={bulkFindEmails} disabled={findingEmails}>
            {findingEmails ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
            {findingEmails ? "Recherche..." : "Trouver emails"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1.5 h-3.5 w-3.5" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/crm/import")}><Upload className="mr-1.5 h-3.5 w-3.5" />Importer</Button>
          <QuickAddProspect onCreated={fetchProspects} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.8)', border: '1px solid hsl(var(--crm-border))', borderRadius: '1rem' }}>
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchProspects()} className="w-full sm:w-[200px] h-8 text-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
          <SelectTrigger className="w-[130px] sm:w-[170px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Statut produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous produit</SelectItem>
            {PRODUCT_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[130px] sm:w-[180px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Campagne" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="none">Sans campagne</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Score min" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} className="w-[80px] h-8 text-xs" type="number" />
        <Select value={dispersionFilter} onValueChange={setDispersionFilter}>
          <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm"><SelectValue placeholder="Dispersion" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute dispersion</SelectItem>
            <SelectItem value="high">🔴 Gros bazar (4-5)</SelectItem>
            <SelectItem value="medium">🟡 Moyen (2-3)</SelectItem>
            <SelectItem value="low">🟢 Centralisé (1)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchProspects}>Filtrer</Button>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-xs sm:text-sm font-medium">{selected.size} sélec.</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBulkStatusOpen(true)}>Statut</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBulkCampaignOpen(true)}><ArrowRightLeft className="mr-1 h-3 w-3" />Campagne</Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="mr-1 h-3 w-3" />Suppr.</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>×</Button>
        </div>
      )}

      {/* Mobile: Card view */}
      <div className="block md:hidden space-y-2">
        {prospects.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun prospect</p>
        ) : (
          prospects.map((p) => <MobileProspectCard key={p.id} p={p} />)
        )}
      </div>

      {/* Desktop: Table view */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={prospects.length > 0 && selected.size === prospects.length} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Aucun prospect</TableCell></TableRow>
                ) : prospects.map((p: any) => (
                  <TableRow key={p.id} className={selected.has(p.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div>
                          <span className="font-medium">{p.first_name} {p.last_name}</span>
                          {p.poste && <span className="text-xs text-muted-foreground ml-1">({p.poste})</span>}
                        </div>
                        {p.email ? <Mail className="h-3 w-3 text-primary shrink-0" /> : <Mail className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                      </div>
                    </TableCell>
                    <TableCell>{p.companies?.raison_sociale || p.company || "—"}</TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>{p.city || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{p.score || 0}</span>
                        {(p.interest_level || 0) > 0 && (
                          <div className="flex">{[...Array(p.interest_level)].map((_, i) => <Star key={i} className="h-3 w-3 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.campaign_id || "none"}
                        onValueChange={v => changeProspectCampaign(p.id, v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Aucune</span>
                          </SelectItem>
                          {campaigns.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{c.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.filter(s => s.value !== "all").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {(() => { const b = getProductStatusBadge(p.product_status); return <Badge className={`${b.color} text-[10px]`}>{b.label}</Badge>; })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/crm/prospects/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                        {p.phone && <Button size="icon" variant="ghost" asChild><a href={`tel:${p.phone}`}><Phone className="h-4 w-4" /></a></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk status dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer le statut de {selected.size} prospect(s)</DialogTitle>
            <DialogDescription>Sélectionnez le nouveau statut à appliquer.</DialogDescription>
          </DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger><SelectValue placeholder="Nouveau statut" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.filter(s => s.value !== "all").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={bulkChangeStatus} disabled={!bulkStatus}>Appliquer</Button>
        </DialogContent>
      </Dialog>

      {/* Bulk campaign dialog */}
      <Dialog open={bulkCampaignOpen} onOpenChange={setBulkCampaignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Déplacer {selected.size} prospect(s)</DialogTitle>
            <DialogDescription>Choisissez la campagne de destination.</DialogDescription>
          </DialogHeader>
          <Select value={bulkCampaignId} onValueChange={setBulkCampaignId}>
            <SelectTrigger><SelectValue placeholder="Choisir campagne" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune campagne</SelectItem>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={bulkMoveCampaign} disabled={!bulkCampaignId}>Déplacer</Button>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selected.size} prospect(s) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
