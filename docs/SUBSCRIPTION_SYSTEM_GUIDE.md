# Subscription System Implementation Guide

This guide explains the new business-level subscription system with enterprise umbrella support and backward compatibility.

## Overview

The new subscription system implements a hierarchical access control model:

1. **Enterprise Umbrella** (user-level) - Overrides everything
2. **Legacy Premium** (user-level) - Backward compatibility
3. **Business Subscription** (business-level) - Per-business subscriptions
4. **Free** (default) - Basic functionality

## Architecture

### Core Components

- **subscription-utils.ts** - Centralized subscription logic
- **useSubscriptionAccess** - Hook for subscription data
- **RequireCapability** - Component for capability-based access control
- **RequirePremium** - Enhanced premium popup with business-specific pricing

### Database Schema

```sql
-- Users table (enterprise umbrella)
enterprise_active BOOLEAN DEFAULT FALSE
legacy_premium BOOLEAN DEFAULT FALSE
subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'enterprise'))

-- Business profiles table (business-level subscriptions)
subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'enterprise'))
subscription_status TEXT CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled'))
subscription_ends_at TIMESTAMP WITH TIME ZONE
trial_until TIMESTAMP WITH TIME ZONE
```

## Usage Examples

### 1. Basic Capability Check

```tsx
import { RequireCapability } from '@/components/auth/RequireCapability';

function KSeFIntegration() {
  return (
    <RequireCapability capability="ksef_integration" feature="Integracja KSeF">
      <KSeFComponent />
    </RequireCapability>
  );
}
```

### 2. Custom Fallback

```tsx
function AdvancedAnalytics() {
  const customFallback = (
    <div className="text-center p-8">
      <h3>Analityka zaawansowana</h3>
      <p>Ta funkcja wymaga planu Premium</p>
      <button onClick={() => openPremiumDialog()}>Aktualizuj plan</button>
    </div>
  );

  return (
    <RequireCapability 
      capability="advanced_analytics" 
      fallback={customFallback}
    >
      <AnalyticsDashboard />
    </RequireCapability>
  );
}
```

### 3. Hook-based Access Control

```tsx
import { useCapabilityCheck } from '@/shared/hooks/useSubscriptionAccess';

function InvoiceExport() {
  const { hasAccess, needsUpgrade } = useCapabilityCheck('jpk_exports');

  const handleExport = () => {
    if (!hasAccess) {
      // Show upgrade prompt
      return;
    }
    // Perform export
  };

  return (
    <button 
      onClick={handleExport}
      disabled={!hasAccess}
      className={hasAccess ? 'btn-primary' : 'btn-disabled'}
    >
      Eksportuj JPK
    </button>
  );
}
```

### 4. Higher-Order Component

```tsx
import { withCapabilityCheck } from '@/components/auth/RequireCapability';

const ProtectedTeamManagement = withCapabilityCheck(
  'multi_user',
  'Zarządzanie zespołem'
)(TeamManagementComponent);

function App() {
  return <ProtectedTeamManagement />;
}
```

### 5. Imperative Guard Pattern

```tsx
import { useCapabilityGuard } from '@/components/auth/RequireCapability';

function DocumentProcessor() {
  const { guard, canExecute } = useCapabilityGuard('ai_document_recognition');

  const processDocument = () => {
    guard(() => {
      // This only executes if user has access
      performAIDocumentProcessing();
    });
  };

  return (
    <button onClick={processDocument} disabled={!canExecute}>
      Przetwarzaj dokument AI
    </button>
  );
}
```

## Business-Specific Pricing

The system automatically shows different pricing based on business entity type:

```tsx
// JDG (sole proprietorship) - 19 zł/month
// Spółka (company) - 89 zł/month

const pricing = getBusinessPricing(entityType);
console.log(pricing.planName); // "JDG Premium" or "Spółka Premium"
console.log(pricing.planPrice); // "19 zł" or "89 zł"
console.log(pricing.features); // Array of relevant features
```

## Migration Guide

### Step 1: Database Migration

Run the SQL migration scripts:

```bash
# Add subscription fields
psql -d your_database -f database/add_subscription_fields.sql

# Migrate existing premium users
psql -d your_database -f database/migrate_legacy_premium_users.sql
```

### Step 2: Update Components

Replace existing premium checks:

```tsx
// Old way
if (isPremium) {
  return <PremiumFeature />;
}

// New way
<RequireCapability capability="feature_name">
  <PremiumFeature />
</RequireCapability>
```

### Step 3: Update API Calls

Use the utility functions in backend code:

