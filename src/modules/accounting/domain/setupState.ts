/**
 * Accounting Setup State Engine
 * 
 * Determines the state of accounting setup for a business profile
 * and computes obligations timeline regardless of activity.
 */

import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'dzialalnosc' | 'sp_zoo' | 'sa';
export type TaxType = 'ryczalt' | 'skala' | 'liniowy' | 'karta';
export type VatStatus = 'exempt_art_113' | 'vat_active' | 'vat_not_applicable';
export type VatSettlement = 'monthly' | 'quarterly';
export type PitSettlement = 'monthly' | 'quarterly';

export type SetupStage = 
  | 'empty'                    // No setup, no data
  | 'configured_no_activity'   // Setup complete, no invoices/transactions
  | 'activity_unposted'        // Has data but not posted
  | 'active';                  // Fully operational

export type MissingSetupItem =
  | 'MISSING_TAX_TYPE'
  | 'MISSING_VAT_STATUS'
  | 'MISSING_START_DATE'
  | 'MISSING_RYCZALT_CATEGORIES'
  | 'MISSING_COA'
  | 'MISSING_PERIOD';

export type RecommendedAction = {
  id: string;
  title: string;
  description: string;
  route: string;
  priority: number;
};

export type ObligationFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one_off';
export type SubmissionChannel = 'podatki.gov' | 'pue_zus' | 'ekrs' | 'internal';
export type ExpectedMode = 'zero_possible' | 'requires_activity' | 'informational';

export type Obligation = {
  code: string;
  title: string;
  description: string;
  frequency: ObligationFrequency;
  dueDate: Date | null;
  submissionChannel: SubmissionChannel;
  applies: boolean;
  expectedMode: ExpectedMode;
  cta?: string;
};

export type SetupState = {
  stage: SetupStage;
  missingSetup: MissingSetupItem[];
  recommendedActions: RecommendedAction[];
  obligationsTimeline: Obligation[];
  signals: {
    invoicesCount: number;
    bankTransactionsCount: number;
    registerLinesCount: number;
    journalEntriesCount: number;
    eventsCount: number;
    categoriesCount: number;
    periodsCount: number;
    currentPeriodStatus: 'open' | 'locked' | 'none';
  };
};

export type BusinessProfile = {
  id: string;
  entity_type: EntityType;
  business_start_date?: string | null;
  accounting_start_date?: string | null;
  tax_type?: TaxType | null;
  is_vat_exempt?: boolean;
  vat_settlement?: VatSettlement;
  pit_settlement?: PitSettlement;
  fiscal_year_start_month?: number;
};

/**
 * Main entry point: Get accounting setup state for a business profile
 */
export async function getAccountingSetupState(
  businessProfileId: string
): Promise<SetupState> {
  // Load profile
  const { data: profile, error: profileError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', businessProfileId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  // Query signals
  const signals = await querySignals(businessProfileId);

  // Determine stage
  const stage = determineStage(profile, signals);

  // Find missing setup
  const missingSetup = findMissingSetup(profile, signals);

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(profile, stage, missingSetup);

  // Compute obligations timeline
  const obligationsTimeline = computeObligationsTimeline(profile, new Date());

  return {
    stage,
    missingSetup,
    recommendedActions,
    obligationsTimeline,
    signals,
  };
}

/**
 * Query all activity signals
 */
async function querySignals(businessProfileId: string) {
  const [
    invoicesResult,
    bankResult,
    registerResult,
    journalResult,
    eventsResult,
    categoriesResult,
    periodsResult,
  ] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('business_profile_id', businessProfileId),
    supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('business_profile_id', businessProfileId),
    supabase.from('jdg_revenue_register_lines').select('id', { count: 'exact', head: true }).eq('business_profile_id', businessProfileId),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('business_profile_id', businessProfileId),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('business_profile_id', businessProfileId),
    supabase.from('ryczalt_categories').select('id', { count: 'exact', head: true }),
    supabase.from('accounting_periods').select('id, is_locked', { count: 'exact' }).eq('business_profile_id', businessProfileId),
  ]);

  const currentPeriod = periodsResult.data?.find(p => !p.is_locked);

  const currentPeriodStatus: 'open' | 'locked' | 'none' = currentPeriod 
    ? 'open' 
    : (periodsResult.count || 0) > 0 
      ? 'locked' 
      : 'none';

  return {
    invoicesCount: invoicesResult.count || 0,
    bankTransactionsCount: bankResult.count || 0,
    registerLinesCount: registerResult.count || 0,
    journalEntriesCount: journalResult.count || 0,
    eventsCount: eventsResult.count || 0,
    categoriesCount: categoriesResult.count || 0,
    periodsCount: periodsResult.count || 0,
    currentPeriodStatus,
  };
}

