import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/crm/components/ui/dialog";
import { Button } from "@/crm/components/ui/button";
import { Input } from "@/crm/components/ui/input";
import { Label } from "@/crm/components/ui/label";
import { Textarea } from "@/crm/components/ui/textarea";
import { Calendar } from "@/crm/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/crm/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/crm/lib/utils";
import { supabase } from "@/crm/integrations/supabase/client";
import { useToast } from "@/crm/hooks/use-toast";

interface RdvBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectName: string;
  onBooked: () => void;
  /** Pass existing appointment for edit mode */
  existingAppointment?: any;
  mode?: "create" | "edit" | "cancel";
}

export default function RdvBookingDialog({ open, onOpenChange, prospectId, prospectName, onBooked, existingAppointment, mode = "create" }: RdvBookingDialogProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingAppointment && (mode === "edit" || mode === "cancel")) {
      setDate(new Date(existingAppointment.appointment_date));
      setTime(existingAppointment.appointment_time?.slice(0, 5) || "10:00");
      setAddress(existingAppointment.address || "");
      setNotes(existingAppointment.notes || "");
      setCancelReason("");
    } else if (mode === "create") {
      setDate(undefined);
      setTime("10:00");
      setAddress("");
      setNotes("");
      setCancelReason("");
    }
  }, [existingAppointment, mode, open]);

  const handleBook = async () => {
    if (!date) {
      toast({ title: "Veuillez choisir une date", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing active appointment (only on create)
      if (mode === "create") {
        const { data: existing } = await supabase
          .from("appointments").select("id").eq("prospect_id", prospectId).eq("status", "booked").maybeSingle();
        if (existing) {
          toast({ title: "Un RDV est déjà booké pour ce prospect", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      if (mode === "edit" && existingAppointment) {
        await supabase.from("appointments").update({
          appointment_date: format(date, "yyyy-MM-dd"),
          appointment_time: time,
          address,
          notes,
        }).eq("id", existingAppointment.id);

        await supabase.from("actions_log").insert({
          prospect_id: prospectId,
          action_type: "rdv_modified",
          details: { rdv_date: format(date, "yyyy-MM-dd"), rdv_time: time, rdv_address: address },
          user_id: user.id,
        });

        toast({ title: `RDV modifié → ${format(date, "dd/MM/yyyy")} à ${time} ✓` });
      } else {
        await supabase.from("appointments").insert({
          prospect_id: prospectId,
          user_id: user.id,
          appointment_date: format(date, "yyyy-MM-dd"),
          appointment_time: time,
          address,
          notes,
        });

        await supabase.from("prospects").update({ 
          status: "rdv_booke", 
          last_contact: new Date().toISOString() 
        }).eq("id", prospectId);

        await supabase.from("actions_log").insert({
          prospect_id: prospectId,
          action_type: "status_change",
          details: { from: "nouveau", to: "rdv_booke", rdv_date: format(date, "yyyy-MM-dd"), rdv_time: time, rdv_address: address },
          user_id: user.id,
        });

        toast({ title: `RDV booké le ${format(date, "dd/MM/yyyy")} à ${time} ✓` });
      }

      onOpenChange(false);
      onBooked();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!existingAppointment) return;
    if (!cancelReason.trim()) {
      toast({ title: "Veuillez indiquer la raison de l'annulation", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("appointments").update({
        status: "cancelled",
        cancellation_reason: cancelReason,
      }).eq("id", existingAppointment.id);

      // Reset prospect status
      await supabase.from("prospects").update({ status: "rappel" }).eq("id", prospectId);

      await supabase.from("actions_log").insert({
        prospect_id: prospectId,
        action_type: "rdv_cancelled",
        details: { 
          rdv_date: existingAppointment.appointment_date, 
          rdv_time: existingAppointment.appointment_time,
          cancellation_reason: cancelReason,
        },
        user_id: user.id,
      });

      toast({ title: "RDV annulé ✓" });
      onOpenChange(false);
      onBooked();
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "cancel" ? `Annuler le RDV — ${prospectName}` 
    : mode === "edit" ? `Modifier le RDV — ${prospectName}` 
    : `Booker un RDV — ${prospectName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {mode === "cancel" ? (
          <div className="space-y-3">
            <div className="p-2 rounded bg-muted text-xs space-y-0.5">
              <p>📅 {existingAppointment && new Date(existingAppointment.appointment_date).toLocaleDateString("fr-FR")} à {existingAppointment?.appointment_time?.slice(0, 5)}</p>
              {existingAppointment?.address && <p>📍 {existingAppointment.address}</p>}
            </div>
            <div>
              <Label className="text-sm">Raison de l'annulation *</Label>
              <Textarea 
                placeholder="Ex: Prospect plus disponible, reporté, changement de décision..." 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)} 
                rows={3} 
              />
            </div>
            <Button variant="destructive" className="w-full" onClick={handleCancel} disabled={loading || !cancelReason.trim()}>
              {loading ? "En cours..." : "Confirmer l'annulation"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm">Heure</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Adresse / Lieu</Label>
              <Input placeholder="Ex: Bureau, Visio, 12 rue..." value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Notes</Label>
              <Textarea placeholder="Notes supplémentaires..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={handleBook} disabled={loading || !date}>
              {loading ? "En cours..." : mode === "edit" ? "Enregistrer les modifications" : "Confirmer le RDV"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
