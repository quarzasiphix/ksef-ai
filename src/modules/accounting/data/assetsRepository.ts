// Asset Management Repository - Decision-First Governance Model
import { supabase } from '../../../integrations/supabase/client';
import type {
  Asset,
  AssetValuation,
  AssetObligation,
  AssetStateTransition,
  AssetWithDetails,
  AssetRealEstate,
  AssetVehicle,
  AssetIP,
  AssetEquipment,
  AssetFinancial,
  CreateAssetInput,
  UpdateAssetInput,
  CreateObligationInput,
  AssetStatus,
  CapitalCommitment,
} from '@/shared/types/assets';

// ============================================================================
// ASSET CRUD
// ============================================================================

export async function getAssets(businessProfileId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAssetById(assetId: string): Promise<AssetWithDetails | null> {
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (assetError) throw assetError;
  if (!asset) return null;

  // Fetch related data in parallel
  const [valuations, obligations, transitions, classDetails] = await Promise.all([
    getAssetValuations(assetId),
    getAssetObligations(assetId),
    getAssetStateTransitions(assetId),
    getAssetClassDetails(assetId, asset.asset_class),
  ]);

  return {
    ...asset,
    valuations,
    current_valuation: valuations.find(v => v.valuation_type === 'book_value') || valuations[0],
    obligations,
    state_transitions: transitions,
    ...classDetails,
  };
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      business_profile_id: input.business_profile_id,
      asset_class: input.asset_class,
      legal_basis_type: input.legal_basis_type,
      legal_basis_id: input.legal_basis_id,
      ownership_type: input.ownership_type,
      entry_date: input.entry_date,
      responsible_person_id: input.responsible_person_id,
      accounting_classification: input.accounting_classification,
      status: 'authorized', // Always start in authorized state
      internal_name: input.internal_name,
      description: input.description,
      notes: input.notes,
    })
    .select()
    .single();

  if (assetError) throw assetError;

  // Create initial valuation if provided
  if (input.initial_valuation) {
    await createAssetValuation({
      asset_id: asset.id,
      ...input.initial_valuation,
      effective_date: input.entry_date,
    });
  }

  // Create class-specific details
  await createAssetClassDetails(asset.id, input.asset_class, input);

  return asset;
}

export async function updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset> {
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .update({
      internal_name: input.internal_name,
      description: input.description,
      notes: input.notes,
      responsible_person_id: input.responsible_person_id,
      status: input.status,
    })
    .eq('id', assetId)
    .select()
    .single();

  if (assetError) throw assetError;

  // Update class-specific details if provided
  if (input.real_estate) {
    await updateAssetClassDetails(assetId, 'real_estate', input.real_estate);
  }
  if (input.vehicle) {
    await updateAssetClassDetails(assetId, 'vehicle', input.vehicle);
  }
  if (input.ip) {
    await updateAssetClassDetails(assetId, 'ip', input.ip);
  }
  if (input.equipment) {
    await updateAssetClassDetails(assetId, 'equipment', input.equipment);
  }
  if (input.financial) {
    await updateAssetClassDetails(assetId, 'financial', input.financial);
  }

  return asset;
}

export async function deleteAsset(assetId: string): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);

  if (error) throw error;
}

// ============================================================================
// ASSET VALUATIONS
// ============================================================================

