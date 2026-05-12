import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
import { Button } from "@/crm/components/ui/button";
import { Card, CardContent } from "@/crm/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/crm/components/ui/table";
import { Badge } from "@/crm/components/ui/badge";
import { Plus, Eye, Users, MoreHorizontal, Copy, Archive, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/crm/components/ui/dialog";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/crm/components/ui/select";
import { useToast } from "@/crm/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/crm/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/crm/components/ui/alert-dialog";
import type { Profile } from "@/crm/context/ProfileContext";

const statusColors: Record<string, string> = {
  active: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  pause: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  done: "bg-muted text-muted-foreground",
  archived: "bg-muted/50 text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  pause: "En pause",
  done: "Terminée",
  archived: "Archivée",
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [prospectCounts, setProspectCounts] = useState<Record<string, number>>({});
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState("active");
  const [assignedTo, setAssignedTo] = useState("none");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"campaign_only" | "detach" | "all">("campaign_only");
  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameName, setRenameName] = useState("");
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (data) {
      setCampaigns(data);
      const counts: Record<string, number> = {};
      for (const c of data) {
        const { count } = await supabase.from("prospects").select("*", { count: "exact", head: true }).eq("campaign_id", c.id);
        counts[c.id] = count || 0;
      }
      setProspectCounts(counts);
    }
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, full_name, email, crm_role, phone, avatar_url").order("full_name");
    setTeamMembers(((data || []) as Profile[]).map(m => ({ crm_role: "commercial", email: null, phone: null, ...m })));
  };

  useEffect(() => { fetchCampaigns(); fetchTeamMembers(); }, []);

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = { name, objective, status, owner_id: user.id };
    if (assignedTo && assignedTo !== "none") payload.assigned_to = assignedTo;
    const { error } = await supabase.from("campaigns").insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campagne créée" });
      setOpen(false);
      setName("");
      setObjective("");
      setAssignedTo("none");
      fetchCampaigns();
    }
  };

  const archiveCampaign = async (id: string) => {
    await supabase.from("campaigns").update({ status: "archived" }).eq("id", id);
    toast({ title: "Campagne archivée" });
    fetchCampaigns();
  };

  const duplicateCampaign = async (c: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("campaigns").insert({
      name: `${c.name} (copie)`,
      objective: c.objective,
      status: "active",
      script_id: c.script_id,
      email_template_id: c.email_template_id,
      owner_id: user.id,
    });
    toast({ title: "Campagne dupliquée" });
    fetchCampaigns();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    if (deleteMode === "detach") {
      await supabase.from("prospects").update({ campaign_id: null }).eq("campaign_id", id);
    } else if (deleteMode === "all") {
      const { data: prospects } = await supabase.from("prospects").select("id").eq("campaign_id", id);
      if (prospects) {
        for (const p of prospects) {
          await supabase.from("prospect_tags").delete().eq("prospect_id", p.id);
          await supabase.from("actions_log").delete().eq("prospect_id", p.id);
          await supabase.from("reminders").delete().eq("prospect_id", p.id);
          await supabase.from("call_sessions").delete().eq("prospect_id", p.id);
          await supabase.from("prospects").delete().eq("id", p.id);
        }
      }
    }

    await supabase.from("campaigns").delete().eq("id", id);
    toast({ title: "Campagne supprimée" });
    setDeleteTarget(null);
    fetchCampaigns();
  };

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    await supabase.from("campaigns").update({ name: renameName.trim() }).eq("id", renameTarget.id);
    toast({ title: "Campagne renommée" });
    setRenameTarget(null);
    fetchCampaigns();
  };

  const visibleCampaigns = showArchived ? campaigns : campaigns.filter(c => c.status !== "archived");

  // Mobile card for campaign
  const MobileCampaignCard = ({ c }: { c: any }) => (
    <Card className="cursor-pointer" onClick={() => navigate(`/crm/campaigns/${c.id}`)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground truncate">{c.objective || "—"}</p>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <Badge className={`text-[10px] ${statusColors[c.status] || "bg-muted text-muted-foreground"}`}>{statusLabels[c.status] || c.status}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => navigate(`/crm/campaigns/${c.id}`)}><Eye className="mr-2 h-4 w-4" />Voir</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setRenameTarget(c); setRenameName(c.name); }}><Pencil className="mr-2 h-4 w-4" />Renommer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateCampaign(c)}><Copy className="mr-2 h-4 w-4" />Dupliquer</DropdownMenuItem>
                <DropdownMenuSeparator />
                {c.status !== "archived" && <DropdownMenuItem onClick={() => archiveCampaign(c.id)}><Archive className="mr-2 h-4 w-4" />Archiver</DropdownMenuItem>}
                {c.status === "archived" && <DropdownMenuItem onClick={async () => { await supabase.from("campaigns").update({ status: "active" }).eq("id", c.id); fetchCampaigns(); }}><Archive className="mr-2 h-4 w-4" />Réactiver</DropdownMenuItem>}
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{prospectCounts[c.id] ?? "—"} prospects</span>
          {c.assigned_to && (() => {
            const m = teamMembers.find(t => t.user_id === c.assigned_to);
            return m ? <span>👤 {m.full_name || m.email}</span> : null;
          })()}
          <span>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="crm-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--crm-muted-foreground))' }}>
          {visibleCampaigns.length} campagne{visibleCampaigns.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="mr-1.5 h-3.5 w-3.5" />{showArchived ? "Masquer archivées" : "Voir archivées"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Nouvelle campagne</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une campagne</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Plombiers Paris" />
                </div>
                <div className="space-y-2">
                  <Label>Objectif</Label>
                  <Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex: RDV démo" />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pause">En pause</SelectItem>
                      <SelectItem value="done">Terminée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Choisir un commercial" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Non assigné</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email || m.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile: Card view */}
      <div className="block md:hidden space-y-2">
        {visibleCampaigns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune campagne</p>
        ) : (
          visibleCampaigns.map((c) => <MobileCampaignCard key={c.id} c={c} />)
        )}
      </div>

      {/* Desktop: Table view */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Objectif</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Prospects</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCampaigns.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune campagne</TableCell></TableRow>
              ) : visibleCampaigns.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/crm/campaigns/${c.id}`)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.objective || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.assigned_to
                      ? (teamMembers.find(t => t.user_id === c.assigned_to)?.full_name
                          || teamMembers.find(t => t.user_id === c.assigned_to)?.email
                          || "—")
                      : <span className="text-muted-foreground/50 text-xs italic">Non assigné</span>
                    }
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />{prospectCounts[c.id] ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell><Badge className={statusColors[c.status] || "bg-muted text-muted-foreground"}>{statusLabels[c.status] || c.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/crm/campaigns/${c.id}`)}><Eye className="mr-2 h-4 w-4" />Voir</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRenameTarget(c); setRenameName(c.name); }}><Pencil className="mr-2 h-4 w-4" />Renommer</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateCampaign(c)}><Copy className="mr-2 h-4 w-4" />Dupliquer</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {c.status !== "archived" && <DropdownMenuItem onClick={() => archiveCampaign(c.id)}><Archive className="mr-2 h-4 w-4" />Archiver</DropdownMenuItem>}
                        {c.status === "archived" && <DropdownMenuItem onClick={async () => { await supabase.from("campaigns").update({ status: "active" }).eq("id", c.id); fetchCampaigns(); }}><Archive className="mr-2 h-4 w-4" />Réactiver</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Choisissez le mode de suppression :</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="deleteMode" checked={deleteMode === "campaign_only"} onChange={() => setDeleteMode("campaign_only")} />
              Supprimer la campagne uniquement
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="deleteMode" checked={deleteMode === "detach"} onChange={() => setDeleteMode("detach")} />
              Détacher les prospects
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-destructive">
              <input type="radio" name="deleteMode" checked={deleteMode === "all"} onChange={() => setDeleteMode("all")} />
              Supprimer campagne ET prospects
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => { if (!v) setRenameTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renommer la campagne</DialogTitle></DialogHeader>
          <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} />
          <Button onClick={handleRename}>Enregistrer</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
