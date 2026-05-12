import { useState, useEffect } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { Button } from "@/crm/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/crm/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/crm/components/ui/dialog";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/crm/hooks/use-toast";
import RichTextEditor from "@/crm/components/RichTextEditor";

export default function Scripts() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const fetchScripts = async () => {
    const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
    if (data) setScripts(data);
  };

  useEffect(() => { fetchScripts(); }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editId) {
      await supabase.from("scripts").update({ title, content }).eq("id", editId);
      toast({ title: "Script modifié" });
    } else {
      await supabase.from("scripts").insert({ title, content, owner_id: user.id });
      toast({ title: "Script créé" });
    }
    setOpen(false);
    setEditId(null);
    setTitle("");
    setContent("");
    fetchScripts();
  };

  const handleEdit = (s: any) => {
    setEditId(s.id);
    setTitle(s.title);
    setContent(s.content);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scripts").delete().eq("id", id);
    toast({ title: "Script supprimé" });
    fetchScripts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts d'appel</h1>
          <p className="text-muted-foreground">Gérez vos scripts avec couleurs, mise en forme et variables dynamiques</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setTitle(""); setContent(""); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouveau script</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Modifier" : "Créer"} un script</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Script plombiers" />
              </div>
              <div className="space-y-2">
                <Label>Contenu</Label>
                <p className="text-xs text-muted-foreground">Variables : {"{{prenom}}"}, {"{{nom}}"}, {"{{entreprise}}"}, {"{{ville}}"}, {"{{specialite}}"}, {"{{poste}}"}</p>
                <RichTextEditor content={content} onChange={setContent} minHeight="400px" />
              </div>
              <Button onClick={handleSave} className="w-full">{editId ? "Enregistrer" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scripts.length === 0 ? (
          <p className="text-muted-foreground col-span-2 text-center py-8">Aucun script créé</p>
        ) : scripts.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{s.title}</CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Edit className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="text-sm text-muted-foreground line-clamp-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: s.content }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
