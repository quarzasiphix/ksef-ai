# Architecture Overview - LATEST Workspace

## System Purpose

This is a **multi-application ecosystem** for Polish accounting, tax compliance, and business operations management. The system handles:

- **Accounting & Invoicing** (KsięgaI platform)
- **KSeF Integration** (Polish e-invoicing system)
- **Client Relationship Management** (Tovernet CRM)
- **Marketing & User Acquisition** (ksiegai.pl website)
- **Internal Operations** (Admin console)

**Critical Context**: This handles real accounting/tax workflows. Correctness > speed. Mistakes have legal/financial consequences.

---

## Workspace Structure

```
LATEST/
├── ksef-ai/              # Main accounting application
├── ksiegai-next/         # Marketing/auth entry site
├── admin-ksiegai/        # Internal admin console
├── tovernet/
│   ├── crm-tover/        # CRM + client portal
│   ├── tovernet-nest/    # Tovernet.online website
│   └── n8n/              # Automation workflows
└── z-all-ksef-repos/     # Reference implementations (READ-ONLY)
    ├── ksef-client-csharp/
    ├── ksef-client-java/
    ├── ksef-docs/
    └── ksef-pdf-generator/
```

---

## Application Boundaries & Responsibilities

### 1. **ksef-ai** (Main Accounting App)
- **URL**: `app.ksiegai.pl`
- **Tech**: React 18 + Vite + TypeScript
- **Purpose**: Core accounting, invoicing, KSeF integration, tax compliance
- **Users**: Business owners, accountants, power users
- **Key Features**:
  - Invoice management (income/expense)
  - KSeF e-invoicing integration
  - Accounting books (KPiR, księgi rachunkowe, ryczałt)
  - VAT, PIT, CIT calculations
  - Business profile management
  - Document repository
  - Operations module (transport, funeral services, construction)
  - Premium subscription management

**Authoritative For**:
- Accounting logic and calculations
- KSeF integration patterns
- Tax compliance rules
- Invoice generation and validation
- Business profile data model

**Entry Point**: `@/ksef-ai/src/App.tsx`  
**Routing**: `@/ksef-ai/src/shared/config/routes.tsx` (centralized config)  
**Backend**: Supabase (project: `rncrzxjyffxmfbnxlqtm`)

---

### 2. **ksiegai-next** (Marketing & Auth Site)
- **URL**: `ksiegai.pl`
- **Tech**: Next.js 14 (App Router) + TypeScript
- **Purpose**: SEO landing page, user registration, auth entry point
- **Users**: Prospective customers, new signups
- **Key Features**:
  - Marketing pages (homepage, pricing, features)
  - User registration flow
  - Login with redirect to app.ksiegai.pl
  - AB testing integration (fetched at build time)
  - SEO optimization (sitemap, robots, metadata)

**Authoritative For**:
- Public-facing content
- User acquisition funnel
- AB test configuration
- Initial auth flow

**Entry Point**: `@/ksiegai-next/app/layout.tsx`  
**Routing**: Next.js App Router (`app/` directory structure)  
**Backend**: Supabase Auth + AB tests table

**Auth Flow**:
1. User registers/logs in on `ksiegai.pl`
2. Supabase creates session
3. Cross-domain token set
4. Redirect to `app.ksiegai.pl` with token
5. ksef-ai validates and establishes session

---

### 3. **admin-ksiegai** (Internal Admin Console)
- **URL**: `admin.ksiegai.pl` (assumed)
- **Tech**: React 18 + Vite + TypeScript
- **Purpose**: Internal operations, user support, system monitoring
- **Users**: KsięgaI staff, support team, super admins
- **Key Features**:
  - User management (view all users, business profiles)
  - Invoice monitoring across all accounts
  - Email campaign management
  - AB test management (CRUD operations)
  - Audit logs and system health
  - Discussion/support ticket management
  - Staff role management

**Authoritative For**:
- Admin operations
- Email template management
- AB test configuration (writes to Supabase)
- System monitoring and health checks

**Entry Point**: `@/admin-ksiegai/src/App.tsx`  
**Routing**: React Router DOM (routes in `App.tsx`)  
**Backend**: Supabase (elevated RLS policies for admins)

**Security**:
- Anti-SEO headers (noindex, nofollow)
- Role-based access control (admin, super_admin)
- Separate auth context with role checks

