import { supabase } from '@/integrations/supabase/client';
import type {
  FuneralCase,
  FuneralCaseWithRelations,
  FuneralStage,
  FuneralDocument,
  CreateFuneralCaseInput,
  UpdateFuneralCaseInput,
  FuneralCaseStats,
  FuneralStageType,
  FuneralStageStatus,
  FuneralDocumentType,
  FuneralDocumentStatus,
} from '../types/funeralCases';

// Funeral Cases CRUD
export async function getFuneralCases(
  businessProfileId: string,
  departmentId?: string | null
): Promise<FuneralCase[]> {
  let query = supabase
    .from('funeral_cases')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getFuneralCaseById(id: string): Promise<FuneralCaseWithRelations | null> {
  const { data: funeralCase, error } = await supabase
    .from('funeral_cases')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!funeralCase) return null;

  // Load related data
  const [stages, documents] = await Promise.all([
    getFuneralStages(id),
    getFuneralDocuments(id),
  ]);

  return {
    ...funeralCase,
    stages,
    documents,
  };
}

export async function createFuneralCase(input: CreateFuneralCaseInput): Promise<FuneralCase> {
  // Generate case number
  const { data: caseNumber, error: numberError } = await supabase
    .rpc('generate_funeral_case_number', { p_business_profile_id: input.business_profile_id });

  if (numberError) throw numberError;

  const funeralCaseData = {
    business_profile_id: input.business_profile_id,
    department_id: input.department_id,
    case_number: caseNumber,
    deceased: input.deceased,
    client: input.client,
    service_type: input.service_type,
    status: 'new' as const,
    ceremony_date: input.ceremony_date,
    ceremony_time: input.ceremony_time,
    ceremony_location: input.ceremony_location,
    burial_location: input.burial_location,
    payment: {
      total_amount: input.total_amount,
      advance_paid: false,
      final_paid: false,
    },
    description: input.description,
    created_by: input.created_by,
  };

  const { data, error } = await supabase
    .from('funeral_cases')
    .insert(funeralCaseData)
    .select()
    .single();

  if (error) throw error;

  // Create default stages based on service type
  await createDefaultStages(data.id, input.service_type);

  return data;
}

