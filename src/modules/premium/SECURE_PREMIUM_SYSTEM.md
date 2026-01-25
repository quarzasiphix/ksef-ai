# Secure Premium Verification System

## 🔒 Security Architecture

### Current Issues
1. **Client-side premium check** - Can be manipulated via console
2. **No real-time verification** - Status cached for 5 minutes
3. **No encryption** - Premium features bundled with free code
4. **Weak RLS** - Some policies rely on stored `is_active` field

### Proposed Solution: Multi-Layer Security

## 🏗️ Architecture Layers

### Layer 1: Real-Time Subscription Listener
**Purpose**: Maintain live connection to subscription status

```typescript
// Supabase Realtime subscription to enhanced_subscriptions table
// Updates premium status instantly when subscription changes
// Prevents console manipulation by constantly re-verifying
```

**Features**:
- WebSocket connection to Supabase Realtime
- Listens to `enhanced_subscriptions` table changes
- Auto-reconnects on network issues
- Integrated with SyncManager for unified state

### Layer 2: Server-Side Verification
**Purpose**: All premium checks happen server-side

```typescript
// Edge Function: verify-premium-access
// Called before every premium operation
// Returns encrypted token if verified
```

**Features**:
- JWT-based verification tokens (short-lived, 5 min)
- Server calculates `is_active` from dates
- Rate limiting to prevent abuse
- Audit logging for security

### Layer 3: Encrypted Feature Tokens
**Purpose**: Premium features only load with valid token

```typescript
// Client receives encrypted token from server
// Token contains: userId, businessId, tier, expiry, signature
// Premium components verify token before rendering
```

**Features**:
- AES-256 encryption
- HMAC signature verification
- Short expiry (5 minutes)
- Auto-refresh mechanism

### Layer 4: Code Splitting & Lazy Loading
**Purpose**: Premium code never sent to free users

```typescript
// Premium features in separate chunks
// Only loaded after token verification
// Reduces bundle size for free users
```

**Features**:
- Dynamic imports for premium features
- Webpack code splitting
- Fallback to upgrade prompts

### Layer 5: Database RLS Policies
**Purpose**: Final security layer at data level

```sql
-- All premium tables check subscription status
-- Use database functions for date calculations
-- No stored is_active field
```

## 📋 Implementation Plan

### Step 1: Real-Time Subscription Listener

**File**: `src/shared/services/premiumSyncService.ts`

```typescript
class PremiumSyncService {
  private subscription: RealtimeChannel | null = null;
  private verificationToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  // Subscribe to subscription changes
  async startRealtimeSync(userId: string, businessId: string) {
    this.subscription = supabase
      .channel(`premium:${userId}:${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'enhanced_subscriptions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleSubscriptionChange(payload);
      })
      .subscribe();
  }
  
  // Verify with server and get token
  async verifyPremiumAccess(): Promise<boolean> {
    if (this.isTokenValid()) return true;
    
    const { data, error } = await supabase.functions.invoke('verify-premium-access');
    if (error || !data?.token) return false;
    
    this.verificationToken = data.token;
    this.tokenExpiry = new Date(data.expiry);
    return true;
  }
}
```

### Step 2: Server-Side Verification Edge Function

**File**: `supabase/functions/verify-premium-access/index.ts`

```typescript
serve(async (req) => {
  const { user } = await supabaseClient.auth.getUser();
  const { businessId } = await req.json();
  
  // Calculate is_active from dates (server-side)
  const subscription = await getSubscription(user.id, businessId);
  const isActive = calculateIsActive(subscription);
  
  if (!isActive) {
    return new Response(JSON.stringify({ verified: false }), { status: 403 });
  }
  
  // Generate encrypted token
  const token = await generatePremiumToken({
    userId: user.id,
    businessId,
    tier: subscription.tier,
    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
  
  // Log access for audit
  await logPremiumAccess(user.id, businessId);
  
  return new Response(JSON.stringify({ 
    verified: true, 
    token,
    expiry: Date.now() + 5 * 60 * 1000
  }));
});
```

### Step 3: Premium Feature Guard

**File**: `src/shared/components/PremiumFeatureGuard.tsx`

```typescript
export const PremiumFeatureGuard: React.FC<{
  feature: string;
  children: React.ReactNode;
}> = ({ feature, children }) => {
  const { verifyAccess, isVerified } = usePremiumVerification();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    verifyAccess(feature).then(verified => {
      setIsLoading(false);
      if (!verified) {
        // Redirect or show upgrade prompt
      }
    });
  }, [feature]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isVerified) return <RequirePremium feature={feature} />;
  
  return <>{children}</>;
};
```

### Step 4: Code Splitting for Premium Features

```typescript
// Free users never download this code
const PremiumDashboard = lazy(() => 
  import(/* webpackChunkName: "premium-dashboard" */ './PremiumDashboard')
);