export async function getAssetValuations(assetId: string): Promise<AssetValuation[]> {
  const { data, error } = await supabase
    .from('asset_valuations')
    .select('*')
    .eq('asset_id', assetId)
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAssetValuation(
  input: Omit<AssetValuation, 'id' | 'created_at' | 'created_by'>
): Promise<AssetValuation> {
  const { data, error } = await supabase
    .from('asset_valuations')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ASSET OBLIGATIONS
// ============================================================================

export async function getAssetObligations(assetId?: string): Promise<AssetObligation[]> {
  let query = supabase
    .from('asset_obligations')
    .select('*')
    .order('obligation_date', { ascending: false });

  if (assetId) {
    query = query.eq('affects_asset_id', assetId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getObligationsByBusinessProfile(
  businessProfileId: string
): Promise<AssetObligation[]> {
  const { data, error } = await supabase
    .from('asset_obligations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('obligation_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createObligation(input: CreateObligationInput): Promise<AssetObligation> {
  const { data, error } = await supabase
    .from('asset_obligations')
    .insert({
      business_profile_id: input.business_profile_id,
      based_on_type: input.based_on_type,
      based_on_id: input.based_on_id,
      purpose: input.purpose,
      affects_asset_id: input.affects_asset_id,
      accounting_effect: input.accounting_effect,
      amount: input.amount,
      currency: input.currency,
      obligation_date: input.obligation_date,
      due_date: input.due_date,
      description: input.description,
      notes: input.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateObligationStatus(
  obligationId: string,
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled',
  fulfilledDate?: string
): Promise<AssetObligation> {
  const { data, error } = await supabase
    .from('asset_obligations')
    .update({
      status,
      fulfilled_date: fulfilledDate,
    })
    .eq('id', obligationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ASSET STATE TRANSITIONS
// ============================================================================

export async function getAssetStateTransitions(assetId: string): Promise<AssetStateTransition[]> {
  const { data, error } = await supabase
    .from('asset_state_transitions')
    .select('*')
    .eq('asset_id', assetId)
    .order('transition_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function transitionAssetStatus(
  assetId: string,
  newStatus: AssetStatus,
  reason?: string,
  authorizedByType?: 'uchwala' | 'decision' | 'user',
  authorizedById?: string
): Promise<Asset> {
  // Get current asset to validate transition
  const { data: currentAsset, error: fetchError } = await supabase
    .from('assets')
    .select('status')
    .eq('id', assetId)
    .single();

  if (fetchError) throw fetchError;

  // Update asset status (trigger will automatically log the transition)
  const { data: updatedAsset, error: updateError } = await supabase
    .from('assets')
    .update({ status: newStatus })
    .eq('id', assetId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Optionally add reason and authorization to the transition
  if (reason || authorizedByType) {
    const { data: transitions } = await supabase
      .from('asset_state_transitions')
      .select('*')
      .eq('asset_id', assetId)
      .eq('from_status', currentAsset.status)
      .eq('to_status', newStatus)
      .order('transition_date', { ascending: false })
      .limit(1);

    if (transitions && transitions.length > 0) {
      await supabase
        .from('asset_state_transitions')
        .update({
          reason,
          authorized_by_type: authorizedByType,
          authorized_by_id: authorizedById,
        })
        .eq('id', transitions[0].id);
    }
  }

  return updatedAsset;
}

// ============================================================================
// ASSET CLASS DETAILS
// ============================================================================

async function getAssetClassDetails(assetId: string, assetClass: string) {
  const details: any = {};

  switch (assetClass) {
    case 'real_estate': {
      const { data } = await supabase
        .from('asset_real_estate')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      if (data) details.real_estate = data;
      break;
    }
    case 'vehicle': {
      const { data } = await supabase
        .from('asset_vehicles')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      if (data) details.vehicle = data;
      break;
    }
    case 'ip': {
      const { data } = await supabase
        .from('asset_ip')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      if (data) details.ip = data;
      break;
    }
    case 'equipment': {
      const { data } = await supabase
        .from('asset_equipment')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      if (data) details.equipment = data;
      break;
    }
    case 'financial_asset': {
      const { data } = await supabase
        .from('asset_financial')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      if (data) details.financial = data;
      break;
    }
  }

  return details;
}

async function createAssetClassDetails(
  assetId: string,
  assetClass: string,
  input: CreateAssetInput
): Promise<void> {
  switch (assetClass) {
    case 'real_estate':
      if (input.real_estate) {
        await supabase.from('asset_real_estate').insert({
          asset_id: assetId,
          ...input.real_estate,
        });
      }
      break;
    case 'vehicle':
      if (input.vehicle) {
        await supabase.from('asset_vehicles').insert({
          asset_id: assetId,
          ...input.vehicle,
        });
      }
      break;
    case 'ip':
      if (input.ip) {
        await supabase.from('asset_ip').insert({
          asset_id: assetId,
          ...input.ip,
        });
      }
      break;
    case 'equipment':
      if (input.equipment) {
        await supabase.from('asset_equipment').insert({
          asset_id: assetId,
          ...input.equipment,
        });
      }
      break;
    case 'financial_asset':
      if (input.financial) {
        await supabase.from('asset_financial').insert({
          asset_id: assetId,
          ...input.financial,
        });
      }
      break;
  }
}

async function updateAssetClassDetails(
  assetId: string,
  assetClass: string,
  updates: any
): Promise<void> {
  const tableName = {
    real_estate: 'asset_real_estate',
    vehicle: 'asset_vehicles',
    ip: 'asset_ip',
    equipment: 'asset_equipment',
    financial_asset: 'asset_financial',
  }[assetClass];

  if (!tableName) return;

  await supabase
    .from(tableName)
    .upsert({
      asset_id: assetId,
      ...updates,
    });
}

// ============================================================================
// CAPITAL COMMITMENTS (Decision → Asset flow)
// ============================================================================

export async function getCapitalCommitmentsByDecision(
  decisionId: string
): Promise<CapitalCommitment | null> {
  // Get the decision details
  const { data: decision, error: decisionError } = await supabase
    .from('decisions')
    .select('id, title, valid_from, decision_type')
    .eq('id', decisionId)
    .single();

  if (decisionError || !decision) return null;

  // Get all assets authorized by this decision
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*')
    .eq('legal_basis_type', 'decision')
    .eq('legal_basis_id', decisionId);

  if (assetsError) throw assetsError;

  // Get all obligations under this decision
  const { data: obligations, error: obligationsError } = await supabase
    .from('asset_obligations')
    .select('*')
    .eq('based_on_type', 'decision')
    .eq('based_on_id', decisionId);

  if (obligationsError) throw obligationsError;

  // Enrich assets with details
  const assetsWithDetails = await Promise.all(
    (assets || []).map(async (asset) => {
      const details = await getAssetById(asset.id);
      return details!;
    })
  );

  // Calculate totals
  const totalCommitted = (obligations || []).reduce((sum, o) => sum + Number(o.amount), 0);
  const totalDeployed = (obligations || [])
    .filter(o => o.status === 'fulfilled')
    .reduce((sum, o) => sum + Number(o.amount), 0);

  return {
    decision_id: decision.id,
    decision_title: decision.title,
    decision_date: decision.valid_from,
    decision_type: decision.decision_type,
    assets: assetsWithDetails,
    total_committed: totalCommitted,
    total_deployed: totalDeployed,
    obligations: obligations || [],
  };
}

export async function getCapitalCommitmentsByBusinessProfile(
  businessProfileId: string
): Promise<CapitalCommitment[]> {
  // Get all decisions for this business profile
  const { data: decisions, error: decisionsError } = await supabase
    .from('decisions')
    .select('id, title, valid_from, decision_type')
    .eq('business_profile_id', businessProfileId)
    .eq('status', 'active');

  if (decisionsError) throw decisionsError;

  // Get capital commitments for each decision
  const commitments = await Promise.all(
    (decisions || []).map(async (decision) => {
      return await getCapitalCommitmentsByDecision(decision.id);
    })
  );

  return commitments.filter((c): c is CapitalCommitment => c !== null);
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export async function getAssetsByStatus(
  businessProfileId: string,
  status: AssetStatus
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('status', status)
    .order('entry_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAssetsByClass(
  businessProfileId: string,
  assetClass: string
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('asset_class', assetClass)
    .order('entry_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTotalAssetValue(businessProfileId: string): Promise<number> {
  const assets = await getAssets(businessProfileId);
  
  const valuations = await Promise.all(
    assets.map(async (asset) => {
      const vals = await getAssetValuations(asset.id);
      const bookValue = vals.find(v => v.valuation_type === 'book_value');
      return bookValue ? Number(bookValue.amount) : 0;
    })
  );

  return valuations.reduce((sum, val) => sum + val, 0);
}
