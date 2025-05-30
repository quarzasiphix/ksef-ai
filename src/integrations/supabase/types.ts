export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          address: string
          bank_account: string | null
          city: string
          created_at: string
          email: string | null
          id: string
          is_default: boolean | null
          logo: string | null
          name: string
          phone: string | null
          postal_code: string
          regon: string | null
          tax_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          bank_account?: string | null
          city: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo?: string | null
          name: string
          phone?: string | null
          postal_code: string
          regon?: string | null
          tax_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          bank_account?: string | null
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo?: string | null
          name?: string
          phone?: string | null
          postal_code?: string
          regon?: string | null
          tax_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          name: string
          product_id: string | null
          quantity: number
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          name: string
          product_id?: string | null
          quantity: number
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          unit: string
          unit_price: number
          updated_at?: string
          user_id?: string | null
          vat_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          name?: string
          product_id?: string | null
          quantity?: number
          total_gross_value?: number
          total_net_value?: number
          total_vat_value?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_profile_id: string
          comments: string | null
          created_at: string
          customer_id: string
          due_date: string
          id: string
          is_paid: boolean | null
          issue_date: string
          ksef_reference_number: string | null
          ksef_status: string | null
          number: string
          payment_method: string
          sell_date: string
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          transaction_type: string
          type: string
          updated_at: string
          user_id: string | null
          vat: boolean | null
          vat_exemption_reason: string | null
        }
        Insert: {
          business_profile_id: string
          comments?: string | null
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          is_paid?: boolean | null
          issue_date: string
          ksef_reference_number?: string | null
          ksef_status?: string | null
          number: string
          payment_method: string
          sell_date: string
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          transaction_type?: string
          type: string
          updated_at?: string
          user_id?: string | null
          vat?: boolean | null
          vat_exemption_reason?: string | null
        }
        Update: {
          business_profile_id?: string
          comments?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          is_paid?: boolean | null
          issue_date?: string
          ksef_reference_number?: string | null
          ksef_status?: string | null
          number?: string
          payment_method?: string
          sell_date?: string
          total_gross_value?: number
          total_net_value?: number
          total_vat_value?: number
          transaction_type?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          vat?: boolean | null
          vat_exemption_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_subscriptions: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          unit: string
          unit_price: number
          updated_at?: string
          user_id: string
          vat_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
