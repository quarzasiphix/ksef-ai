
import { supabase } from "../../../integrations/supabase/client";

export interface InvoiceShare {
  id: string;
  invoice_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  receiver_business_profile_id?: string;
  status: 'sent' | 'viewed' | 'accepted' | 'rejected';
  shared_at: string;
  viewed_at?: string;
  responded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function shareInvoiceWithUser(
  invoiceId: string,
  senderUserId: string,
  receiverTaxId: string,
  notes?: string
): Promise<InvoiceShare> {
  try {
    // First, find the receiver user by tax ID
    const { data: receiverData, error: receiverError } = await supabase.rpc('find_user_by_tax_id', {
      tax_id_param: receiverTaxId
    });

    if (receiverError) {
      console.error("Error finding receiver:", receiverError);
      throw new Error("Nie udało się znaleźć użytkownika o podanym NIP");
    }

    if (!receiverData || receiverData.length === 0) {
      throw new Error("Nie znaleziono użytkownika o podanym NIP");
    }

    const receiver = receiverData[0];

    // Check if invoice is already shared with this user
    const { data: existingShare } = await supabase
      .from('invoice_shares')
      .select('id')
      .eq('invoice_id', invoiceId)
      .eq('receiver_user_id', receiver.user_id)
      .maybeSingle();

    if (existingShare) {
      throw new Error("Faktura została już udostępniona temu użytkownikowi");
    }

    // Create the share
    const { data, error } = await supabase
      .from('invoice_shares')
      .insert({
        invoice_id: invoiceId,
        sender_user_id: senderUserId,
        receiver_user_id: receiver.user_id,
        receiver_business_profile_id: receiver.business_profile_id,
        status: 'sent',
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error("Error sharing invoice:", error);
      throw new Error("Nie udało się udostępnić faktury");
    }

    return data as InvoiceShare;
  } catch (error) {
    console.error('Error in shareInvoiceWithUser:', error);
    throw error;
  }
}

export async function getInvoiceSharesReceived(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_shares')
      .select(`
        *,
        invoices:invoice_id (
          id,
          number,
          type,
          issue_date,
          due_date,
          total_gross_value,
          is_paid,
          business_profiles:business_profile_id (
            name,
            tax_id
          ),
          customers:customer_id (
            name,
            tax_id,
            address,
            city,
            postal_code
          )
        )
      `)
      .eq('receiver_user_id', userId)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error("Error fetching received invoice shares:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInvoiceSharesReceived:', error);
    throw error;
  }
}

export async function getInvoiceSharesSent(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_shares')
      .select(`
        *,
        invoices:invoice_id (
          id,
          number,
          type,
          issue_date,
          due_date,
          total_gross_value,
          is_paid
        ),
        business_profiles:receiver_business_profile_id (
          name,
          tax_id
        )
      `)
      .eq('sender_user_id', userId)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error("Error fetching sent invoice shares:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInvoiceSharesSent:', error);
    throw error;
  }
}

export async function updateInvoiceShareStatus(
  shareId: string,
  status: 'viewed' | 'accepted' | 'rejected',
  userId: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'viewed') {
      updateData.viewed_at = new Date().toISOString();
    } else if (status === 'accepted' || status === 'rejected') {
      updateData.responded_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('invoice_shares')
      .update(updateData)
      .eq('id', shareId)
      .eq('receiver_user_id', userId); // Ensure user can only update their own shares

    if (error) {
      console.error("Error updating invoice share status:", error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateInvoiceShareStatus:', error);
    throw error;
  }
}
