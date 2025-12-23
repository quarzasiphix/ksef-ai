import { supabase } from '../../../integrations/supabase/client';
import type { DecisionCategory, DecisionType } from '@/modules/decisions/decisions';

// ============================================
// TYPES
// ============================================

export interface DecisionTemplate {
  id: string;
  title: string;
  description: string | null;
  decision_type: DecisionType;
  category: DecisionCategory;
  scope_description: string | null;
  is_foundational: boolean;
  is_active: boolean;
  industry_tags: string[] | null;
  entity_types: string[] | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface GetTemplatesOptions {
  entityType?: string;
  foundationalOnly?: boolean;
  category?: DecisionCategory;
  searchQuery?: string;
}

// ============================================
// FETCH TEMPLATES
// ============================================

export async function getDecisionTemplates(
  options: GetTemplatesOptions = {}
): Promise<DecisionTemplate[]> {
  let query = supabase
    .from('decision_templates')
    .select('*')
    .eq('is_active', true);

  // Filter by entity type
  if (options.entityType) {
    query = query.contains('entity_types', [options.entityType]);
  }

  // Filter by foundational only
  if (options.foundationalOnly) {
    query = query.eq('is_foundational', true);
  }

  // Filter by category
  if (options.category) {
    query = query.eq('category', options.category);
  }

  // Search query
  if (options.searchQuery) {
    query = query.textSearch('search_vector', options.searchQuery, {
      type: 'websearch',
      config: 'simple',
    });
  }

  // Order by foundational first, then usage count
  query = query.order('is_foundational', { ascending: false });
  query = query.order('usage_count', { ascending: false });
  query = query.order('title', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching decision templates:', error);
    throw error;
  }

  return data || [];
}

export async function getDecisionTemplate(id: string): Promise<DecisionTemplate | null> {
  const { data, error } = await supabase
    .from('decision_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching decision template:', error);
    throw error;
  }

  return data;
}

// ============================================
// RECOMMENDED TEMPLATES (using RPC function)
// ============================================

export async function getRecommendedTemplates(
  entityType: string,
  foundationalOnly: boolean = false
): Promise<DecisionTemplate[]> {
  const { data, error } = await supabase.rpc('get_recommended_decision_templates', {
    p_entity_type: entityType,
    p_foundational_only: foundationalOnly,
  });

  if (error) {
    console.error('Error fetching recommended templates:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// USAGE TRACKING
// ============================================

export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', {
    p_template_id: templateId,
  });

  if (error) {
    console.error('Error incrementing template usage:', error);
    // Don't throw - this is non-critical
  }
}

// ============================================
// CREATE DECISION FROM TEMPLATE
// ============================================

export async function createDecisionFromTemplate(
  templateId: string,
  businessProfileId: string,
  overrides?: {
    title?: string;
    description?: string;
    scope_description?: string;
    valid_from?: string;
    valid_to?: string;
    amount_limit?: number;
  }
): Promise<{ id: string }> {
  // Fetch the template
  const template = await getDecisionTemplate(templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }

  // Create decision from template
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      business_profile_id: businessProfileId,
      title: overrides?.title || template.title,
      description: overrides?.description || template.description,
      decision_type: template.decision_type,
      category: template.category,
      scope_description: overrides?.scope_description || template.scope_description,
      status: 'active',
      valid_from: overrides?.valid_from || null,
      valid_to: overrides?.valid_to || null,
      amount_limit: overrides?.amount_limit || null,
      template_id: templateId, // Track which template was used
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating decision from template:', error);
    throw error;
  }

  // Increment usage count
  await incrementTemplateUsage(templateId);

  return data;
}
