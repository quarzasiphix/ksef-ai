# Premium Model Plan - Per-Company Pricing

## 🎯 Overview

KsięgaI uses a **per-company premium model** where users can add multiple business profiles but need to pay for premium access to each company, unless they have an enterprise subscription.

## 💰 Pricing Structure

### Company-Level Subscriptions

#### JDG (Działalność Gospodarcza)
- **Monthly**: 19 zł
- **Annual**: 190 zł (2 months free)
- **Features**: Full premium features for one JDG entity

#### Spółka (Sp. z o.o. / S.A.)
- **Monthly**: 89 zł  
- **Annual**: 890 zł (2 months free)
- **Features**: Full premium features for one company entity

### Enterprise Subscription
- **Base Price**: 50 zł/month
- **Per JDG**: +19 zł/month
- **Per Spółka**: +89 zł/month
- **Unlimited Companies**: All user's companies get premium access
- **Annual**: 2 months free on total price

## 🏗️ Subscription Levels

### 1. Free Tier
- **Unlimited Business Profiles**: Users can create as many business profiles as needed
- **Basic Features**: 
  - Invoice creation and management
  - Basic reporting
  - Customer and product management
  - Expense tracking
- **Premium Features**: Require per-company subscription

### 2. Company-Level Premium
- **Per-Company Billing**: Each company needs its own subscription
- **Full Premium Features** for subscribed companies:
  - Advanced KSeF integration
  - Automated invoice generation
  - Advanced analytics and reports
  - Multi-currency support
  - API access
  - Priority support
- **Flexible**: Mix of free and premium companies

### 3. Enterprise Subscription
- **All-Inclusive**: All user's companies get premium access
- **Dynamic Pricing**: Price adjusts as companies are added/removed
- **Enterprise Benefits**:
  - Unlimited companies
  - Custom branding
  - Dedicated account manager
  - Advanced integrations
  - Custom reports
  - SLA guarantee

## 🔄 Business Profile Flow

### Creating New Business Profiles

1. **Free Users Can Add Profiles**: No restrictions on creating business profiles
2. **Premium Check on Access**: When accessing premium features:
   - Check if company has active subscription
   - Check if user has enterprise subscription
   - Show premium upgrade dialog if needed
3. **Automatic Enterprise Coverage**: New companies automatically get premium if user has enterprise subscription

### Premium Access Logic

```typescript
async function hasPremiumAccess(businessProfileId: string, userId: string): Promise<boolean> {
  // Check company-level subscription
  const companySub = await getCompanySubscription(businessProfileId);
  if (companySub?.is_active) return true;

  // Check enterprise subscription benefits
  const enterpriseSub = await getEnterpriseSubscription(userId);
  if (enterpriseSub?.is_active) {
    const hasBenefit = await checkEnterpriseBenefit(userId, businessProfileId);
    return hasBenefit;
  }

  return false;
}
```

## 💳 Billing Implementation

### Company-Level Subscriptions
- **Stripe Integration**: Per-company subscriptions
- **Independent Billing**: Each company billed separately
- **Flexible Management**: Users can pause/cancel individual company subscriptions

### Enterprise Subscription
- **Dynamic Pricing**: Recalculated when companies are added/removed
- **Single Invoice**: One payment for all companies
- **Automatic Updates**: Price adjusts automatically with company changes

## 🎨 User Experience

### Business Profile Switcher
- **Free Users**: Can add unlimited profiles
- **Premium Indicators**: Show which companies have premium access
- **Upgrade Prompts**: Contextual upgrade dialogs for premium features

### Premium Feature Gates
- **Graceful Blocking**: Clear messaging about premium requirements
- **Trial Options**: 14-day trials for new companies
- **Upgrade Flow**: Seamless upgrade process within the app

## 🔒 Security & Compliance

### Access Control
- **Server-Side Verification**: All premium checks verified server-side
- **Real-Time Status**: Live subscription status via Supabase Realtime
- **Audit Trail**: Complete logging of premium feature access

### Data Protection
- **Company Isolation**: Each company's data remains separate
- **GDPR Compliance**: Proper data handling per company
- **Backup & Recovery**: Company-level backup policies

## 📊 Analytics & Monitoring

### Subscription Metrics
- **Conversion Rates**: Free to premium per company
- **Enterprise Adoption**: Enterprise vs per-company preferences
- **Usage Patterns**: Premium feature usage per company

### Business Intelligence
- **Revenue Tracking**: Per-company and enterprise revenue
- **Churn Analysis**: Company-level subscription churn
- **Growth Metrics**: New company creation and premium adoption

## 🚀 Implementation Roadmap

### Phase 1: Core Model ✅
- [x] Subscription service architecture
- [x] Company and enterprise subscription types
- [x] Premium access verification
- [x] Business profile creation flow

### Phase 2: User Experience
- [ ] Premium feature gates implementation
- [ ] Upgrade flow optimization
- [ ] Trial system for new companies
- [ ] Enterprise onboarding flow

### Phase 3: Advanced Features
- [ ] Dynamic enterprise pricing automation
- [ ] Advanced analytics dashboard
- [ ] Custom enterprise features
- [ ] API for third-party integrations

## 🎯 Success Metrics

### User Adoption
- **Profile Creation Rate**: Number of new business profiles per user
- **Premium Conversion**: Percentage of companies upgraded to premium
- **Enterprise Adoption**: Enterprise subscription growth

### Revenue Goals
- **Per-Company ARPU**: Average revenue per company
- **Enterprise ARPU**: Average revenue per enterprise customer
- **Total Revenue**: Combined revenue from all subscription types

### User Satisfaction
- **Feature Usage**: Premium feature adoption rate
- **User Retention**: Subscription renewal rates
- **Support Tickets**: Premium-related support volume

## 🔄 Future Enhancements

### Advanced Pricing Models
- **Usage-Based Pricing**: Pay-per-invoice or transaction volume
- **Tiered Features**: Multiple premium tiers per company
- **Industry-Specific**: Specialized pricing for different industries

### Enterprise Features
- **Multi-User Management**: Team access per company
- **Custom Workflows**: Industry-specific workflows
- **White-Labeling**: Reseller options for accounting firms

### Integration Expansion
- **Accounting Software**: Integration with popular accounting systems
- **Banking APIs**: Direct bank integration for reconciliation
- **Government Systems**: Extended KSeF and other government integrations

---

## 📝 Summary

The per-company premium model provides flexibility for users while ensuring sustainable revenue. Free users can grow their business without restrictions, while premium features unlock advanced functionality per company. Enterprise subscriptions offer the best value for users with multiple companies, encouraging scale and loyalty.

This model balances user growth with revenue generation, providing clear upgrade paths and value propositions at each level.
