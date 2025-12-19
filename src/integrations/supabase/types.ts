export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ab_test_assignments: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          test_id: string;
          variant: string;
          assigned_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id: string;
          test_id: string;
          variant: string;
          assigned_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string;
          test_id?: string;
          variant?: string;
          assigned_at?: string | null;
        };
      };
      ab_test_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          hypothesis: string | null;
          variants: Json;
          weights: Json | null;
          primary_metric: string;
          secondary_metrics: Json | null;
          target_sample_size: number | null;
          status: string | null;
          started_at: string | null;
          ended_at: string | null;
          winner: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          hypothesis?: string | null;
          variants: Json;
          weights?: Json | null;
          primary_metric: string;
          secondary_metrics?: Json | null;
          target_sample_size?: number | null;
          status?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          winner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          hypothesis?: string | null;
          variants?: Json;
          weights?: Json | null;
          primary_metric?: string;
          secondary_metrics?: Json | null;
          target_sample_size?: number | null;
          status?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          winner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      funnel_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          event_name: string;
          event_data: Json | null;
          page_path: string;
          referrer: string | null;
          device_type: string | null;
          browser: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          event_name: string;
          event_data?: Json | null;
          page_path: string;
          referrer?: string | null;
          device_type?: string | null;
          browser?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string | null;
          event_name?: string;
          event_data?: Json | null;
          page_path?: string;
          referrer?: string | null;
          device_type?: string | null;
          browser?: string | null;
          created_at?: string | null;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          phone_number: string | null;
          avatar_url: string | null;
          created_at: string | null;
          is_account_configured: boolean | null;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          is_account_configured?: boolean | null;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          is_account_configured?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_session_variant: {
        Args: { p_session_id: string; p_test_id: string };
        Returns: string;
      };
      record_funnel_event: {
        Args: {
          p_session_id: string;
          p_user_id: string;
          p_event_name: string;
          p_event_data: Json;
          p_page_path: string;
          p_referrer: string;
          p_device_type: string;
          p_browser: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
