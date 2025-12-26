// Generated types from Supabase - Updated with unified events table

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          business_profile_id: string
          event_type: string
          event_number: string | null
          occurred_at: string
          recorded_at: string
          amount: number | null
          currency: string | null
          direction: string | null
          cash_channel: string | null
          posted: boolean
          needs_action: boolean
          status: string
          decision_id: string | null
          decision_reference: string | null
          blocked_by: string | null
          blocked_reason: string | null
          source: string
          classification: string | null
          category: string | null
          vat_rate: number | null
          actor_id: string
          actor_name: string
          actor_role: string | null
          entity_type: string
          entity_id: string
          entity_reference: string | null
          document_type: string
          document_id: string
          document_number: string
          counterparty: string | null
          linked_documents: Json | null
          action_summary: string
          changes: Json | null
          metadata: Json | null
          parent_event_id: string | null
          is_material: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_profile_id: string
          event_type: string
          event_number?: string | null
          occurred_at: string
          recorded_at?: string
          amount?: number | null
          currency?: string | null
          direction?: string | null
          cash_channel?: string | null
          posted?: boolean
          needs_action?: boolean
          status?: string
          decision_id?: string | null
          decision_reference?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          source?: string
          classification?: string | null
          category?: string | null
          vat_rate?: number | null
          actor_id: string
          actor_name: string
          actor_role?: string | null
          entity_type: string
          entity_id: string
          entity_reference?: string | null
          document_type: string
          document_id: string
          document_number: string
          counterparty?: string | null
          linked_documents?: Json | null
          action_summary: string
          changes?: Json | null
          metadata?: Json | null
          parent_event_id?: string | null
          is_material?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_profile_id?: string
          event_type?: string
          event_number?: string | null
          occurred_at?: string
          recorded_at?: string
          amount?: number | null
          currency?: string | null
          direction?: string | null
          cash_channel?: string | null
          posted?: boolean
          needs_action?: boolean
          status?: string
          decision_id?: string | null
          decision_reference?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          source?: string
          classification?: string | null
          category?: string | null
          vat_rate?: number | null
          actor_id?: string
          actor_name?: string
          actor_role?: string | null
          entity_type?: string
          entity_id?: string
          entity_reference?: string | null
          document_type?: string
          document_id?: string
          document_number?: string
          counterparty?: string | null
          linked_documents?: Json | null
          action_summary?: string
          changes?: Json | null
          metadata?: Json | null
          parent_event_id?: string | null
          is_material?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          business_profile_id: string
          decision_type: string
          decision_number: string | null
          title: string
          description: string | null
          status: string
          amount_limit: number | null
          valid_from: string | null
          valid_to: string | null
          allows_actions: string[] | null
          contract_types: string[] | null
          blocks_without: string | null
          authority_level: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_profile_id: string
          decision_type: string
          decision_number?: string | null
          title: string
          description?: string | null
          status: string
          amount_limit?: number | null
          valid_from?: string | null
          valid_to?: string | null
          allows_actions?: string[] | null
          contract_types?: string[] | null
          blocks_without?: string | null
          authority_level?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_profile_id?: string
          decision_type?: string
          decision_number?: string | null
          title?: string
          description?: string | null
          status?: string
          amount_limit?: number | null
          valid_from?: string | null
          valid_to?: string | null
          allows_actions?: string[] | null
          contract_types?: string[] | null
          blocks_without?: string | null
          authority_level?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      ledger_live: {
        Row: {
          id: string
          business_profile_id: string
          event_type: string
          occurred_at: string
          recorded_at: string
          amount: number | null
          currency: string | null
          direction: string | null
          posted: boolean
          status: string
          document_type: string
          document_id: string
          document_number: string
          counterparty: string | null
          decision_number: string | null
          decision_title: string | null
          business_name: string | null
        }
      }
      inbox_live: {
        Row: {
          id: string
          business_profile_id: string
          event_type: string
          occurred_at: string
          recorded_at: string
          amount: number | null
          posted: boolean
          needs_action: boolean
          status: string
          blocked_by: string | null
          blocked_reason: string | null
          document_number: string
          counterparty: string | null
          inbox_reasons: string[] | null
          decision_number: string | null
          decision_title: string | null
          business_name: string | null
        }
      }
    }
    Functions: {
      check_event_enforcement: {
        Args: { p_event_id: string }
        Returns: {
          is_allowed: boolean
          blocked_by: string | null
          error_message: string | null
          required_decision: string | null
        }[]
      }
      get_inbox_reasons: {
        Args: { p_event_id: string }
        Returns: string[]
      }
    }
  }
}
