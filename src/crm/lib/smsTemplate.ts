import { supabase } from "@/crm/integrations/supabase/client";
import { getLocalSmsTemplate } from "@/crm/lib/localMode";

export const BULBIZ_PITCH_SMS = `Bonjour,

La nouvelle version de Bulbiz est en ligne.

Bulbiz vous permet de centraliser au même endroit toutes vos demandes clients : coordonnées, adresse, photos, notes, vidéos.

Et surtout, vous pouvez maintenant faire vos devis et factures en quelques clics.

À partir des infos déjà présentes dans le dossier, Bulbiz vous propose automatiquement un devis intelligent, que vous pouvez modifier très facilement.

Vous pouvez aussi créer vos devis à partir d'une note vocale.

L'application vous suggère automatiquement les éléments utiles : matériel, fournitures, déplacement, main-d'œuvre, etc.

Tout s'enregistre dans vos dossiers, et vous pouvez même importer votre propre base matériel avec vos prix.

L'objectif : vous faire gagner du temps, éviter les oublis, et vous simplifier tout l'administratif.

Inscrivez-vous ici : app.bulbiz.io`;

/**
 * Nettoie un numéro de téléphone : retire espaces, points, tirets, parenthèses.
 * Garde le "+" initial s'il existe.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Construit un lien sms: avec destinataire et corps pré-rempli.
 * Utilise la syntaxe ?body= compatible iOS récent + Android.
 */
export function buildSmsLink(phone: string, body: string = BULBIZ_PITCH_SMS): string {
  const normalized = normalizePhone(phone);
  const encodedBody = encodeURIComponent(body);
  // iOS attend & comme séparateur, mais ?body= fonctionne aussi sur iOS 13+ et Android
  return `sms:${normalized}?&body=${encodedBody}`;
}

/**
 * Récupère le template SMS personnalisé de l'utilisateur connecté.
 * Retourne le template par défaut (BULBIZ_PITCH_SMS) si aucun n'est défini
 * ou en cas d'erreur — garantit un comportement toujours fonctionnel.
 */
export async function fetchUserSmsTemplate(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getLocalSmsTemplate(BULBIZ_PITCH_SMS);

    const { data, error } = await (supabase.from("sms_templates") as any)
      .select("content")
      .maybeSingle();
    if (error) return BULBIZ_PITCH_SMS;
    const content = data?.content?.trim();
    return content && content.length > 0 ? content : getLocalSmsTemplate(BULBIZ_PITCH_SMS);
  } catch {
    return getLocalSmsTemplate(BULBIZ_PITCH_SMS);
  }
}
