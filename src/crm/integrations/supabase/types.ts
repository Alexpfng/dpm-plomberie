export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actions_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          prospect_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          prospect_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          prospect_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_log_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          address: string | null
          appointment_date: string
          appointment_time: string | null
          cancellation_reason: string | null
          created_at: string
          id: string
          notes: string | null
          prospect_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          appointment_date: string
          appointment_time?: string | null
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          prospect_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          appointment_date?: string
          appointment_time?: string | null
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          prospect_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_qualification: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          prospect_id: string
          script_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          call_qualification?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          prospect_id: string
          script_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          call_qualification?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          prospect_id?: string
          script_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          assigned_to: string | null
          created_at: string
          email_template_id: string | null
          id: string
          name: string
          objective: string | null
          owner_id: string
          script_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email_template_id?: string | null
          id?: string
          name: string
          objective?: string | null
          owner_id: string
          script_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email_template_id?: string | null
          id?: string
          name?: string
          objective?: string | null
          owner_id?: string
          script_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          adresse: string | null
          chiffre_affaires: string | null
          code_naf: string | null
          created_at: string
          date_creation: string | null
          departement: string | null
          email_generique: string | null
          forme_juridique: string | null
          id: string
          linkedin_entreprise: string | null
          nombre_employes: number | null
          owner_id: string
          raison_sociale: string
          region: string | null
          siren: string | null
          siret: string | null
          site_internet: string | null
          statut_activite: string | null
          telephone_standard: string | null
          tranche_effectif: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          chiffre_affaires?: string | null
          code_naf?: string | null
          created_at?: string
          date_creation?: string | null
          departement?: string | null
          email_generique?: string | null
          forme_juridique?: string | null
          id?: string
          linkedin_entreprise?: string | null
          nombre_employes?: number | null
          owner_id: string
          raison_sociale: string
          region?: string | null
          siren?: string | null
          siret?: string | null
          site_internet?: string | null
          statut_activite?: string | null
          telephone_standard?: string | null
          tranche_effectif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          chiffre_affaires?: string | null
          code_naf?: string | null
          created_at?: string
          date_creation?: string | null
          departement?: string | null
          email_generique?: string | null
          forme_juridique?: string | null
          id?: string
          linkedin_entreprise?: string | null
          nombre_employes?: number | null
          owner_id?: string
          raison_sociale?: string
          region?: string | null
          siren?: string | null
          siret?: string | null
          site_internet?: string | null
          statut_activite?: string | null
          telephone_standard?: string | null
          tranche_effectif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          id: string
          prospect_id: string
          value: string
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          id?: string
          prospect_id: string
          value?: string
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          id?: string
          prospect_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_label: string
          field_name: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          field_label: string
          field_name: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          field_label?: string
          field_name?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          avg_call_duration: number | null
          campaign_id: string | null
          conversion_rate: number | null
          created_at: string
          id: string
          stat_date: string
          total_calls: number | null
          total_contacts: number | null
          total_emails: number | null
          total_rdv: number | null
          total_sms: number | null
          user_id: string
        }
        Insert: {
          avg_call_duration?: number | null
          campaign_id?: string | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          stat_date?: string
          total_calls?: number | null
          total_contacts?: number | null
          total_emails?: number | null
          total_rdv?: number | null
          total_sms?: number | null
          user_id: string
        }
        Update: {
          avg_call_duration?: number | null
          campaign_id?: string | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          stat_date?: string
          total_calls?: number | null
          total_contacts?: number | null
          total_emails?: number | null
          total_rdv?: number | null
          total_sms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          created_at: string | null
          delay_days: number
          enabled: boolean
          filters: Json | null
          id: string
          owner_id: string
          template_id: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_days?: number
          enabled?: boolean
          filters?: Json | null
          id?: string
          owner_id: string
          template_id: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_days?: number
          enabled?: boolean
          filters?: Json | null
          id?: string
          owner_id?: string
          template_id?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          owner_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          owner_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          gmail_address: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          gmail_address?: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          gmail_address?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          crm_role: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crm_role?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crm_role?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospect_tags: {
        Row: {
          created_at: string
          id: string
          prospect_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prospect_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prospect_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_tags_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          campaign_id: string | null
          city: string | null
          company: string | null
          company_id: string | null
          company_size: string | null
          created_at: string
          date_compte_cree: string | null
          date_derniere_activite: string | null
          date_premier_contact: string | null
          date_premiere_connexion: string | null
          email: string | null
          estimated_budget: string | null
          first_name: string | null
          id: string
          interest_level: number | null
          last_contact: string | null
          last_name: string | null
          linkedin: string | null
          main_problems: string[] | null
          nb_chantiers_semaine: number | null
          nb_clients_crees: number
          nb_devis_crees: number
          nb_devis_semaine: number | null
          next_followup: string | null
          notes_internes: string | null
          owner_id: string
          phone: string | null
          poste: string | null
          product_status: string
          refusal_reason: string | null
          score: number | null
          score_dispersion: number | null
          software_name: string | null
          source: string | null
          specialty: string | null
          status: string
          structure_entreprise: string | null
          temps_admin_jour: string | null
          total_attempts: number | null
          total_calls: number | null
          updated_at: string
          urgency: string | null
          uses_software: string | null
        }
        Insert: {
          campaign_id?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_size?: string | null
          created_at?: string
          date_compte_cree?: string | null
          date_derniere_activite?: string | null
          date_premier_contact?: string | null
          date_premiere_connexion?: string | null
          email?: string | null
          estimated_budget?: string | null
          first_name?: string | null
          id?: string
          interest_level?: number | null
          last_contact?: string | null
          last_name?: string | null
          linkedin?: string | null
          main_problems?: string[] | null
          nb_chantiers_semaine?: number | null
          nb_clients_crees?: number
          nb_devis_crees?: number
          nb_devis_semaine?: number | null
          next_followup?: string | null
          notes_internes?: string | null
          owner_id: string
          phone?: string | null
          poste?: string | null
          product_status?: string
          refusal_reason?: string | null
          score?: number | null
          score_dispersion?: number | null
          software_name?: string | null
          source?: string | null
          specialty?: string | null
          status?: string
          structure_entreprise?: string | null
          temps_admin_jour?: string | null
          total_attempts?: number | null
          total_calls?: number | null
          updated_at?: string
          urgency?: string | null
          uses_software?: string | null
        }
        Update: {
          campaign_id?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          company_size?: string | null
          created_at?: string
          date_compte_cree?: string | null
          date_derniere_activite?: string | null
          date_premier_contact?: string | null
          date_premiere_connexion?: string | null
          email?: string | null
          estimated_budget?: string | null
          first_name?: string | null
          id?: string
          interest_level?: number | null
          last_contact?: string | null
          last_name?: string | null
          linkedin?: string | null
          main_problems?: string[] | null
          nb_chantiers_semaine?: number | null
          nb_clients_crees?: number
          nb_devis_crees?: number
          nb_devis_semaine?: number | null
          next_followup?: string | null
          notes_internes?: string | null
          owner_id?: string
          phone?: string | null
          poste?: string | null
          product_status?: string
          refusal_reason?: string | null
          score?: number | null
          score_dispersion?: number | null
          software_name?: string | null
          source?: string | null
          specialty?: string | null
          status?: string
          structure_entreprise?: string | null
          temps_admin_jour?: string | null
          total_attempts?: number | null
          total_calls?: number | null
          updated_at?: string
          urgency?: string | null
          uses_software?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          prospect_id: string
          reminder_date: string
          reminder_time: string | null
          reminder_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          prospect_id: string
          reminder_date: string
          reminder_time?: string | null
          reminder_type?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          prospect_id?: string
          reminder_date?: string
          reminder_time?: string | null
          reminder_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_mappings: {
        Row: {
          created_at: string
          id: string
          mapping: Json
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mapping?: Json
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mapping?: Json
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          content: string
          created_at: string
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_prospect_score: { Args: { p_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
