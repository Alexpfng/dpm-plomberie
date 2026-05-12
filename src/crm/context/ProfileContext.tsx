import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/crm/integrations/supabase/client";

export type CrmRole = "admin" | "commercial" | "comptable";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  crm_role: CrmRole;
  avatar_url: string | null;
}

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null, loading: true, refetch: () => {} });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

    if (!data) {
      // Try with new columns first, fall back to minimal insert
      const fullInsert = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || null,
        email: user.email ?? null,
        crm_role: "commercial",
      }).select().single();

      if (fullInsert.error) {
        // Columns might not exist yet — insert with base fields only
        const { data: created } = await supabase.from("profiles").insert({
          user_id: user.id,
          full_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || null,
        }).select().single();
        data = created;
      } else {
        data = fullInsert.data;
      }
    }

    setProfile({ crm_role: "commercial", email: null, phone: null, ...data } as Profile);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: load }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
