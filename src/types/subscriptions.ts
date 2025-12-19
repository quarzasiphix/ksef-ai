// Entity-Based Subscription Types
// Core principle: The unit of value is the legal entity, not the user

export type PlanCode = 'jdg' | 'spolka_standard' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export type SubscriptionStatus = 
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type SubscriptionEventType =
  | 'trial_started'
  | 'trial_ended'
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'payment_succeeded'
  | 'payment_failed';

export interface SubscriptionPlan {
  id: string;
  plan_code: PlanCode;
  plan_name: string;
  monthly_price_pln: number;
  annual_price_pln?: number;
  entity_type: 'jdg' | 'sp_zoo' | 'sa' | 'any';
  features: string[];
  trial_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EntitySubscription {
  id: string;
  business_profile_id: string; // The legal entity this subscription is for
  plan_id: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  
  // Trial
  trial_start_date?: string;
  trial_end_date?: string;
  
  // Subscription
  subscription_start_date?: string;
  subscription_end_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  
  // Cancellation
  canceled_at?: string;
  cancel_at_period_end: boolean;
  
  // Payment
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionHistory {
  id: string;
  entity_subscription_id: string;
  event_type: SubscriptionEventType;
  from_status?: SubscriptionStatus;
  to_status?: SubscriptionStatus;
  metadata?: Record<string, any>;
  created_at?: string;
  created_by?: string;
}

export interface EntitySubscriptionWithPlan extends EntitySubscription {
  plan: SubscriptionPlan;
}

export interface EntitySubscriptionStatusInfo {
  has_subscription: boolean;
  status: SubscriptionStatus;
  plan_name: string;
  days_remaining: number;
  is_trial: boolean;
}

// ============================================================================
// LABELS
// ============================================================================

export const PLAN_LABELS: Record<PlanCode, string> = {
  jdg: 'JDG',
  spolka_standard: 'Spółka Standard',
  enterprise: 'Enterprise',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Okres próbny',
  active: 'Aktywna',
  past_due: 'Zaległość w płatności',
  canceled: 'Anulowana',
  expired: 'Wygasła',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Miesięczny',
  annual: 'Roczny',
};

// ============================================================================
// PRICING CONSTANTS
// ============================================================================

export const PRICING = {
  JDG: {
    monthly: 19,
    annual: 190,
  },
  SPOLKA: {
    monthly: 89,
    annual: 890,
  },
  ENTERPRISE: {
    monthly: 0, // Individual pricing
    annual: 0,
  },
} as const;

export const TRIAL_DAYS = {
  JDG: 0,
  SPOLKA: 7,
  ENTERPRISE: 0,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPlanPrice(planCode: PlanCode, billingCycle: BillingCycle): number {
  switch (planCode) {
    case 'jdg':
      return billingCycle === 'monthly' ? PRICING.JDG.monthly : PRICING.JDG.annual;
    case 'spolka_standard':
      return billingCycle === 'monthly' ? PRICING.SPOLKA.monthly : PRICING.SPOLKA.annual;
    case 'enterprise':
      return 0; // Individual pricing
  }
}

export function formatPrice(amount: number): string {
  return `${amount.toFixed(0)} zł`;
}

export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isSubscriptionActive(subscription: EntitySubscription): boolean {
  if (subscription.status === 'trial') {
    return subscription.trial_end_date ? new Date(subscription.trial_end_date) > new Date() : false;
  }
  if (subscription.status === 'active') {
    return subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : false;
  }
  return false;
}

export function getSubscriptionEndDate(subscription: EntitySubscription): string | undefined {
  if (subscription.status === 'trial') {
    return subscription.trial_end_date;
  }
  if (subscription.status === 'active') {
    return subscription.current_period_end;
  }
  return undefined;
}

// ============================================================================
// PLAN FEATURES
// ============================================================================

export const PLAN_FEATURES = {
  jdg: [
    'Nieograniczone faktury i dokumenty',
    'Podstawowa księgowość',
    'Eksport JPK',
    'Uproszczony system decyzji',
  ],
  spolka_standard: [
    'System uchwał i decyzji',
    'Zarządzanie aktywami (nieruchomości, pojazdy, IP)',
    'Decyzje powiązane z wydatkami',
    'Ścieżka audytu i odpowiedzialność',
    'Śledzenie kapitału i wspólników',
    'Nieograniczone dokumenty',
    'Architektura gotowa na KSeF',
  ],
  enterprise: [
    'Wszystko z planu Spółka Standard',
    'Dedykowane wdrożenie',
    'Dostęp offline',
    'Pełna kontrola nad infrastrukturą',
    'Priorytetowe wsparcie',
  ],
} as const;

// ============================================================================
// MARKETING MESSAGES
// ============================================================================

export const PRICING_PHILOSOPHY = {
  tagline: 'JDG to księgowość. Spółka to odpowiedzialność. My wyceniamy odpowiedzialność.',
  
  jdg: {
    title: 'JDG',
    subtitle: 'Księgowość dla jednoosobowej działalności',
    description: 'Prosty system dla osób prowadzących JDG. Fakturowanie, podstawowa księgowość, eksport JPK.',
  },
  
  spolka: {
    title: 'Spółka Standard',
    subtitle: 'System zarządzania dla sp. z o.o. i S.A.',
    description: 'Pełny system governance: uchwały, decyzje, aktywa, kapitał, audyt. Nie konkurujemy z iFirma — konkurujemy z biurami księgowymi.',
  },
  
  enterprise: {
    title: 'Enterprise',
    subtitle: 'Dedykowane rozwiązanie dla wymagających organizacji',
    description: 'Wdrożenie on-premise, dostęp offline, pełna kontrola nad infrastrukturą. Dla banków, grup kapitałowych i firm wymagających maksymalnej niezależności.',
  },
} as const;

export const VALUE_PROPOSITION = {
  spolka: [
    'Tańsze niż biuro księgowe',
    'Tańsze niż audyty',
    'Tańsze niż błędy prawne',
    'Drogie dla chaosu — tanie dla odpowiedzialności',
  ],
} as const;