```typescript
import { getEffectiveTier, hasCapability } from '@/shared/lib/subscription-utils';

// In API route
const effectiveTier = getEffectiveTier(userSubscription, businessSubscription);
const canAccess = hasCapability(userSubscription, businessSubscription, 'ksef_integration');
```

## Capability Definitions

| Capability | Required Tier | Description |
|-------------|---------------|-------------|
| `ksef_integration` | premium | KSeF integration and workflows |
| `jpk_exports` | premium | JPK tax declaration exports |
| `ai_document_recognition` | premium | AI-powered document processing |
| `bank_integrations` | premium | Bank account integrations |
| `multi_user` | enterprise | Multiple user accounts |
| `custom_reports` | enterprise | Custom report generation |
| `api_access` | enterprise | API access for integrations |
| `advanced_analytics` | premium | Advanced analytics dashboards |
| `document_ocr` | premium | OCR document processing |
| `automated_bookkeeping` | premium | Automated bookkeeping |
| `governance_features` | premium | Corporate governance tools |
| `decision_repository` | premium | Decision repository management |
| `risk_management` | enterprise | Risk management tools |
| `custom_integrations` | enterprise | Custom integrations |

## Backward Compatibility

The system maintains full backward compatibility:

1. **Existing Premium Users**: Automatically get `legacy_premium = true`
2. **All Their Businesses**: Get premium access automatically
3. **No Breaking Changes**: Current functionality continues to work
4. **Gradual Migration**: New features can use the new system immediately

## Testing

### Unit Tests

```typescript
import { getEffectiveTier, hasCapability } from '@/shared/lib/subscription-utils';

describe('Subscription Utils', () => {
  test('enterprise umbrella overrides business subscription', () => {
    const user = { enterprise_active: true };
    const business = { subscription_tier: 'free' };
    
    expect(getEffectiveTier(user, business)).toBe('enterprise');
    expect(hasCapability(user, business, 'multi_user')).toBe(true);
  });

  test('legacy premium provides access', () => {
    const user = { legacy_premium: true };
    const business = { subscription_tier: 'free' };
    
    expect(getEffectiveTier(user, business)).toBe('premium');
    expect(hasCapability(user, business, 'ksef_integration')).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { render, screen } from '@testing-library/react';
import { RequireCapability } from '@/components/auth/RequireCapability';

test('shows premium prompt when access denied', () => {
  const mockUseCapabilityCheck = jest.mocked(useCapabilityCheck);
  mockUseCapabilityCheck.mockReturnValue({
    hasAccess: false,
    needsUpgrade: true,
    isLoading: false,
  });

  render(
    <RequireCapability capability="ksef_integration">
      <div>Protected Content</div>
    </RequireCapability>
  );

  expect(screen.getByText(/Funkcja Premium/)).toBeInTheDocument();
});
```

## Performance Considerations

1. **Caching**: Subscription data is cached for 60 seconds
2. **Database Indexes**: Added indexes on subscription fields
3. **RLS Policies**: Row-level security for subscription data
4. **Lazy Loading**: Components only load subscription data when needed

## Security

1. **Row-Level Security**: Users can only access their own subscription data
2. **Server-Side Validation**: Always verify capabilities on the backend
3. **Audit Trail**: Subscription changes are logged
4. **Data Encryption**: Sensitive subscription data is encrypted

## Monitoring

Monitor these metrics:

1. **Subscription Check Performance**: API response times
2. **Upgrade Conversion Rates**: Free to Premium conversions
3. **Feature Usage**: Which premium features are most used
4. **Error Rates**: Failed subscription checks

## Troubleshooting

### Common Issues

1. **Subscription Not Updating**: Check cache invalidation
2. **Access Denied Unexpectedly**: Verify RLS policies
3. **Performance Issues**: Check database indexes
4. **Migration Problems**: Verify SQL scripts ran correctly

### Debug Queries

```sql
-- Check user subscription status
SELECT * FROM business_subscription_status WHERE user_id = 'user_id';

-- Verify effective tier calculation
SELECT 
  u.id,
  u.enterprise_active,
  u.legacy_premium,
  bp.subscription_tier,
  get_effective_subscription_tier(u.enterprise_active, u.legacy_premium, bp.subscription_tier) as effective_tier
FROM users u
LEFT JOIN business_profiles bp ON u.id = bp.user_id
WHERE u.id = 'user_id';
```

## Future Enhancements

1. **Usage-Based Pricing**: Track feature usage for billing
2. **Tier Upgrades**: Automatic upgrade suggestions
3. **Team Management**: Per-user seat management
4. **Custom Plans**: Enterprise plan customization
5. **Analytics Dashboard**: Subscription analytics for admins