---

### 4. **tovernet/crm-tover** (CRM + Client Portal)
- **URL**: `crm.tovernet.online` (assumed)
- **Tech**: React 18 + Vite + TypeScript
- **Purpose**: Client relationship management, client-facing portal
- **Users**: Tovernet clients, Tovernet staff
- **Key Features**:
  - **Admin Side**: Client management, workspace management, invoicing
  - **Client Portal**: Dashboard, progress tracking, document access, contracts
  - Dual-mode architecture (admin vs client views)
  - Onboarding flows
  - Contract signing and document vault
  - Analytics and planning tools

**Authoritative For**:
- Client relationship data
- Client portal UX
- Contract workflows
- Client-specific business logic (separate from accounting)

**Entry Point**: `@/tovernet/crm-tover/src/App.tsx`  
**Routing**: React Router DOM with role-based guards  
**Backend**: Supabase (separate schema or project - verify)

**Architecture Note**:
- Clear separation between admin routes (`/admin/*`) and client routes (`/client/*`)
- Security middleware for access control
- Modular client portal structure (`modules/client/modules/*`)

---

### 5. **tovernet/tovernet-nest** (Tovernet Website)
- **URL**: `tovernet.online`
- **Tech**: Next.js 14 (App Router) + TypeScript
- **Purpose**: Public website for Tovernet company
- **Users**: Prospective clients, general public
- **Key Features**:
  - Company information
  - Service descriptions
  - Internationalization (next-intl)
  - Contact forms
  - SEO optimization

**Authoritative For**:
- Tovernet brand presence
- Public-facing content
- Lead generation

**Entry Point**: `@/tovernet/tovernet-nest/app/layout.tsx`  
**Routing**: Next.js App Router  
**Backend**: Minimal (mostly static, possibly edge functions)

---

### 6. **tovernet/n8n** (Automation Workflows)
- **Tech**: n8n (workflow automation platform)
- **Purpose**: Backend automation, integrations, scheduled tasks
- **Key Features**:
  - Email automation
  - Data synchronization
  - Webhook handlers
  - Scheduled jobs (e.g., KSeF sync)

**Authoritative For**:
- Cross-system automation
- Scheduled background jobs
- External integrations

**Integration Points**:
- Supabase (read/write data)
- Email services
- KSeF sync coordination
- Webhook receivers

---

### 7. **z-all-ksef-repos** (Reference Only)
- **Purpose**: Official KSeF client implementations and documentation
- **Status**: **READ-ONLY** - Do not modify
- **Usage**: 
  - Validate crypto/signing flows
  - Understand official API patterns
  - Reference for edge cases
  - Documentation source

**Contents**:
- `ksef-client-csharp/` - C# reference implementation
- `ksef-client-java/` - Java reference implementation
- `ksef-docs/` - Official documentation
- `ksef-pdf-generator/` - PDF generation utilities

---

## Data Architecture

### Supabase Backend (Single Source of Truth)

**Project**: `rncrzxjyffxmfbnxlqtm` (Fakturing)  
**Region**: EU North 1  
**Database**: PostgreSQL 15.8

#### Core Tables & Ownership

| Table | Primary Owner | Used By | Purpose |
|-------|---------------|---------|---------|
| `business_profiles` | ksef-ai | All apps | Business entities (JDG, sp. z o.o., etc.) |
| `invoices` | ksef-ai | admin, crm | Income invoices |
| `expenses` | ksef-ai | admin | Expense tracking |
| `customers` | ksef-ai | crm | Kontrahenci (business partners) |
| `products` | ksef-ai | - | Product/service catalog |
| `ksef_integrations` | ksef-ai | - | KSeF connection configs |
| `ksef_documents_raw` | ksef-ai | - | Immutable KSeF XML storage |
| `ksef_audit_log` | ksef-ai | admin | KSeF API operation logs |
| `ksef_sync_runs` | ksef-ai | admin | Background sync job tracking |
| `ab_tests` | admin | ksiegai-next | AB test configurations |
| `email_templates` | admin | n8n | Email campaign templates |
| `admin_users` | admin | - | Staff role assignments |
| `crm_clients` | crm-tover | - | CRM client records (separate from accounting) |

