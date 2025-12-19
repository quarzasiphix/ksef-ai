# A/B Testing & Funnel Tracking System Design

## Strategic Context

**Current State:** Registration flow is optimized to ~9.5/10
**Next Phase:** Data-driven optimization through A/B testing
**Goal:** Measure what actually converts, not what "feels" better

---

## Core Principles

### 1. **Test One Thing at a Time**
- Isolate variables
- Clear hypothesis per test
- Statistical significance required

### 2. **Funnel-First Architecture**
- Track every step
- Measure drop-off points
- Attribute conversions correctly

### 3. **Minimal Performance Impact**
- Client-side variant assignment
- No server round-trips for variant selection
- Lazy-load analytics

---

## System Architecture

### **Three-Layer System**

```
Layer 1: Variant Assignment (Client)
   ↓
Layer 2: Event Tracking (Client → Supabase)
   ↓
Layer 3: Analysis Dashboard (Admin)
```

---

## Layer 1: Variant Assignment

### **How It Works**

```typescript
// User visits /auth/register
// System assigns variant based on user_id hash

const getVariant = (userId: string, testId: string): string => {
  const hash = hashString(`${userId}-${testId}`);
  const bucket = hash % 100;
  
  // 50/50 split example
  return bucket < 50 ? 'control' : 'variant_a';
};
```

### **Variant Storage**

```typescript
// Store in localStorage for consistency
localStorage.setItem('ab_test_registration_headline', 'variant_a');

// User always sees same variant on return visits
```

### **Database Schema**

```sql
-- Store variant assignments
CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL, -- For anonymous users
  test_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, test_id)
);

-- Index for fast lookups
CREATE INDEX idx_ab_assignments_session ON ab_test_assignments(session_id, test_id);
```

---

## Layer 2: Event Tracking

### **Funnel Events**

```typescript
// Registration funnel events
enum FunnelEvent {
  // Page views
  VIEWED_REGISTER_PAGE = 'viewed_register_page',
  
  // Interactions
  CLICKED_GOOGLE_BUTTON = 'clicked_google_button',
  EXPANDED_EMAIL_FORM = 'expanded_email_form',
  FOCUSED_EMAIL_FIELD = 'focused_email_field',
  CLICKED_CONTINUE_BUTTON = 'clicked_continue_button',
  
  // Outcomes
  MAGIC_LINK_SENT = 'magic_link_sent',
  EMAIL_VERIFIED = 'email_verified',
  REGISTRATION_COMPLETE = 'registration_complete',
  
  // Drop-offs
  ABANDONED_EMAIL_FORM = 'abandoned_email_form',
  CLOSED_TAB = 'closed_tab',
}
```

### **Event Schema**

```sql
CREATE TABLE funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_data JSONB,
  page_path TEXT NOT NULL,
  referrer TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX idx_funnel_events_name ON funnel_events(event_name);
CREATE INDEX idx_funnel_events_created ON funnel_events(created_at DESC);
```

### **Tracking Implementation**

```typescript
// src/lib/analytics/funnelTracker.ts

interface FunnelEventData {
  sessionId: string;
  userId?: string;
  eventName: string;
  eventData?: Record<string, any>;
  pagePath: string;
  referrer?: string;
}

export const trackFunnelEvent = async (data: FunnelEventData) => {
  const deviceType = getDeviceType();
  const browser = getBrowser();
  
  await supabase.from('funnel_events').insert({
    session_id: data.sessionId,
    user_id: data.userId,
    event_name: data.eventName,
    event_data: data.eventData,
    page_path: data.pagePath,
    referrer: data.referrer || document.referrer,
    device_type: deviceType,
    browser: browser,
  });
};

// Usage in Register.tsx
useEffect(() => {
  trackFunnelEvent({
    sessionId: getSessionId(),
    eventName: 'viewed_register_page',
    pagePath: '/auth/register',
  });
}, []);
```

---

## Layer 3: Analysis Dashboard

### **Key Metrics**

