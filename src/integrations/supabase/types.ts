export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