#### Tenant Model & RLS

**Isolation Strategy**: Row-Level Security (RLS) based on `user_id`

- Users see only their own `business_profiles` and related data
- Admins have elevated policies via `admin_users` table
- Cross-tenant queries blocked at database level
- No shared data between users except public reference tables

**Key RLS Patterns**:
```sql
-- Standard user policy
CREATE POLICY "Users see own profiles"
ON business_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admin override
CREATE POLICY "Admins see all"
ON business_profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
));
```

#### KSeF Integration Schema

**Critical Tables**:
- `ksef_integrations`: Per-profile KSeF configuration (environment, credentials)
- `ksef_documents_raw`: Immutable XML storage for audit trail
- `ksef_invoices_received`: Parsed incoming invoices from KSeF
- `ksef_audit_log`: Complete operation history (security + compliance)
- `ksef_sync_runs`: Background job execution tracking

**Data Flow**:
1. User enables KSeF in business profile
2. `ksef_integrations` record created (test/prod environment)
3. Auth token encrypted and stored in `business_profiles.ksef_token_encrypted`
4. Invoices sent → logged in `ksef_audit_log`, XML in `ksef_documents_raw`
5. Background sync job fetches new invoices → `ksef_invoices_received`
6. User imports to local `invoices` table

---

## Authentication & Authorization

### Auth Flow Across Apps

```
┌─────────────────┐
│  ksiegai.pl     │ 1. User registers/logs in
│  (ksiegai-next) │ 2. Supabase Auth creates session
└────────┬────────┘
         │ 3. Set cross-domain token
         ▼
┌─────────────────┐
│ app.ksiegai.pl  │ 4. Redirect with token
│  (ksef-ai)      │ 5. Validate & establish session
└─────────────────┘
```

**Cross-Domain Token Flow**:
- Token stored in localStorage with domain-specific key
- Validated on app.ksiegai.pl via `getCrossDomainAuthToken()`
- Session established via Supabase `setSession()`
- Token cleared after successful auth

**Auth Context Providers**:
- `@/ksef-ai/src/shared/context/AuthContext.tsx` - Main app auth
- `@/admin-ksiegai/src/contexts/AuthContext.tsx` - Admin auth with role checks
- `@/crm-tover/src/contexts/AuthContext.tsx` - CRM auth with admin/client split

### Role-Based Access Control

**Roles** (in `admin_users` table):
- `admin` - Support staff, can view all data
- `super_admin` - Full system access, can modify settings
- `client` (implicit) - Regular users, RLS-restricted

**Permission Checks**:
- Frontend: Route guards (`<ProtectedRoute requiredRole="admin">`)
- Backend: RLS policies check `admin_users` table
- API: Edge functions validate JWT claims

---

## KSeF Integration Architecture

### What is KSeF?

**KSeF** (Krajowy System e-Faktur) = Polish national e-invoicing system  
**Mandatory** for B2B invoices in Poland (phased rollout)  
**Operated by**: Polish Ministry of Finance

### Integration Strategy

**Environments**:
- **Test**: `https://ksef-test.mf.gov.pl` (default for new users)
- **Production**: `https://ksef.mf.gov.pl` (opt-in only)

**Service Layer**: `@/ksef-ai/src/shared/services/ksef/`

**Key Services**:
- `ksefAuthCoordinator.ts` - Manages auth lifecycle across sessions
- `ksefContextManager.ts` - Session context and state management
- `ksefApiClient.ts` - HTTP client with retry/rate limiting
- `ksefCryptographyService.ts` - XML signing, encryption
- `ksefInvoiceRetrievalService.ts` - Fetch invoices from KSeF
- `ksefSyncJob.ts` - Background sync orchestration
- `ksefXmlGenerator.ts` - FA_VAT XML generation

**Authentication Flow**:
1. User provides NIP + token (from KSeF portal)
2. Token encrypted and stored in `business_profiles.ksef_token_encrypted`
3. Session initialized via `ksefAuthCoordinator.initializeSession()`
4. Session context stored in `ksefContextManager`
5. All API calls use active session token
6. Token refresh handled automatically

**Sending Invoices**:
1. User creates invoice in ksef-ai
2. XML generated via `ksefXmlGenerator`
3. Signed with business profile credentials
4. Sent via `ksefApiClient.sendInvoice()`
5. Response logged in `ksef_audit_log`
6. Raw XML stored in `ksef_documents_raw`