/**
 * Determine setup stage
 */
function determineStage(profile: BusinessProfile, signals: SetupState['signals']): SetupStage {
  const hasActivity = signals.invoicesCount > 0 || signals.bankTransactionsCount > 0;
  const hasPostedData = signals.registerLinesCount > 0 || signals.journalEntriesCount > 0;

  if (!hasActivity && !hasPostedData) {
    // Check if configured
    const isConfigured = !!profile.tax_type && profile.business_start_date;
    return isConfigured ? 'configured_no_activity' : 'empty';
  }

  if (hasActivity && !hasPostedData) {
    return 'activity_unposted';
  }

  return 'active';
}

/**
 * Find missing setup items
 */
function findMissingSetup(profile: BusinessProfile, signals: SetupState['signals']): MissingSetupItem[] {
  const missing: MissingSetupItem[] = [];

  if (!profile.tax_type && profile.entity_type === 'dzialalnosc') {
    missing.push('MISSING_TAX_TYPE');
  }

  if (profile.is_vat_exempt === undefined || profile.is_vat_exempt === null) {
    missing.push('MISSING_VAT_STATUS');
  }

  if (!profile.business_start_date) {
    missing.push('MISSING_START_DATE');
  }

  if (profile.tax_type === 'ryczalt' && signals.categoriesCount === 0) {
    missing.push('MISSING_RYCZALT_CATEGORIES');
  }

  if ((profile.entity_type === 'sp_zoo' || profile.entity_type === 'sa') && signals.journalEntriesCount === 0) {
    // Check if COA seeded (simplified check)
    missing.push('MISSING_COA');
  }

  if (signals.periodsCount === 0) {
    missing.push('MISSING_PERIOD');
  }

  return missing;
}

/**
 * Generate recommended actions based on stage and missing setup
 */