// Verify before loading
const LoadPremiumFeature = () => {
  const { token } = usePremiumVerification();
  
  if (!token) return <RequirePremium />;
  
  return (
    <Suspense fallback={<Loading />}>
      <PremiumDashboard token={token} />
    </Suspense>
  );
};
```

## 🔐 Security Features

### 1. Token-Based Access
- **Short-lived tokens** (5 min expiry)
- **Auto-refresh** before expiry
- **Encrypted payload** with HMAC signature
- **Cannot be forged** without server secret

### 2. Real-Time Verification
- **WebSocket connection** to subscription table
- **Instant updates** when subscription changes
- **Prevents console manipulation** by re-verifying constantly
- **Network resilient** with auto-reconnect

### 3. Server-Side Calculation
- **is_active calculated** from dates on server
- **No stored boolean** that can be manipulated
- **Rate limiting** prevents brute force
- **Audit logging** for security monitoring

### 4. Code Splitting
- **Premium code** in separate bundles
- **Never sent** to free users
- **Reduces attack surface**
- **Improves performance**

### 5. Database RLS
- **Final security layer**
- **All premium tables** check subscription
- **Uses database functions** for date calculations
- **Cannot be bypassed**

## 🚀 Usage Examples

### Protecting a Premium Feature

```typescript
// Option 1: Component Guard
<PremiumFeatureGuard feature="advanced_analytics">
  <AdvancedAnalytics />
</PremiumFeatureGuard>

// Option 2: Hook-based
const MyComponent = () => {
  const { hasAccess, verify } = usePremiumFeature('advanced_analytics');
  
  useEffect(() => {
    verify();
  }, []);
  
  if (!hasAccess) return <RequirePremium />;
  return <AdvancedAnalytics />;
};

// Option 3: Route Guard
<Route 
  path="/premium-dashboard" 
  element={
    <PremiumRoute feature="dashboard">
      <PremiumDashboard />
    </PremiumRoute>
  } 
/>
```

### API Call Protection

```typescript
// All premium API calls require token
const response = await supabase.functions.invoke('premium-feature', {
  headers: {
    'X-Premium-Token': premiumToken
  },
  body: { /* data */ }
});

// Server verifies token before processing
```

## 📊 Monitoring & Analytics

### Metrics to Track
- Token generation rate
- Verification failures
- Subscription changes
- Feature usage by tier
- Attempted unauthorized access

### Alerts
- Unusual token generation patterns
- Multiple failed verifications
- Subscription downgrades
- Network issues affecting sync

## 🔄 Migration Strategy

### Phase 1: Add New System (Parallel)
- Deploy new verification system
- Run alongside old system
- Monitor for issues

### Phase 2: Gradual Rollout
- Enable for 10% of users
- Monitor metrics
- Increase to 50%, then 100%

### Phase 3: Remove Old System
- Deprecate old premium checks
- Remove client-side boolean flags
- Clean up legacy code

## 🛡️ Attack Scenarios & Mitigations

### Scenario 1: Console Manipulation
**Attack**: User sets `isPremium = true` in console
**Mitigation**: Real-time listener overwrites immediately + server verification required

### Scenario 2: Token Theft
**Attack**: User steals token from another user
**Mitigation**: Token tied to userId + businessId, short expiry, HMAC signature

### Scenario 3: Replay Attack
**Attack**: User reuses old token
**Mitigation**: Short expiry (5 min) + nonce in token + server-side validation

### Scenario 4: Network Interception
**Attack**: MITM attack to steal token
**Mitigation**: HTTPS only + encrypted token payload + signature verification

### Scenario 5: Database Manipulation
**Attack**: User tries to update subscription directly
**Mitigation**: RLS policies + server-side date calculation + audit logging

## 📝 Best Practices

1. **Never trust client** - Always verify server-side
2. **Short token expiry** - Reduces attack window
3. **Real-time sync** - Prevents stale state
4. **Code splitting** - Don't send premium code to free users
5. **Audit logging** - Track all premium access
6. **Rate limiting** - Prevent abuse
7. **Graceful degradation** - Handle network issues
8. **Clear error messages** - Help users understand issues

## 🔧 Configuration

```typescript
// config/premium.ts
export const PREMIUM_CONFIG = {
  // Token settings
  TOKEN_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  TOKEN_REFRESH_THRESHOLD_MS: 1 * 60 * 1000, // Refresh 1 min before expiry
  
  // Sync settings
  REALTIME_RECONNECT_DELAY_MS: 5000,
  VERIFICATION_RETRY_ATTEMPTS: 3,
  
  // Security
  ENABLE_AUDIT_LOGGING: true,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
  
  // Features
  ENABLE_CODE_SPLITTING: true,
  ENABLE_REAL_TIME_SYNC: true,
};
```

## 🎯 Success Metrics

- **Security**: Zero successful unauthorized access attempts
- **Performance**: Token verification < 100ms
- **Reliability**: 99.9% uptime for real-time sync
- **User Experience**: Seamless premium feature access
- **Bundle Size**: 30% reduction for free users

---

**Status**: Design Complete - Ready for Implementation
**Priority**: High - Security Critical
**Estimated Effort**: 2-3 days for full implementation