export async function updateFuneralCase(
  id: string,
  input: UpdateFuneralCaseInput
): Promise<FuneralCase> {
  const updateData: any = {};

  if (input.deceased) updateData.deceased = input.deceased;
  if (input.client) updateData.client = input.client;
  if (input.service_type) updateData.service_type = input.service_type;
  if (input.status) {
    updateData.status = input.status;
    if (input.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (input.status === 'settled' && !updateData.settled_at) {
      updateData.settled_at = new Date().toISOString();
    }
  }
  if (input.ceremony_date !== undefined) updateData.ceremony_date = input.ceremony_date;
  if (input.ceremony_time !== undefined) updateData.ceremony_time = input.ceremony_time;
  if (input.ceremony_location !== undefined) updateData.ceremony_location = input.ceremony_location;
  if (input.burial_location !== undefined) updateData.burial_location = input.burial_location;
  if (input.payment) updateData.payment = input.payment;
  if (input.zus_settlement) updateData.zus_settlement = input.zus_settlement;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.internal_notes !== undefined) updateData.internal_notes = input.internal_notes;
  if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;

  const { data, error } = await supabase
    .from('funeral_cases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFuneralCase(id: string): Promise<void> {
  const { error } = await supabase
    .from('funeral_cases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Funeral Stages
export async function getFuneralStages(funeralCaseId: string): Promise<FuneralStage[]> {
  const { data, error } = await supabase
    .from('funeral_stages')
    .select('*')
    .eq('funeral_case_id', funeralCaseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createFuneralStage(
  funeralCaseId: string,
  stageType: FuneralStageType,
  data?: {
    scheduled_date?: string;
    scheduled_time?: string;
    location?: string;
    notes?: string;
    assigned_to?: string;
  }
): Promise<FuneralStage> {
  const stageData = {
    funeral_case_id: funeralCaseId,
    stage_type: stageType,
    status: 'pending' as FuneralStageStatus,
    ...data,
  };

  const { data: stage, error } = await supabase
    .from('funeral_stages')
    .insert(stageData)
    .select()
    .single();

  if (error) throw error;
  return stage;
}

export async function updateFuneralStage(
  id: string,
  updates: {
    status?: FuneralStageStatus;
    scheduled_date?: string;
    scheduled_time?: string;
    completed_date?: string;
    location?: string;
    notes?: string;
    assigned_to?: string;
  }
): Promise<FuneralStage> {
  const { data, error } = await supabase
    .from('funeral_stages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFuneralStage(id: string): Promise<void> {
  const { error } = await supabase
    .from('funeral_stages')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Funeral Documents
export async function getFuneralDocuments(funeralCaseId: string): Promise<FuneralDocument[]> {
  const { data, error } = await supabase
    .from('funeral_documents')
    .select('*')
    .eq('funeral_case_id', funeralCaseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createFuneralDocument(
  funeralCaseId: string,
  documentType: FuneralDocumentType,
  title: string,
  data?: {
    document_id?: string;
    file_path?: string;
    file_name?: string;
    notes?: string;
  }
): Promise<FuneralDocument> {
  const documentData = {
    funeral_case_id: funeralCaseId,
    document_type: documentType,
    title,
    status: 'draft' as FuneralDocumentStatus,
    ...data,
  };

  const { data: document, error } = await supabase
    .from('funeral_documents')
    .insert(documentData)
    .select()
    .single();

  if (error) throw error;
  return document;
}

export async function updateFuneralDocument(
  id: string,
  updates: {
    status?: FuneralDocumentStatus;
    title?: string;
    notes?: string;
    approved_by?: string;
    approved_at?: string;
  }
): Promise<FuneralDocument> {
  const { data, error } = await supabase
    .from('funeral_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFuneralDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('funeral_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Helper: Create default stages based on service type
async function createDefaultStages(
  funeralCaseId: string,
  serviceType: string
): Promise<void> {
  const stages: FuneralStageType[] = [];

  // Common stages for all service types
  stages.push('formalities');
  stages.push('body_collection');

  if (serviceType === 'traditional') {
    stages.push('preparation', 'ceremony', 'burial_cremation');
  } else if (serviceType === 'cremation') {
    stages.push('preparation', 'ceremony', 'burial_cremation', 'urn_collection');
  } else if (serviceType === 'formalities_only') {
    // Only formalities stage
  } else if (serviceType === 'body_transport') {
    // Only body collection and formalities
  } else if (serviceType === 'zus_service') {
    stages.push('preparation', 'ceremony', 'burial_cremation');
  }

  // Create stages
  for (const stageType of stages) {
    await createFuneralStage(funeralCaseId, stageType);
  }
}

// Statistics
export async function getFuneralCaseStats(
  businessProfileId: string,
  departmentId?: string | null
): Promise<FuneralCaseStats> {
  let query = supabase
    .from('funeral_cases')
    .select('status, payment, zus_settlement')
    .eq('business_profile_id', businessProfileId);

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const stats: FuneralCaseStats = {
    total_cases: data?.length || 0,
    active_cases: 0,
    scheduled_cases: 0,
    in_progress_cases: 0,
    completed_cases: 0,
    settled_cases: 0,
    total_revenue: 0,
    pending_zus_amount: 0,
  };

  data?.forEach((case_) => {
    if (case_.status === 'new' || case_.status === 'scheduled' || case_.status === 'in_progress') {
      stats.active_cases++;
    }
    if (case_.status === 'scheduled') stats.scheduled_cases++;
    if (case_.status === 'in_progress') stats.in_progress_cases++;
    if (case_.status === 'completed') stats.completed_cases++;
    if (case_.status === 'settled') stats.settled_cases++;

    const payment = case_.payment as any;
    if (payment?.total_amount) {
      stats.total_revenue += payment.total_amount;
    }

    const zusSettlement = case_.zus_settlement as any;
    if (zusSettlement?.status === 'submitted' || zusSettlement?.status === 'in_review') {
      if (zusSettlement.amount) {
        stats.pending_zus_amount += zusSettlement.amount;
      }
    }
  });

  return stats;
}

// Filter helpers
export async function getFuneralCasesByStatus(
  businessProfileId: string,
  status: string,
  departmentId?: string | null
): Promise<FuneralCase[]> {
  let query = supabase
    .from('funeral_cases')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getActiveFuneralCases(
  businessProfileId: string,
  departmentId?: string | null
): Promise<FuneralCase[]> {
  let query = supabase
    .from('funeral_cases')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .in('status', ['new', 'scheduled', 'in_progress'])
    .order('ceremony_date', { ascending: true, nullsFirst: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