function generateRecommendedActions(
  profile: BusinessProfile,
  stage: SetupStage,
  missingSetup: MissingSetupItem[]
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Missing setup actions (highest priority)
  if (missingSetup.includes('MISSING_TAX_TYPE')) {
    actions.push({
      id: 'set_tax_type',
      title: 'Ustaw formę opodatkowania',
      description: 'Wybierz ryczałt, skalę podatkową lub podatek liniowy',
      route: '/settings/business-profile',
      priority: 100,
    });
  }

  if (missingSetup.includes('MISSING_START_DATE')) {
    actions.push({
      id: 'set_start_date',
      title: 'Ustaw datę rozpoczęcia działalności',
      description: 'Potrzebna do osi czasu obowiązków i okresów księgowych',
      route: '/settings/business-profile',
      priority: 95,
    });
  }

  if (missingSetup.includes('MISSING_VAT_STATUS')) {
    actions.push({
      id: 'set_vat_status',
      title: 'Ustaw status VAT',
      description: 'Zwolniony (art. 113) lub czynny podatnik VAT',
      route: '/settings/business-profile',
      priority: 90,
    });
  }

  // Activity actions
  if (stage === 'empty' || stage === 'configured_no_activity') {
    actions.push({
      id: 'create_invoice',
      title: 'Wystaw pierwszą fakturę',
      description: 'Rozpocznij ewidencję przychodów',
      route: '/invoices/new',
      priority: 80,
    });

    actions.push({
      id: 'add_expense',
      title: 'Dodaj pierwszy wydatek',
      description: 'Zarejestruj koszty działalności',
      route: '/expenses/new',
      priority: 75,
    });

    actions.push({
      id: 'connect_bank',
      title: 'Połącz konto bankowe',
      description: 'Automatyczna synchronizacja transakcji',
      route: '/bank/connect',
      priority: 70,
    });
  }

  if (stage === 'activity_unposted') {
    actions.push({
      id: 'auto_post',
      title: 'Auto-księguj dokumenty',
      description: 'Zaksięguj oczekujące faktury i wydatki',
      route: '/accounting',
      priority: 85,
    });
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

/**
 * Compute obligations timeline from profile settings
 * Works even with no invoices/activity
 */
export function computeObligationsTimeline(
  profile: BusinessProfile,
  now: Date
): Obligation[] {
  const obligations: Obligation[] = [];
  const anchorDate = new Date(profile.accounting_start_date || profile.business_start_date || now);
  const isJdg = profile.entity_type === 'dzialalnosc';
  const isSpzoo = profile.entity_type === 'sp_zoo' || profile.entity_type === 'sa';

  // ZUS (JDG only)
  if (isJdg) {
    obligations.push({
      code: 'ZUS',
      title: 'Składki ZUS',
      description: 'Składki emerytalne, rentowe, chorobowe, zdrowotne',
      frequency: 'monthly',
      dueDate: getNextDueDate(now, 10), // 10th of next month
      submissionChannel: 'pue_zus',
      applies: true,
      expectedMode: 'zero_possible',
      cta: 'Dodaj płatność ZUS',
    });
  }

  // PIT (JDG only)
  if (isJdg && profile.tax_type) {
    if (profile.tax_type === 'ryczalt') {
      obligations.push({
        code: 'PIT_ADVANCE_RYCZALT',
        title: 'Zaliczka PIT (ryczałt)',
        description: 'Kwartalna zaliczka na podatek ryczałtowy',
        frequency: 'quarterly',
        dueDate: getNextQuarterlyDueDate(now, 20),
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Dodaj zaliczkę PIT',
      });

      obligations.push({
        code: 'PIT_28_YEARLY',
        title: 'PIT-28 (roczne zeznanie)',
        description: 'Roczne zeznanie podatkowe dla ryczałtu',
        frequency: 'yearly',
        dueDate: getYearlyDueDate(now.getFullYear(), 4, 30), // April 30
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Przygotuj PIT-28',
      });
    } else if (profile.tax_type === 'liniowy') {
      obligations.push({
        code: 'PIT_ADVANCE_LINIOWY',
        title: 'Zaliczka PIT (liniowy 19%)',
        description: 'Miesięczna zaliczka na podatek liniowy',
        frequency: 'monthly',
        dueDate: getNextDueDate(now, 20),
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Dodaj zaliczkę PIT',
      });

      obligations.push({
        code: 'PIT_36L_YEARLY',
        title: 'PIT-36L (roczne zeznanie)',
        description: 'Roczne zeznanie podatkowe dla podatku liniowego',
        frequency: 'yearly',
        dueDate: getYearlyDueDate(now.getFullYear(), 4, 30),
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Przygotuj PIT-36L',
      });
    } else if (profile.tax_type === 'skala') {
      obligations.push({
        code: 'PIT_ADVANCE_SKALA',
        title: 'Zaliczka PIT (skala)',
        description: 'Miesięczna zaliczka na podatek wg skali',
        frequency: 'monthly',
        dueDate: getNextDueDate(now, 20),
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Dodaj zaliczkę PIT',
      });

      obligations.push({
        code: 'PIT_36_YEARLY',
        title: 'PIT-36 (roczne zeznanie)',
        description: 'Roczne zeznanie podatkowe wg skali',
        frequency: 'yearly',
        dueDate: getYearlyDueDate(now.getFullYear(), 4, 30),
        submissionChannel: 'podatki.gov',
        applies: true,
        expectedMode: 'requires_activity',
        cta: 'Przygotuj PIT-36',
      });
    }
  }

  // CIT (Spółka only)
  if (isSpzoo) {
    obligations.push({
      code: 'CIT_ADVANCE',
      title: 'Zaliczka CIT',
      description: 'Miesięczna zaliczka na podatek dochodowy od osób prawnych',
      frequency: 'monthly',
      dueDate: getNextDueDate(now, 20),
      submissionChannel: 'podatki.gov',
      applies: true,
      expectedMode: 'requires_activity',
      cta: 'Dodaj zaliczkę CIT',
    });

    obligations.push({
      code: 'CIT_8_YEARLY',
      title: 'CIT-8 (roczne zeznanie)',
      description: 'Roczne zeznanie podatkowe CIT',
      frequency: 'yearly',
      dueDate: getYearlyDueDate(now.getFullYear(), 3, 31), // March 31
      submissionChannel: 'podatki.gov',
      applies: true,
      expectedMode: 'requires_activity',
      cta: 'Przygotuj CIT-8',
    });

    obligations.push({
      code: 'SPRAWOZDANIE_FIN',
      title: 'Sprawozdanie finansowe',
      description: 'Roczne sprawozdanie finansowe + eKRS',
      frequency: 'yearly',
      dueDate: getYearlyDueDate(now.getFullYear(), 6, 30), // June 30
      submissionChannel: 'ekrs',
      applies: true,
      expectedMode: 'requires_activity',
      cta: 'Przygotuj sprawozdanie',
    });
  }

  // VAT
  if (!profile.is_vat_exempt) {
    const vatFrequency: ObligationFrequency = profile.vat_settlement === 'quarterly' ? 'quarterly' : 'monthly';
    const vatDueDay = 25;

    obligations.push({
      code: vatFrequency === 'monthly' ? 'JPK_V7M' : 'JPK_V7K',
      title: vatFrequency === 'monthly' ? 'JPK_V7M (VAT miesięczny)' : 'JPK_V7K (VAT kwartalny)',
      description: 'Jednolity plik kontrolny VAT',
      frequency: vatFrequency,
      dueDate: vatFrequency === 'monthly' 
        ? getNextDueDate(now, vatDueDay)
        : getNextQuarterlyDueDate(now, vatDueDay),
      submissionChannel: 'podatki.gov',
      applies: true,
      expectedMode: 'zero_possible',
      cta: 'Przygotuj JPK_V7',
    });
  } else {
    obligations.push({
      code: 'JPK_V7_EXEMPT',
      title: 'JPK_V7 (nie dotyczy)',
      description: 'Zwolniony z VAT (art. 113) - brak obowiązku składania JPK',
      frequency: 'monthly',
      dueDate: null,
      submissionChannel: 'podatki.gov',
      applies: false,
      expectedMode: 'informational',
    });
  }

  return obligations.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

/**
 * Helper: Get next due date (day of next month)
 */
function getNextDueDate(now: Date, day: number): Date {
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);
  next.setDate(day);
  next.setHours(23, 59, 59, 999);
  return next;
}

/**
 * Helper: Get next quarterly due date
 */
function getNextQuarterlyDueDate(now: Date, day: number): Date {
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const nextQuarterFirstMonth = (currentQuarter + 1) * 3;
  
  const next = new Date(now);
  next.setMonth(nextQuarterFirstMonth);
  next.setDate(day);
  next.setHours(23, 59, 59, 999);
  return next;
}

/**
 * Helper: Get yearly due date
 */
function getYearlyDueDate(year: number, month: number, day: number): Date {
  return new Date(year + 1, month - 1, day, 23, 59, 59, 999);
}