```typescript
interface FunnelMetrics {
  // Top-level
  totalVisitors: number;
  totalRegistrations: number;
  conversionRate: number;
  
  // By variant
  variantMetrics: {
    control: VariantMetrics;
    variant_a: VariantMetrics;
  };
  
  // Drop-off analysis
  dropOffPoints: {
    step: string;
    dropOffRate: number;
    count: number;
  }[];
  
  // Device breakdown
  deviceMetrics: {
    mobile: DeviceMetrics;
    desktop: DeviceMetrics;
  };
}

interface VariantMetrics {
  visitors: number;
  registrations: number;
  conversionRate: number;
  avgTimeToConvert: number;
  
  // Micro-conversions
  googleButtonClicks: number;
  emailFormExpansions: number;
  magicLinksSent: number;
}
```

### **SQL Queries for Analysis**

```sql
-- Overall conversion rate by variant
WITH variant_visitors AS (
  SELECT 
    a.variant,
    COUNT(DISTINCT a.session_id) as visitors
  FROM ab_test_assignments a
  WHERE a.test_id = 'registration_headline'
    AND a.assigned_at >= NOW() - INTERVAL '7 days'
  GROUP BY a.variant
),
variant_conversions AS (
  SELECT 
    a.variant,
    COUNT(DISTINCT e.session_id) as conversions
  FROM ab_test_assignments a
  JOIN funnel_events e ON e.session_id = a.session_id
  WHERE a.test_id = 'registration_headline'
    AND e.event_name = 'registration_complete'
    AND e.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY a.variant
)
SELECT 
  v.variant,
  v.visitors,
  COALESCE(c.conversions, 0) as conversions,
  ROUND(COALESCE(c.conversions::NUMERIC / NULLIF(v.visitors, 0) * 100, 0), 2) as conversion_rate
FROM variant_visitors v
LEFT JOIN variant_conversions c ON c.variant = v.variant
ORDER BY v.variant;

-- Drop-off analysis
WITH funnel_steps AS (
  SELECT 
    session_id,
    event_name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) as step_number
  FROM funnel_events
  WHERE created_at >= NOW() - INTERVAL '7 days'
    AND page_path = '/auth/register'
)
SELECT 
  event_name,
  COUNT(DISTINCT session_id) as reached,
  COUNT(DISTINCT CASE WHEN step_number = (
    SELECT MAX(step_number) FROM funnel_steps f2 WHERE f2.session_id = f1.session_id
  ) THEN session_id END) as dropped_off
FROM funnel_steps f1
GROUP BY event_name
ORDER BY MIN(step_number);
```

---

## A/B Test Definitions

### **Test 1: Registration Headline**

**Hypothesis:** Naming the pain explicitly ("księgowość") increases conversion

**Variants:**
- **Control:** "Jeszcze chwila i masz to z głowy."
- **Variant A:** "Jeszcze chwila — i księgowość masz z głowy."

**Primary Metric:** Registration completion rate
**Secondary Metrics:** 
- Time on page
- Email form expansion rate
- Mobile vs desktop difference

**Sample Size:** 1,000 visitors per variant
**Expected Runtime:** 7-14 days
**Success Criteria:** >5% lift, p < 0.05

---

### **Test 2: CTA Copy**

**Hypothesis:** "Dalej" feels more natural than "Kontynuuj" in Polish

**Variants:**
- **Control:** "Kontynuuj"
- **Variant A:** "Dalej"

**Primary Metric:** Button click rate
**Secondary Metrics:**
- Completion rate after click
- Mobile click rate

**Sample Size:** 800 visitors per variant
**Expected Runtime:** 5-10 days

---

### **Test 3: Trust Anchor Position**

**Hypothesis:** Trust anchor above fold increases conversion on mobile

**Variants:**
- **Control:** Trust strip in footer
- **Variant A:** Trust anchor under headline
- **Variant B:** Both positions

**Primary Metric:** Mobile conversion rate
**Secondary Metrics:**
- Desktop conversion rate (should not decrease)
- Time to first interaction

**Sample Size:** 1,200 visitors per variant
**Expected Runtime:** 10-14 days

---

## Implementation Roadmap

### **Phase 1: Foundation (Week 1)**
- [ ] Create database schema (ab_test_assignments, funnel_events)
- [ ] Build variant assignment system
- [ ] Implement session tracking
- [ ] Add basic event tracking to Register.tsx

### **Phase 2: Tracking (Week 2)**
- [ ] Track all funnel events
- [ ] Add device/browser detection
- [ ] Implement drop-off detection
- [ ] Test data collection

### **Phase 3: Analysis (Week 3)**
- [ ] Build admin dashboard for A/B results
- [ ] Create SQL views for common queries
- [ ] Add statistical significance calculator
- [ ] Implement automated alerts (e.g., "Test reached significance")

