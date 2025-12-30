# Admin Panel Structure

## Overview

This document outlines the structure for the future admin panel that will allow you to manage app settings, monitor users, and control Stripe environments.

---

## Admin Panel Routes

### Proposed Route Structure

```
/admin
├── /dashboard          # Overview & key metrics
├── /settings           # App settings management
│   ├── /stripe        # Stripe configuration
│   ├── /features      # Feature flags
│   ├── /maintenance   # Maintenance mode
│   └── /email         # Email settings
├── /users             # User management
│   ├── /list          # All users
│   ├── /:id           # User detail
│   └── /analytics     # User analytics
├── /payments          # Payment monitoring
│   ├── /overview      # Payment metrics
│   ├── /transactions  # All transactions
│   └── /refunds       # Refund management
├── /connect           # Stripe Connect monitoring
│   ├── /accounts      # Connected accounts
│   ├── /payouts       # Payout tracking
│   └── /disputes      # Dispute management
├── /audit             # Audit logs
└── /reports           # Analytics & reports
```

---

## Component Structure

### 1. Admin Dashboard (`/admin/dashboard`)

**Purpose**: High-level overview of platform health

**Key Metrics**:
- Total users (active/inactive)
- Revenue (today, this week, this month)
- Payment success rate
- Active Stripe Connect accounts
- Recent errors/issues
- System status (Stripe mode, maintenance mode)

**Components**:
```tsx
<AdminDashboard>
  <MetricsGrid>
    <MetricCard title="Total Users" value={1234} trend="+5%" />
    <MetricCard title="Revenue (MTD)" value="12,345 PLN" trend="+12%" />
    <MetricCard title="Payment Success" value="98.5%" trend="+0.3%" />
    <MetricCard title="Connect Accounts" value={89} trend="+7" />
  </MetricsGrid>
  
  <SystemStatus>
    <StatusBadge mode={stripeMode} /> {/* test or live */}
    <MaintenanceBadge active={maintenanceMode} />
  </SystemStatus>
  
  <RecentActivity>
    <ActivityList items={recentActions} />
  </RecentActivity>
  
  <QuickActions>
    <Button onClick={toggleStripeMode}>Switch Stripe Mode</Button>
    <Button onClick={toggleMaintenance}>Toggle Maintenance</Button>
  </QuickActions>
</AdminDashboard>
```

---

### 2. Stripe Settings (`/admin/settings/stripe`)

**Purpose**: Manage Stripe environment and configuration

**Features**:
- View current Stripe mode (test/live)
- Switch between test and live mode
- View API key status (configured/missing)
- Test webhook connectivity
- View recent Stripe events

**Components**:
```tsx
<StripeSettings>
  <Card title="Stripe Environment">
    <CurrentMode mode={stripeMode} />
    
    <ModeToggle
      currentMode={stripeMode}
      onSwitch={handleSwitchMode}
      confirmationRequired={true}
    />
    
    <Alert variant="warning">
      ⚠️ Switching to live mode will process real payments
    </Alert>
  </Card>
  
  <Card title="API Keys Status">
    <KeyStatus
      label="Test Secret Key"
      configured={!!testKeyConfigured}
    />
    <KeyStatus
      label="Live Secret Key"
      configured={!!liveKeyConfigured}
    />
    <KeyStatus
      label="Test Webhook Secret"
      configured={!!testWebhookConfigured}
    />
    <KeyStatus
      label="Live Webhook Secret"
      configured={!!liveWebhookConfigured}
    />
  </Card>
  
  <Card title="Webhook Status">
    <WebhookTest
      endpoint="stripe-webhook"
      onTest={testWebhook}
    />
    <WebhookTest
      endpoint="stripe-connect-webhook"
      onTest={testWebhook}
    />
  </Card>
  
  <Card title="Recent Events">
    <StripeEventList events={recentEvents} />
  </Card>
</StripeSettings>
```

**Switch Mode Flow**:
```tsx
const handleSwitchMode = async (newMode: 'test' | 'live') => {
  // Show confirmation dialog
  const confirmed = await confirmDialog({
    title: `Switch to ${newMode} mode?`,
    message: newMode === 'live' 
      ? 'This will process REAL payments with REAL money!'
      : 'This will use test mode for development',
    confirmText: 'Switch Mode',
    variant: newMode === 'live' ? 'danger' : 'default'
  });
  
  if (!confirmed) return;
  
  try {
    // Update via service role
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        stripe_mode: newMode,
        updated_by: adminUserId 
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    
    if (error) throw error;
    
    // Log action
    await logAdminAction(
      adminUserId,
      'stripe_mode_changed',
      'app_settings',
      'stripe_mode',
      { stripe_mode: currentMode },
      { stripe_mode: newMode }
    );
    
    toast.success(`Switched to ${newMode} mode`);
    
    // Redeploy functions (optional, or show instruction)
    showDeploymentInstructions();
    
  } catch (error) {
    toast.error('Failed to switch mode');
  }
};
```

---

### 3. Feature Flags (`/admin/settings/features`)

**Purpose**: Enable/disable platform features

