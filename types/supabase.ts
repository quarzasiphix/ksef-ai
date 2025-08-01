export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          balance: number | null
          bank_name: string
          business_profile_id: string
          connected_at: string | null
          created_at: string | null
          currency: string
          id: string
          is_default: boolean
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number: string
          balance?: number | null
          bank_name: string
          business_profile_id: string
          connected_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_default?: boolean
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string
          balance?: number | null
          bank_name?: string
          business_profile_id?: string
          connected_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_default?: boolean
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          counterparty: string | null
          created_at: string | null
          currency: string
          date: string
          description: string
          id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          counterparty?: string | null
          created_at?: string | null
          currency?: string
          date: string
          description: string
          id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          counterparty?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          description?: string
          id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          accountant_email: string | null
          address: string
          bank_account: string | null
          city: string
          created_at: string
          email: string | null
          entity_type: string
          id: string
          is_default: boolean | null
          is_vat_exempt: boolean | null
          logo: string | null
          monthly_health_insurance: number | null
          monthly_social_security: number | null
          name: string
          phone: string | null
          postal_code: string
          regon: string | null
          tax_id: string
          tax_type:
            | Database["public"]["Enums"]["business_profile_tax_type"]
            | null
          updated_at: string
          user_id: string | null
          vat_exemption_reason: string | null
        }
        Insert: {
          accountant_email?: string | null
          address: string
          bank_account?: string | null
          city: string
          created_at?: string
          email?: string | null
          entity_type?: string
          id?: string
          is_default?: boolean | null
          is_vat_exempt?: boolean | null
          logo?: string | null
          monthly_health_insurance?: number | null
          monthly_social_security?: number | null
          name: string
          phone?: string | null
          postal_code: string
          regon?: string | null
          tax_id: string
          tax_type?:
            | Database["public"]["Enums"]["business_profile_tax_type"]
            | null
          updated_at?: string
          user_id?: string | null
          vat_exemption_reason?: string | null
        }
        Update: {
          accountant_email?: string | null
          address?: string
          bank_account?: string | null
          city?: string
          created_at?: string
          email?: string | null
          entity_type?: string
          id?: string
          is_default?: boolean | null
          is_vat_exempt?: boolean | null
          logo?: string | null
          monthly_health_insurance?: number | null
          monthly_social_security?: number | null
          name?: string
          phone?: string | null
          postal_code?: string
          regon?: string | null
          tax_id?: string
          tax_type?:
            | Database["public"]["Enums"]["business_profile_tax_type"]
            | null
          updated_at?: string
          user_id?: string | null
          vat_exemption_reason?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          business_profile_id: string | null
          content: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_active: boolean
          is_signed: boolean | null
          issue_date: string
          number: string
          pdf_url: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          business_profile_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_signed?: boolean | null
          issue_date: string
          number: string
          pdf_url?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          business_profile_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_signed?: boolean | null
          issue_date?: string
          number?: string
          pdf_url?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          city: string
          client_type: string
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
          client_type?: string
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
          client_type?: string
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
      employees: {
        Row: {
          address: string
          bank_account: string | null
          city: string
          contract_type: string
          created_at: string
          department: string | null
          email: string | null
          end_date: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          nip: string | null
          pesel: string
          phone: string | null
          position: string
          postal_code: string
          salary: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          bank_account?: string | null
          city: string
          contract_type?: string
          created_at?: string
          department?: string | null
          email?: string | null
          end_date?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          nip?: string | null
          pesel: string
          phone?: string | null
          position: string
          postal_code: string
          salary: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          bank_account?: string | null
          city?: string
          contract_type?: string
          created_at?: string
          department?: string | null
          email?: string | null
          end_date?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          nip?: string | null
          pesel?: string
          phone?: string | null
          position?: string
          postal_code?: string
          salary?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          created_at: string | null
          expense_id: string
          id: string
          name: string
          product_id: string | null
          quantity: number
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          unit: string
          unit_price: number
          updated_at: string | null
          user_id: string | null
          vat_exempt: boolean | null
          vat_rate: number
        }
        Insert: {
          created_at?: string | null
          expense_id: string
          id?: string
          name: string
          product_id?: string | null
          quantity: number
          total_gross_value: number
          total_net_value: number
          total_vat_value: number
          unit: string
          unit_price: number
          updated_at?: string | null
          user_id?: string | null
          vat_exempt?: boolean | null
          vat_rate: number
        }
        Update: {
          created_at?: string | null
          expense_id?: string
          id?: string
          name?: string
          product_id?: string | null
          quantity?: number
          total_gross_value?: number
          total_net_value?: number
          total_vat_value?: number
          unit?: string
          unit_price?: number
          updated_at?: string | null
          user_id?: string | null
          vat_exempt?: boolean | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_profile_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          description: string | null
          id: string
          issue_date: string
          user_id: string | null
        }
        Insert: {
          amount: number
          business_profile_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          issue_date: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_profile_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          issue_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      filed_tax_forms: {
        Row: {
          business_profile_id: string
          file_url: string | null
          filed_at: string | null
          form_type: string
          generated_at: string
          id: string
          inserted_at: string
          month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_profile_id: string
          file_url?: string | null
          filed_at?: string | null
          form_type: string
          generated_at?: string
          id?: string
          inserted_at?: string
          month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_profile_id?: string
          file_url?: string | null
          filed_at?: string | null
          form_type?: string
          generated_at?: string
          id?: string
          inserted_at?: string
          month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filed_tax_forms_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_contract_links: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          invoice_id: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          invoice_id: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ic_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ic_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
          vat_exempt: boolean | null
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
          vat_exempt?: boolean | null
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
          vat_exempt?: boolean | null
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
      invoice_shares: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          receiver_business_profile_id: string | null
          receiver_user_id: string
          responded_at: string | null
          sender_user_id: string
          shared_at: string
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          receiver_business_profile_id?: string | null
          receiver_user_id: string
          responded_at?: string | null
          sender_user_id: string
          shared_at?: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          receiver_business_profile_id?: string | null
          receiver_user_id?: string
          responded_at?: string | null
          sender_user_id?: string
          shared_at?: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_shares_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_shares_receiver_business_profile_id_fkey"
            columns: ["receiver_business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bank_account_id: string | null
          business_profile_id: string
          comments: string | null
          created_at: string
          currency: string | null
          customer_id: string
          due_date: string
          exchange_rate: number | null
          id: string
          is_paid: boolean | null
          is_public: boolean | null
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
          bank_account_id?: string | null
          business_profile_id: string
          comments?: string | null
          created_at?: string
          currency?: string | null
          customer_id: string
          due_date: string
          exchange_rate?: number | null
          id?: string
          is_paid?: boolean | null
          is_public?: boolean | null
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
          bank_account_id?: string | null
          business_profile_id?: string
          comments?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string
          due_date?: string
          exchange_rate?: number | null
          id?: string
          is_paid?: boolean | null
          is_public?: boolean | null
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
            foreignKeyName: "invoices_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
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
      labour_hours: {
        Row: {
          break_time: number
          created_at: string
          description: string | null
          employee_id: string
          end_time: string | null
          hourly_rate: number | null
          hours_worked: number
          id: string
          is_paid: boolean
          notes: string | null
          overtime_hours: number
          payment_date: string | null
          start_time: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          break_time?: number
          created_at?: string
          description?: string | null
          employee_id: string
          end_time?: string | null
          hourly_rate?: number | null
          hours_worked: number
          id?: string
          is_paid?: boolean
          notes?: string | null
          overtime_hours?: number
          payment_date?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          break_time?: number
          created_at?: string
          description?: string | null
          employee_id?: string
          end_time?: string | null
          hourly_rate?: number | null
          hours_worked?: number
          id?: string
          is_paid?: boolean
          notes?: string | null
          overtime_hours?: number
          payment_date?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_hours_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          stripe_subscription_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          stripe_subscription_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          stripe_subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          product_type: string
          stock: number
          track_stock: boolean
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
          vat_exempt: boolean | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_type?: string
          stock?: number
          track_stock?: boolean
          unit: string
          unit_price: number
          updated_at?: string
          user_id: string
          vat_exempt?: boolean | null
          vat_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_type?: string
          stock?: number
          track_stock?: boolean
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          vat_exempt?: boolean | null
          vat_rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          is_account_configured: boolean | null
          phone_number: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          is_account_configured?: boolean | null
          phone_number?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          is_account_configured?: boolean | null
          phone_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          labour_hours_ids: string[] | null
          notes: string | null
          payment_date: string
          payment_type: string
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          labour_hours_ids?: string[] | null
          notes?: string | null
          payment_date: string
          payment_type?: string
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          labour_hours_ids?: string[] | null
          notes?: string | null
          payment_date?: string
          payment_type?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shared: {
        Row: {
          bank_account: string | null
          contract_id: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          share_type: string
          slug: string
          view_once: boolean | null
        }
        Insert: {
          bank_account?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          share_type: string
          slug: string
          view_once?: boolean | null
        }
        Update: {
          bank_account?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          share_type?: string
          slug?: string
          view_once?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_declarations: {
        Row: {
          business_profile_id: string
          created_at: string | null
          declaration_type: string
          file_name: string
          file_url: string | null
          filed_at: string | null
          generated_at: string | null
          id: string
          metadata: Json | null
          month: string
          status: string
          updated_at: string | null
          user_id: string
          xml_content: string
        }
        Insert: {
          business_profile_id: string
          created_at?: string | null
          declaration_type: string
          file_name: string
          file_url?: string | null
          filed_at?: string | null
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          month: string
          status?: string
          updated_at?: string | null
          user_id: string
          xml_content: string
        }
        Update: {
          business_profile_id?: string
          created_at?: string | null
          declaration_type?: string
          file_name?: string
          file_url?: string | null
          filed_at?: string | null
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          month?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          xml_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_declarations_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          email: string | null
          id: number
          metadata: Json | null
          payment_system: string | null
          status: string | null
          transaction_id: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: number
          metadata?: Json | null
          payment_system?: string | null
          status?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: number
          metadata?: Json | null
          payment_system?: string | null
          status?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      zus_payments: {
        Row: {
          amount: number
          business_profile_id: string | null
          created_at: string | null
          id: string
          is_paid: boolean
          month: string
          paid_at: string | null
          updated_at: string | null
          user_id: string
          zus_type: string
        }
        Insert: {
          amount: number
          business_profile_id?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean
          month: string
          paid_at?: string | null
          updated_at?: string | null
          user_id: string
          zus_type: string
        }
        Update: {
          amount?: number
          business_profile_id?: string | null
          created_at?: string | null
          id?: string
          is_paid?: boolean
          month?: string
          paid_at?: string | null
          updated_at?: string | null
          user_id?: string
          zus_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "zus_payments_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_tax_id: {
        Args: { tax_id_param: string }
        Returns: {
          user_id: string
          business_profile_id: string
          business_name: string
        }[]
      }
    }
    Enums: {
      business_profile_tax_type: "skala" | "liniowy" | "ryczalt"
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
      business_profile_tax_type: ["skala", "liniowy", "ryczalt"],
    },
  },
} as const
