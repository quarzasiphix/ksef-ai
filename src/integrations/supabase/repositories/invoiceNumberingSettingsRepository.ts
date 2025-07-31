import { supabase } from '@/integrations/supabase/client';

export interface InvoiceNumberingSettings {
  id?: string;
  user_id: string;
  business_profile_id: string;
  prefix: string;
  pattern: string;
  created_at?: string;
  updated_at?: string;
}

export async function getInvoiceNumberingSettings(userId: string, businessProfileId: string): Promise<InvoiceNumberingSettings | null> {
  const { data, error } = await supabase
    .from('invoice_numbering_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('business_profile_id', businessProfileId)
    .single();
  if (error) return null;
  return data as InvoiceNumberingSettings;
}

export async function upsertInvoiceNumberingSettings(settings: InvoiceNumberingSettings): Promise<InvoiceNumberingSettings | null> {
  const { data, error } = await supabase
    .from('invoice_numbering_settings')
    .upsert([
      {
        user_id: settings.user_id,
        business_profile_id: settings.business_profile_id,
        prefix: settings.prefix,
        pattern: settings.pattern,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'user_id,business_profile_id' })
    .select()
    .single();
  if (error) return null;
  return data as InvoiceNumberingSettings;
}