**Features**:
- Toggle payments
- Toggle Stripe Connect
- Toggle premium subscriptions
- Toggle analytics
- Toggle email notifications

**Components**:
```tsx
<FeatureFlags>
  <FeatureToggle
    name="payments_enabled"
    label="Online Payments"
    description="Allow users to accept payments via Stripe"
    enabled={settings.payments_enabled}
    onChange={handleToggleFeature}
  />
  
  <FeatureToggle
    name="stripe_connect_enabled"
    label="Stripe Connect"
    description="Allow merchants to connect their Stripe accounts"
    enabled={settings.stripe_connect_enabled}
    onChange={handleToggleFeature}
  />
  
  <FeatureToggle
    name="premium_subscriptions_enabled"
    label="Premium Subscriptions"
    description="Allow users to purchase premium features"
    enabled={settings.premium_subscriptions_enabled}
    onChange={handleToggleFeature}
  />
  
  <FeatureToggle
    name="analytics_enabled"
    label="Analytics"
    description="Track user behavior and platform metrics"
    enabled={settings.analytics_enabled}
    onChange={handleToggleFeature}
  />
</FeatureFlags>
```

---

### 4. User Management (`/admin/users`)

**Purpose**: View and manage users

**Features**:
- List all users with filters
- Search users
- View user details
- View user activity
- View Stripe Connect status
- View premium subscription status
- Manual actions (refunds, etc.)

**Components**:
```tsx
<UserManagement>
  <UserFilters>
    <SearchInput placeholder="Search users..." />
    <FilterSelect
      label="Status"
      options={['all', 'active', 'inactive', 'premium']}
    />
    <FilterSelect
      label="Stripe Connect"
      options={['all', 'connected', 'not_connected', 'pending']}
    />
  </UserFilters>
  
  <UserTable>
    <UserRow
      user={user}
      onViewDetails={handleViewUser}
      onViewActivity={handleViewActivity}
    />
  </UserTable>
  
  <Pagination
    currentPage={page}
    totalPages={totalPages}
    onPageChange={setPage}
  />
</UserManagement>
```

**User Detail View**:
```tsx
<UserDetail userId={userId}>
  <UserInfo>
    <Avatar src={user.avatar} />
    <UserMeta
      name={user.name}
      email={user.email}
      createdAt={user.created_at}
    />
  </UserInfo>
  
  <UserStats>
    <Stat label="Business Profiles" value={profileCount} />
    <Stat label="Invoices Created" value={invoiceCount} />
    <Stat label="Total Revenue" value={totalRevenue} />
    <Stat label="Premium Status" value={premiumStatus} />
  </UserStats>
  
  <StripeConnectStatus
    accounts={connectAccounts}
    status={connectStatus}
  />
  
  <RecentActivity
    activities={userActivities}
  />
  
  <AdminActions>
    <Button onClick={handleRefund}>Issue Refund</Button>
    <Button onClick={handleDisconnect}>Disconnect Stripe</Button>
    <Button onClick={handleSuspend} variant="danger">Suspend User</Button>
  </AdminActions>
</UserDetail>
```

---

### 5. Payment Monitoring (`/admin/payments`)

**Purpose**: Monitor all payments across the platform

**Features**:
- View all transactions
- Filter by status, date, amount
- View payment details
- Issue refunds
- Export reports

**Components**:
```tsx
<PaymentMonitoring>
  <PaymentMetrics>
    <MetricCard title="Today's Revenue" value="1,234 PLN" />
    <MetricCard title="Success Rate" value="98.5%" />
    <MetricCard title="Failed Payments" value={12} />
    <MetricCard title="Pending Refunds" value={3} />
  </PaymentMetrics>
  
  <PaymentFilters>
    <DateRangePicker onChange={setDateRange} />
    <FilterSelect
      label="Status"
      options={['all', 'succeeded', 'failed', 'pending', 'refunded']}
    />
    <FilterSelect
      label="Provider"
      options={['all', 'stripe', 'manual']}
    />
  </PaymentFilters>
  
  <PaymentTable>
    <PaymentRow
      payment={payment}
      onViewDetails={handleViewPayment}
      onRefund={handleRefund}
    />
  </PaymentTable>
  
  <ExportButton onClick={exportPayments}>
    Export to CSV
  </ExportButton>
</PaymentMonitoring>
```

---

### 6. Stripe Connect Monitoring (`/admin/connect`)

**Purpose**: Monitor connected merchant accounts

**Features**:
- View all connected accounts
- View account status
- View payout schedules
- Monitor disputes
- View account metrics

**Components**:
```tsx
<ConnectMonitoring>
  <ConnectMetrics>
    <MetricCard title="Connected Accounts" value={89} />
    <MetricCard title="Pending Verification" value={5} />
    <MetricCard title="Total Payouts (MTD)" value="45,678 PLN" />
    <MetricCard title="Active Disputes" value={2} />
  </ConnectMetrics>
  
  <AccountTable>
    <AccountRow
      account={account}
      businessProfile={profile}
      status={status}
      onViewDetails={handleViewAccount}
    />
  </AccountTable>
  
  <PayoutSchedule>
    <UpcomingPayouts payouts={upcomingPayouts} />
  </PayoutSchedule>
</ConnectMonitoring>
```

