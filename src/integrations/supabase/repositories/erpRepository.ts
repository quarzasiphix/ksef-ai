import { supabase } from "../client";
import { 
  ERPConnection, 
  ERPProvider, 
  ERPConnectionStatus, 
  ERPSyncLog,
  ERPSyncDirection
} from "@/shared/types/erp";

/**
 * ERP Repository
 * Handles database operations for ERP connections and sync logs
 */

export async function getERPConnections(businessProfileId: string): Promise<ERPConnection[]> {
  const { data, error } = await supabase
    .from('erp_connections')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ERP connections:', error);
    throw error;
  }

  return data || [];
}

export async function getERPConnection(id: string): Promise<ERPConnection | null> {
  const { data, error } = await supabase
    .from('erp_connections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching ERP connection:', error);
    throw error;
  }

  return data;
}

export async function createERPConnection(
  connection: Omit<ERPConnection, 'id' | 'created_at' | 'updated_at' | 'error_count'>
): Promise<ERPConnection> {
  const { data, error } = await supabase
    .from('erp_connections')
    .insert({
      user_id: connection.user_id,
      business_profile_id: connection.business_profile_id,
      provider: connection.provider,
      status: connection.status || ERPConnectionStatus.DISCONNECTED,
      api_endpoint: connection.api_endpoint,
      api_key: connection.api_key,
      client_id: connection.client_id,
      client_secret: connection.client_secret,
      sync_direction: connection.sync_direction,
      auto_push_after_agreement: connection.auto_push_after_agreement,
      auto_pull_status: connection.auto_pull_status,
      sync_frequency_minutes: connection.sync_frequency_minutes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ERP connection:', error);
    throw error;
  }

  return data;
}

export async function updateERPConnection(
  id: string,
  updates: Partial<ERPConnection>
): Promise<ERPConnection> {
  const { data, error } = await supabase
    .from('erp_connections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating ERP connection:', error);
    throw error;
  }

  return data;
}

export async function deleteERPConnection(id: string): Promise<void> {
  const { error } = await supabase
    .from('erp_connections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ERP connection:', error);
    throw error;
  }
}

export async function testERPConnection(id: string): Promise<boolean> {
  try {
    // Update status to connecting
    await updateERPConnection(id, { 
      status: ERPConnectionStatus.CONNECTING 
    });

    // TODO: Implement actual connection test based on provider
    // For now, simulate a test
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update status to connected
    await updateERPConnection(id, { 
      status: ERPConnectionStatus.CONNECTED,
      error_count: 0,
      last_error: null
    });

    return true;
  } catch (error) {
    await updateERPConnection(id, { 
      status: ERPConnectionStatus.ERROR,
      last_error: error instanceof Error ? error.message : 'Connection test failed'
    });
    return false;
  }
}

export async function getERPSyncLogs(
  connectionId: string,
  limit: number = 50
): Promise<ERPSyncLog[]> {
  const { data, error } = await supabase
    .from('erp_sync_logs')
    .select('*')
    .eq('erp_connection_id', connectionId)
    .order('synced_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching ERP sync logs:', error);
    throw error;
  }

  return data || [];
}

export async function logERPSync(
  connectionId: string,
  direction: ERPSyncDirection,
  entityType: 'invoice' | 'payment' | 'customer' | 'product',
  entityId: string,
  status: 'pending' | 'success' | 'failed',
  errorMessage?: string,
  requestPayload?: any,
  responsePayload?: any
): Promise<string> {
  const { data, error } = await supabase.rpc('log_erp_sync', {
    p_connection_id: connectionId,
    p_direction: direction,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_status: status,
    p_error_message: errorMessage || null,
    p_request_payload: requestPayload || null,
    p_response_payload: responsePayload || null
  });

  if (error) {
    console.error('Error logging ERP sync:', error);
    throw error;
  }

  return data;
}

/**
 * Push invoice to ERP after agreement
 */
export async function pushInvoiceToERP(
  connectionId: string,
  invoiceId: string
): Promise<void> {
  try {
    const connection = await getERPConnection(connectionId);
    if (!connection) {
      throw new Error('ERP connection not found');
    }

    if (connection.status !== ERPConnectionStatus.CONNECTED) {
      throw new Error('ERP connection is not active');
    }

    // Update connection status to syncing
    await updateERPConnection(connectionId, {
      status: ERPConnectionStatus.SYNCING
    });

    // TODO: Implement actual push logic based on provider
    // For now, log the attempt
    await logERPSync(
      connectionId,
      ERPSyncDirection.PUSH,
      'invoice',
      invoiceId,
      'pending'
    );

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log success
    await logERPSync(
      connectionId,
      ERPSyncDirection.PUSH,
      'invoice',
      invoiceId,
      'success',
      undefined,
      { invoice_id: invoiceId },
      { erp_id: 'ERP-' + Date.now() }
    );

    // Update connection status back to connected
    await updateERPConnection(connectionId, {
      status: ERPConnectionStatus.CONNECTED,
      last_sync_at: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logERPSync(
      connectionId,
      ERPSyncDirection.PUSH,
      'invoice',
      invoiceId,
      'failed',
      errorMessage
    );

    await updateERPConnection(connectionId, {
      status: ERPConnectionStatus.ERROR,
      last_error: errorMessage
    });

    throw error;
  }
}

/**
 * Pull invoice status from ERP
 */
export async function pullInvoiceStatusFromERP(
  connectionId: string,
  invoiceId: string
): Promise<any> {
  try {
    const connection = await getERPConnection(connectionId);
    if (!connection) {
      throw new Error('ERP connection not found');
    }

    if (connection.status !== ERPConnectionStatus.CONNECTED) {
      throw new Error('ERP connection is not active');
    }

    // TODO: Implement actual pull logic based on provider
    // For now, simulate
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockStatus = {
      booked: true,
      paid: false,
      accounting_entry_id: 'ACC-' + Date.now()
    };

    await logERPSync(
      connectionId,
      ERPSyncDirection.PULL,
      'invoice',
      invoiceId,
      'success',
      undefined,
      { invoice_id: invoiceId },
      mockStatus
    );

    return mockStatus;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logERPSync(
      connectionId,
      ERPSyncDirection.PULL,
      'invoice',
      invoiceId,
      'failed',
      errorMessage
    );

    throw error;
  }
}