**Receiving Invoices**:
1. Background job (`ksefSyncJob`) runs periodically (via n8n or cron)
2. Fetches new invoices via `ksefInvoiceRetrievalService`
3. Stores in `ksef_invoices_received`
4. User reviews and imports to local `invoices` table

**Reference Validation**:
- Check `z-all-ksef-repos/ksef-client-java/` for official patterns
- Crypto flows must match official implementation
- Endpoint usage validated against `ksef-docs/`

---

## Routing Architecture

### ksef-ai (Centralized Route Config)

**File**: `@/ksef-ai/src/shared/config/routes.tsx`

**Pattern**: Declarative route configuration with metadata

```typescript
export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    guard: 'protected',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    section: 'main',
  },
  // ... more routes
];
```

**Guards**:
- `public` - No auth required
- `protected` - Requires authentication
- `premium` - Requires premium subscription
- `onboarding` - Onboarding flow only

**Route Renderer**: `@/ksef-ai/src/pages/routing/RouteRenderer.tsx`  
Generates React Router routes from config + applies guards

**Benefits**:
- Single source of truth for all routes
- Easy to generate navigation
- Centralized permission management
- Clear app structure at a glance

### ksiegai-next (Next.js App Router)

**Pattern**: File-system based routing in `app/` directory

```
app/
├── page.tsx              → /
├── auth/
│   ├── login/page.tsx    → /auth/login
│   └── register/page.tsx → /auth/register
├── cennik/page.tsx       → /cennik
└── api/
    └── ab-tests/route.ts → /api/ab-tests
```

**Layouts**: Nested layouts via `layout.tsx` files  
**Metadata**: SEO metadata in `layout.tsx` and `page.tsx`  
**API Routes**: `route.ts` files in `api/` directory

### admin-ksiegai & crm-tover (React Router)

**Pattern**: Routes defined in `App.tsx` with `<Routes>` component

**Admin Example**:
```typescript
<Route path="/admin/clients" element={
  <ProtectedRoute requireAuth adminOnly>
    <ClientManagement />
  </ProtectedRoute>
} />
```

**Guards**: Inline via `<ProtectedRoute>` wrapper component

---

## State Management

### React Query (TanStack Query)

**Used By**: All React apps (ksef-ai, admin-ksiegai, crm-tover)

**Pattern**:
- Data fetching via `useQuery` hooks
- Mutations via `useMutation` hooks
- Cache invalidation on mutations
- Optimistic updates for UX

**Example** (`@/ksef-ai/src/modules/invoices/hooks/useInvoices.ts`):
```typescript
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices', businessProfileId],
    queryFn: () => fetchInvoices(businessProfileId),
  });
};
```

**Cache Persistence** (ksef-ai only):
- `@/ksef-ai/src/shared/lib/queryPersistence.ts`
- Saves query cache to localStorage
- Restores on app load for instant UI

### Context Providers (ksef-ai)

**Provider Hierarchy** (`@/ksef-ai/src/App.tsx`):
```
ThemeProvider
└── QueryClientProvider
    └── TooltipProvider
        └── Router
            └── AuthProvider
                └── DepartmentProvider
                    └── BusinessProfileProvider
                        └── WorkspaceTabsProvider
```

**Key Contexts**:
- `AuthContext` - User session, premium status
- `BusinessProfileContext` - Active business profile
- `DepartmentProvider` - Operations department selection
- `WorkspaceTabsContext` - Multi-tab workspace state

---

## Development Workflow

### Local Development

**ksef-ai**:
```bash
cd ksef-ai
npm run dev  # Vite dev server on http://localhost:5173
```

**ksiegai-next**:
```bash
cd ksiegai-next
npm run dev  # Next.js dev server on http://localhost:3000
```

**admin-ksiegai**:
```bash
cd admin-ksiegai
npm run dev  # Vite dev server on http://localhost:5174
```

**crm-tover**:
```bash
cd tovernet/crm-tover
npm run dev  # Vite dev server on http://localhost:5175
```

### Environment Variables

**Required for ksef-ai**:
- Supabase URL/key auto-generated in `src/integrations/supabase/client.ts`
- KSeF endpoints in `src/shared/services/ksef/config.ts`
- Stripe keys (if using payments)