---

### 7. Audit Logs (`/admin/audit`)

**Purpose**: View all admin actions

**Features**:
- View all admin actions
- Filter by admin, action type, date
- Export audit trail
- Search logs

**Components**:
```tsx
<AuditLogs>
  <AuditFilters>
    <DateRangePicker onChange={setDateRange} />
    <FilterSelect
      label="Admin"
      options={adminUsers}
    />
    <FilterSelect
      label="Action"
      options={actionTypes}
    />
    <SearchInput placeholder="Search logs..." />
  </AuditFilters>
  
  <AuditTable>
    <AuditRow
      log={log}
      showDiff={true}
    />
  </AuditTable>
  
  <ExportButton onClick={exportAudit}>
    Export Audit Trail
  </ExportButton>
</AuditLogs>
```

---

## Database Queries for Admin Panel

### Get App Settings
```typescript
const { data: settings } = await supabase
  .from('app_settings')
  .select('*')
  .single();
```

### Update Stripe Mode
```typescript
const { error } = await supabase
  .from('app_settings')
  .update({ stripe_mode: 'live' })
  .eq('id', '00000000-0000-0000-0000-000000000001');
```

### Get User Stats
```typescript
const { data: stats } = await supabase.rpc('get_user_stats', {
  user_id: userId
});
```

### Get Payment Analytics
```typescript
const { data: analytics } = await supabase
  .from('invoice_payments')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

### Get Audit Logs
```typescript
const { data: logs } = await supabase
  .from('admin_audit_log')
  .select('*, admin:admin_user_id(email, name)')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## Security & Access Control

### Admin Role Check

Create a custom claim or role in Supabase Auth:

```sql
-- Add admin role to user metadata
UPDATE auth.users
SET raw_user_meta_data = 
  raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@yourdomain.com';
```

### Protected Route Component

```tsx
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Check if user has admin role
      const role = user.user_metadata?.role;
      setIsAdmin(role === 'admin');
      setLoading(false);
    };
    
    checkAdmin();
  }, [user]);
  
  if (loading) return <LoadingSpinner />;
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};
```

### Usage in Routes

```tsx
<Route path="/admin/*" element={
  <AdminRoute>
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="settings/stripe" element={<StripeSettings />} />
        <Route path="users" element={<UserManagement />} />
        {/* ... other admin routes */}
      </Routes>
    </AdminLayout>
  </AdminRoute>
} />
```

---

## Implementation Priority

### Phase 1 (MVP)
1. ✅ Database tables (app_settings, admin_audit_log)
2. ⏳ Admin dashboard with key metrics
3. ⏳ Stripe settings page (mode toggle)
4. ⏳ Basic user list
5. ⏳ Audit log viewer

### Phase 2
6. Feature flag management
7. Payment monitoring
8. User detail views
9. Export functionality
10. Search and filters

### Phase 3
11. Stripe Connect monitoring
12. Advanced analytics
13. Automated alerts
14. Bulk operations
15. Custom reports

---

## Tech Stack Recommendations

### Frontend
- **React** (already in use)
- **shadcn/ui** (already in use)
- **Recharts** for charts/graphs
- **React Table** for data tables
- **date-fns** for date handling

### Backend
- **Supabase Edge Functions** for admin operations
- **Supabase Realtime** for live updates
- **PostgreSQL** for data storage

### Additional Libraries
- **zod** for validation
- **react-hook-form** for forms
- **sonner** for toasts (already in use)

---

## Next Steps

1. **Create admin role system** in Supabase Auth
2. **Build AdminLayout component** with navigation
3. **Implement AdminDashboard** with key metrics
4. **Create StripeSettings page** with mode toggle
5. **Add audit logging** to all admin actions
6. **Build user management** interface
7. **Add monitoring** and alerts

---

## File Structure

```
src/
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── settings/
│       │   ├── StripeSettings.tsx
│       │   ├── FeatureFlags.tsx
│       │   ├── MaintenanceMode.tsx
│       │   └── EmailSettings.tsx
│       ├── users/
│       │   ├── UserList.tsx
│       │   ├── UserDetail.tsx
│       │   └── UserAnalytics.tsx
│       ├── payments/
│       │   ├── PaymentOverview.tsx
│       │   ├── TransactionList.tsx
│       │   └── RefundManagement.tsx
│       ├── connect/
│       │   ├── ConnectAccounts.tsx
│       │   ├── PayoutTracking.tsx
│       │   └── DisputeManagement.tsx
│       ├── AuditLogs.tsx
│       └── Reports.tsx
├── components/
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminRoute.tsx
│       ├── MetricCard.tsx
│       ├── StatusBadge.tsx
│       ├── FeatureToggle.tsx
│       ├── ModeToggle.tsx
│       └── AuditTable.tsx
└── hooks/
    └── useAdminAuth.ts
```

---

This structure provides a solid foundation for building a comprehensive admin panel. Start with Phase 1 MVP features and expand based on your needs.
