import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Button } from "@/crm/components/ui/button";
import { Badge } from "@/crm/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/crm/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/crm/components/ui/dialog";
import { Input } from "@/crm/components/ui/input";
import { Checkbox } from "@/crm/components/ui/checkbox";
import { ArrowLeft, Eye, Phone, Upload, Users, UserPlus, Search, X } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import QuickAddProspect from "@/crm/components/QuickAddProspect";

const STATUS_OPTIONS = [
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

const statusColors: Record<string, string> = {
  active: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  pause: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  done: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = {
  active: "Active",
  pause: "En pause",
  done: "Terminée",
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [allProspects, setAllProspects] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).single();
    if (c) setCampaign(c);
    const { data: p } = await supabase.from("prospects").select("*").eq("campaign_id", id).order("created_at", { ascending: false });
    if (p) setProspects(p);
  };

  useEffect(() => { fetchData(); }, [id]);

  const updateProspectStatus = async (prospectId: string, status: string) => {
    await supabase.from("prospects").update({ status }).eq("id", prospectId);
    setProspects((prev) => prev.map((p) => (p.id === prospectId ? { ...p, status } : p)));
  };

  const removeFromCampaign = async (prospectId: string) => {
    await supabase.from("prospects").update({ campaign_id: null }).eq("id", prospectId);
    setProspects(prev => prev.filter(p => p.id !== prospectId));
    toast({ title: "Prospect retiré de la campagne" });
  };

  // ─── Assign prospects dialog ──────────────────────────────────────
  const openAssignDialog = async () => {
    const { data } = await supabase.from("prospects").select("id, first_name, last_name, company, phone, email, campaign_id, city").order("created_at", { ascending: false }).limit(500);
    if (data) setAllProspects(data);
    setSelectedIds(new Set());
    setSearchQuery("");
    setAssignOpen(true);
  };

  const filteredAssignProspects = useMemo(() => {
    const currentIds = new Set(prospects.map(p => p.id));
    const available = allProspects.filter(p => !currentIds.has(p.id));
    if (!searchQuery.trim()) return available;
    const q = searchQuery.toLowerCase();
    return available.filter(p =>
      [p.first_name, p.last_name, p.company, p.phone, p.email, p.city]
        .filter(Boolean).some(v => v.toLowerCase().includes(q))
    );
  }, [allProspects, prospects, searchQuery]);

  const toggleSelect = (pid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAssignProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssignProspects.map(p => p.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    const ids = Array.from(selectedIds);
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      await supabase.from("prospects").update({ campaign_id: id }).in("id", batch);
    }
    toast({ title: `${ids.length} prospect(s) affecté(s) à la campagne` });
    setAssigning(false);
    setAssignOpen(false);
    fetchData();
  };

  const statusCounts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!campaign) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/campaigns")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status]}>{statusLabels[campaign.status]}</Badge>
          </div>
          {campaign.objective && <p className="text-muted-foreground">{campaign.objective}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAssignDialog}>
            <UserPlus className="mr-2 h-4 w-4" />Affecter des prospects
          </Button>
          <QuickAddProspect campaignId={id} onCreated={() => fetchData()} triggerVariant="outline" />
          <Button onClick={() => navigate("/crm/import")}>
            <Upload className="mr-2 h-4 w-4" />Importer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{prospects.length}</p>
            <p className="text-xs text-muted-foreground">Total prospects</p>
          </CardContent>
        </Card>
        {STATUS_OPTIONS.filter((s) => statusCounts[s.value]).map((s) => (
          <Card key={s.value}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{statusCounts[s.value]}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospect list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />Prospects ({prospects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Société</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun prospect dans cette campagne
                  </TableCell>
                </TableRow>
              ) : (
                prospects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                    <TableCell>{p.company || "—"}</TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>{p.city || "—"}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateProspectStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/crm/prospects/${p.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.phone && (
                          <Button size="icon" variant="ghost" asChild>
                            <a href={`tel:${p.phone}`}><Phone className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => removeFromCampaign(p.id)} title="Retirer de la campagne">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign prospects dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Affecter des prospects à « {campaign.name} »</DialogTitle>
            <DialogDescription>Recherchez et sélectionnez les prospects à ajouter à cette campagne.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher par nom, société, téléphone, email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedIds.size} sélectionné(s)</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Tout désélectionner</Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredAssignProspects.length > 0 && selectedIds.size === filteredAssignProspects.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Campagne actuelle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {searchQuery ? "Aucun résultat" : "Tous les prospects sont déjà dans cette campagne"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignProspects.slice(0, 100).map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => toggleSelect(p.id)}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                      <TableCell>{p.company || "—"}</TableCell>
                      <TableCell>{p.phone || "—"}</TableCell>
                      <TableCell>
                        {p.campaign_id ? <Badge variant="outline" className="text-xs">Autre campagne</Badge> : <span className="text-muted-foreground text-xs">Aucune</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredAssignProspects.length > 100 && (
              <p className="text-xs text-muted-foreground text-center py-2">Affichage limité à 100 — affinez votre recherche</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Annuler</Button>
            <Button onClick={handleAssign} disabled={selectedIds.size === 0 || assigning}>
              <UserPlus className="mr-2 h-4 w-4" />
              {assigning ? "Affectation…" : `Affecter ${selectedIds.size} prospect(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