**Required for ksiegai-next**:
- Supabase URL/key (for auth + AB tests)
- GTM ID (Google Tag Manager)

**Required for admin-ksiegai**:
- Supabase URL/key (elevated permissions)

### Database Migrations

**ALWAYS use Supabase MCP**:
```typescript
mcp0_apply_migration({
  project_id: 'rncrzxjyffxmfbnxlqtm',
  name: 'add_ksef_sync_tracking',
  query: 'CREATE TABLE ksef_sync_runs (...);'
});
```

**After migration**:
1. Generate TypeScript types: `mcp0_generate_typescript_types`
2. Check advisors: `mcp0_get_advisors` (security/performance)
3. Update relevant app code
4. Test RLS policies

---

## Integration Points

### App-to-App Communication

**Direct**: None (apps are independent)  
**Indirect**: Via Supabase database

**Shared Data**:
- `business_profiles` - Read by ksef-ai, admin, crm
- `invoices` - Written by ksef-ai, read by admin
- `ab_tests` - Written by admin, read by ksiegai-next at build time

**Event Flow**:
1. User action in ksef-ai → writes to Supabase
2. Admin views in admin-ksiegai → reads from Supabase
3. n8n workflow triggers → reads/writes Supabase
4. Client portal in crm-tover → reads relevant data

### External Integrations

**KSeF API**:
- Owner: ksef-ai
- Pattern: Service layer in `src/shared/services/ksef/`
- Auth: Token-based, stored encrypted
- Logging: All operations in `ksef_audit_log`

**Stripe** (Payments):
- Owner: ksef-ai (premium subscriptions)
- Integration: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Webhooks: Handle in Supabase Edge Functions

**Email** (Transactional):
- Owner: admin-ksiegai (templates), n8n (sending)
- Provider: TBD (likely Resend or SendGrid)
- Templates: Stored in `email_templates` table

**Analytics**:
- Google Tag Manager (GTM) in ksiegai-next
- PostHog in ksef-ai (`posthog-js`)

---

## Deployment Architecture

### Hosting (Assumed)

- **ksef-ai**: `app.ksiegai.pl` (Vercel/Netlify/custom)
- **ksiegai-next**: `ksiegai.pl` (Vercel recommended for Next.js)
- **admin-ksiegai**: `admin.ksiegai.pl` (Vercel/Netlify)
- **crm-tover**: `crm.tovernet.online` (Vercel/Netlify)
- **tovernet-nest**: `tovernet.online` (Vercel)
- **Supabase**: Managed cloud (EU North 1)
- **n8n**: Self-hosted or n8n Cloud

### Build Process

**ksef-ai**:
```bash
npm run build        # Production build
npm run build:dev    # Development build (with debug)
```

**ksiegai-next**:
```bash
npm run prebuild     # Fetch AB tests from Supabase
npm run build        # Next.js production build
```

**Others**: Standard Vite build (`npm run build`)

### Environment-Specific Behavior

**KSeF**:
- Development: Always use test environment
- Production: User chooses test vs production

**Supabase**:
- Same project for all environments (RLS handles isolation)
- Consider separate projects for staging if needed

---

## Security Considerations

### Data Protection

**Encryption at Rest**:
- KSeF tokens: Encrypted in `business_profiles.ksef_token_encrypted`
- Sensitive fields: Use Supabase encryption if needed

**Encryption in Transit**:
- All API calls over HTTPS
- Supabase connections encrypted

**Audit Trail**:
- `ksef_audit_log` - All KSeF operations
- `admin_audit_log` - Admin actions (if exists)
- Immutable storage in `ksef_documents_raw`

### Access Control

**Frontend**:
- Route guards prevent unauthorized access
- UI elements hidden based on permissions
- **NOT** a security boundary (enforce in backend)

**Backend (Supabase RLS)**:
- Primary security boundary
- Policies enforce user isolation
- Admin policies checked via `admin_users` table
- Never trust frontend permissions

### Compliance

**GDPR**:
- User data deletion flows (TBD)
- Data export capabilities (TBD)
- Privacy policy in ksiegai-next

**Polish Tax Law**:
- KSeF integration for compliance
- Audit logs for tax authority requests
- Immutable invoice storage

