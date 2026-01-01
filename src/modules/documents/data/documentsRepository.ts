/**
 * Documents Repository
 * 
 * Data access layer for documents (records) and attachments (files)
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Document, 
  DocumentAttachment, 
  DocumentActivity,
  DocumentFilter,
  DocumentStats,
  DocumentContext,
} from '../types';

// ============================================================================
// DOCUMENTS (Records)
// ============================================================================

export async function getDocuments(
  departmentId: string,
  filter?: DocumentFilter
): Promise<Document[]> {
  let query = supabase
    .from('v_documents_with_attachments')
    .select('*')
    .eq('department_id', departmentId);

  // Apply filters
  if (filter) {
    if (filter.scope && filter.scope.length > 0) {
      query = query.in('scope', filter.scope);
    }
    if (filter.type && filter.type.length > 0) {
      query = query.in('type', filter.type);
    }
    if (filter.status && filter.status.length > 0) {
      query = query.in('status', filter.status);
    }
    if (filter.required_level && filter.required_level.length > 0) {
      query = query.in('required_level', filter.required_level);
    }
    if (filter.has_attachments !== undefined) {
      query = query.eq('has_attachments', filter.has_attachments);
    }
    if (filter.is_expired !== undefined) {
      query = query.eq('is_expired', filter.is_expired);
    }
    if (filter.expiring_soon) {
      query = query.lte('days_until_expiry', 30).gte('days_until_expiry', 0);
    }
    
    // Context filters
    if (filter.job_id) {
      query = query.eq('job_id', filter.job_id);
    }
    if (filter.contract_id) {
      query = query.eq('contract_id', filter.contract_id);
    }
    if (filter.client_id) {
      query = query.eq('client_id', filter.client_id);
    }
    if (filter.vehicle_id) {
      query = query.eq('vehicle_id', filter.vehicle_id);
    }
    if (filter.driver_id) {
      query = query.eq('driver_id', filter.driver_id);
    }
    
    // Date filters
    if (filter.created_after) {
      query = query.gte('created_at', filter.created_after);
    }
    if (filter.created_before) {
      query = query.lte('created_at', filter.created_before);
    }
    if (filter.updated_after) {
      query = query.gte('updated_at', filter.updated_after);
    }
    if (filter.updated_before) {
      query = query.lte('updated_at', filter.updated_before);
    }
    if (filter.valid_to_before) {
      query = query.lte('valid_to', filter.valid_to_before);
    }
    
    // Search
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags);
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDocumentsByContext(
  context: DocumentContext
): Promise<Document[]> {
  let query = supabase
    .from('v_documents_with_attachments')
    .select('*');

  switch (context.type) {
    case 'department':
      query = query.eq('department_id', context.department_id);
      break;
    case 'job':
      query = query.eq('job_id', context.job_id);
      break;
    case 'contract':
      query = query.eq('contract_id', context.contract_id);
      break;
    case 'client':
      query = query.eq('client_id', context.client_id);
      break;
    case 'vehicle':
      query = query.eq('vehicle_id', context.vehicle_id);
      break;
    case 'driver':
      query = query.eq('driver_id', context.driver_id);
      break;
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('v_documents_with_attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDocument(document: Partial<Document>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...document,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function lockDocument(
  id: string,
  reason: string
): Promise<Document> {
  const user = (await supabase.auth.getUser()).data.user;
  
  const { data, error } = await supabase
    .from('documents')
    .update({
      is_locked: true,
      locked_reason: reason,
      locked_at: new Date().toISOString(),
      locked_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unlockDocument(id: string): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update({
      is_locked: false,
      locked_reason: null,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ATTACHMENTS (Files)
// ============================================================================

export async function getDocumentAttachments(documentId: string): Promise<DocumentAttachment[]> {
  const { data, error } = await supabase
    .from('document_attachments')
    .select('*')
    .eq('document_id', documentId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createDocumentAttachment(
  attachment: Partial<DocumentAttachment>
): Promise<DocumentAttachment> {
  const { data, error } = await supabase
    .from('document_attachments')
    .insert({
      ...attachment,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocumentAttachment(id: string): Promise<void> {
  const { error } = await supabase
    .from('document_attachments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ACTIVITY (Audit trail)
// ============================================================================

export async function getDocumentActivity(documentId: string): Promise<DocumentActivity[]> {
  const { data, error } = await supabase
    .from('document_activity')
    .select('*')
    .eq('document_id', documentId)
    .order('performed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// STATS
// ============================================================================

export async function getDocumentStats(departmentId: string): Promise<DocumentStats> {
  const { data, error } = await supabase
    .from('v_document_stats')
    .select('*')
    .eq('department_id', departmentId)
    .single();

  if (error) throw error;
  
  if (!data) {
    return {
      total_documents: 0,
      missing_required: 0,
      expiring_soon: 0,
      awaiting_signature: 0,
      requires_action: 0,
      by_type: {
        contract: 0,
        execution: 0,
        compliance: 0,
        financial: 0,
        correspondence: 0,
        internal: 0,
        other: 0,
      },
      by_status: {
        draft: 0,
        ready: 0,
        requires_action: 0,
        completed: 0,
        archived: 0,
        signed: 0,
        expired: 0,
      },
      by_scope: {
        department: 0,
        job: 0,
        contract: 0,
        decision: 0,
        client: 0,
        vehicle: 0,
        driver: 0,
      },
    };
  }

  return {
    total_documents: data.total_documents || 0,
    missing_required: data.missing_required || 0,
    expiring_soon: data.expiring_soon || 0,
    awaiting_signature: data.awaiting_signature || 0,
    requires_action: data.requires_action || 0,
    by_type: {
      contract: data.type_contract || 0,
      execution: data.type_execution || 0,
      compliance: data.type_compliance || 0,
      financial: data.type_financial || 0,
      correspondence: data.type_correspondence || 0,
      internal: data.type_internal || 0,
      other: data.type_other || 0,
    },
    by_status: {
      draft: data.status_draft || 0,
      ready: data.status_ready || 0,
      requires_action: data.status_requires_action || 0,
      completed: data.status_completed || 0,
      archived: data.status_archived || 0,
      signed: data.status_signed || 0,
      expired: data.status_expired || 0,
    },
    by_scope: {
      department: data.scope_department || 0,
      job: data.scope_job || 0,
      contract: data.scope_contract || 0,
      decision: data.scope_decision || 0,
      client: data.scope_client || 0,
      vehicle: data.scope_vehicle || 0,
      driver: data.scope_driver || 0,
    },
  };
}