### **Phase 4: First Test (Week 4)**
- [ ] Launch Test 1: Registration Headline
- [ ] Monitor for 7-14 days
- [ ] Analyze results
- [ ] Implement winner

---

## Technical Implementation Details

### **React Hook for A/B Testing**

```typescript
// src/hooks/useABTest.ts

interface ABTestConfig {
  testId: string;
  variants: string[];
  weights?: number[]; // Optional: [50, 50] default
}

export const useABTest = (config: ABTestConfig) => {
  const [variant, setVariant] = useState<string | null>(null);
  const sessionId = getSessionId();
  
  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem(`ab_test_${config.testId}`);
    if (stored && config.variants.includes(stored)) {
      setVariant(stored);
      return;
    }
    
    // Assign new variant
    const assigned = assignVariant(sessionId, config.testId, config.variants, config.weights);
    localStorage.setItem(`ab_test_${config.testId}`, assigned);
    setVariant(assigned);
    
    // Record assignment
    recordAssignment(sessionId, config.testId, assigned);
  }, [config.testId]);
  
  return variant;
};

// Usage in Register.tsx
const headlineVariant = useABTest({
  testId: 'registration_headline',
  variants: ['control', 'variant_a'],
});

const headline = headlineVariant === 'variant_a'
  ? 'Jeszcze chwila — i księgowość masz z głowy.'
  : 'Jeszcze chwila i masz to z głowy.';
```

### **Event Tracking Hook**

```typescript
// src/hooks/useFunnelTracking.ts

export const useFunnelTracking = (pagePath: string) => {
  const sessionId = getSessionId();
  const { user } = useAuth();
  
  const track = useCallback((eventName: string, eventData?: Record<string, any>) => {
    trackFunnelEvent({
      sessionId,
      userId: user?.id,
      eventName,
      eventData,
      pagePath,
    });
  }, [sessionId, user, pagePath]);
  
  // Auto-track page view
  useEffect(() => {
    track('page_view');
  }, []);
  
  return { track };
};

// Usage in Register.tsx
const { track } = useFunnelTracking('/auth/register');

const handleGoogleSignIn = async () => {
  track('clicked_google_button');
  // ... rest of logic
};
```

---

## Privacy & GDPR Compliance

### **Data Collection Rules**

1. **No PII in events** - Only session IDs, no emails/names
2. **Anonymize IPs** - Don't store full IP addresses
3. **Retention policy** - Delete events after 90 days
4. **User consent** - Track only after cookie consent
5. **Right to deletion** - Provide mechanism to delete user's funnel data

### **Implementation**

```typescript
// Only track if user consented
const canTrack = () => {
  const consent = localStorage.getItem('cookie_consent');
  return consent === 'accepted';
};

export const trackFunnelEvent = async (data: FunnelEventData) => {
  if (!canTrack()) return;
  
  // ... rest of tracking logic
};
```

---

## Success Metrics & KPIs

### **System Health**
- Event tracking success rate: >99%
- Average event latency: <100ms
- Data completeness: >95%

### **Business Impact**
- Registration conversion rate improvement: >10%
- Mobile conversion rate: >65%
- Time to registration: <60 seconds
- Drop-off reduction: >20%

---

## Cost Estimation

### **Supabase Storage**
- ~1KB per event
- 10,000 visitors/month × 10 events/visitor = 100,000 events/month
- 100MB/month storage
- **Cost:** Negligible (within free tier)

### **Compute**
- Minimal - client-side variant assignment
- SQL queries only for admin dashboard
- **Cost:** Negligible

### **Total:** ~$0/month for first 50K visitors

---

## Next Steps

1. **Approve architecture** - Review this design
2. **Create database migrations** - Set up tables
3. **Build tracking hooks** - Implement useABTest and useFunnelTracking
4. **Add tracking to Register.tsx** - Instrument all events
5. **Build admin dashboard** - View results
6. **Launch first test** - Registration headline A/B test

---

## Open Questions

1. Should we track anonymous users (pre-registration)?
2. What's the minimum sample size for statistical significance?
3. Should we auto-promote winning variants or require manual approval?
4. Do we need real-time dashboards or is daily batch analysis sufficient?

---

**This system will give you data-driven confidence in every UX decision.**