---

## Performance Optimization

### ksef-ai

**Query Caching**:
- React Query cache (5-minute default)
- localStorage persistence for instant load
- Invalidation on mutations

**Code Splitting**:
- Lazy-loaded routes via `React.lazy()`
- Suspense boundaries for loading states

**Bundle Optimization**:
- Vite tree-shaking
- Dynamic imports for large modules

### ksiegai-next

**Next.js Optimizations**:
- Static generation for marketing pages
- Image optimization via `next/image`
- Font optimization (Inter from Google Fonts)
- Metadata for SEO

**AB Test Prebuild**:
- Fetches AB tests at build time (not runtime)
- Reduces client-side requests

---

## Testing Strategy

### Current State

**ksef-ai**:
- Jest configured (`npm run test`)
- Testing library setup
- Limited test coverage (expand as needed)

**Others**: No test setup visible (add if needed)

### Recommended Approach

**Unit Tests**:
- Business logic (calculations, validators)
- Utility functions
- KSeF service layer

**Integration Tests**:
- Supabase queries (use test project)
- KSeF API calls (use test environment)
- Auth flows

**E2E Tests**:
- Critical user journeys (invoice creation, KSeF send)
- Use Playwright or Cypress

---

## Troubleshooting Common Issues

### "User can't log in"
1. Check Supabase Auth logs
2. Verify email confirmation (if required)
3. Check cross-domain token flow
4. Verify RLS policies on `business_profiles`

### "KSeF integration not working"
1. Check environment (test vs production)
2. Verify token not expired (`ksef_token_expires_at`)
3. Check `ksef_audit_log` for error details
4. Validate against reference implementation in `z-all-ksef-repos/`

### "Data not showing in admin panel"
1. Verify admin user in `admin_users` table
2. Check RLS policies (admin override)
3. Confirm Supabase connection (same project)

### "AB tests not appearing"
1. Check `ab_tests` table in Supabase
2. Verify `npm run prebuild` ran in ksiegai-next
3. Check build logs for fetch errors

---

## Future Considerations

### Scalability

**Database**:
- Monitor Supabase usage (rows, storage, API calls)
- Consider read replicas if needed
- Optimize slow queries (check advisors)

**Frontend**:
- CDN for static assets
- Edge caching for Next.js apps
- Consider micro-frontends if apps grow too large

### Modularity

**Potential Extractions**:
- KSeF service layer → standalone package
- Shared UI components → component library
- Supabase types → shared types package

**Benefits**:
- Easier testing
- Reusability across apps
- Independent versioning

---

## Quick Reference

### Key Files by App

**ksef-ai**:
- Entry: `src/App.tsx`
- Routes: `src/shared/config/routes.tsx`
- Auth: `src/shared/context/AuthContext.tsx`
- KSeF: `src/shared/services/ksef/`
- Supabase: `src/integrations/supabase/client.ts`

**ksiegai-next**:
- Entry: `app/layout.tsx`
- Homepage: `app/page.tsx`
- Auth: `app/auth/`
- AB Tests: `scripts/fetch-ab-tests.js`

**admin-ksiegai**:
- Entry: `src/App.tsx`
- Auth: `src/contexts/AuthContext.tsx`
- Pages: `src/pages/`

**crm-tover**:
- Entry: `src/App.tsx`
- Admin: `src/modules/admin/`
- Client Portal: `src/modules/client/`

### Supabase MCP Commands

```typescript
// List tables
mcp0_list_tables({ project_id: 'rncrzxjyffxmfbnxlqtm', schemas: ['public'] })

// Execute SQL
mcp0_execute_sql({ project_id: 'rncrzxjyffxmfbnxlqtm', query: 'SELECT ...' })

// Apply migration
mcp0_apply_migration({ project_id: 'rncrzxjyffxmfbnxlqtm', name: 'migration_name', query: 'CREATE TABLE ...' })

// Get advisors (security/performance)
mcp0_get_advisors({ project_id: 'rncrzxjyffxmfbnxlqtm', type: 'security' })

// Generate types
mcp0_generate_typescript_types({ project_id: 'rncrzxjyffxmfbnxlqtm' })
```

---

**For detailed app-specific information, see individual `AGENT_GUIDE.md` files in each application directory.**
