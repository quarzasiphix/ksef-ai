# ksef-ai Agent Guide

## Application Overview

**Name**: ksef-ai (KsięgaI Accounting Application)  
**URL**: `app.ksiegai.pl`  
**Tech Stack**: React 18 + Vite + TypeScript + TanStack Query + Supabase  
**Purpose**: Full-featured Polish accounting system with KSeF e-invoicing integration

**User Personas**:
- Polish business owners (JDG, sp. z o.o., SA)
- Accountants managing multiple clients
- Power users requiring advanced tax compliance

---

## Critical Context

### This App is Authoritative For:
- ✅ Accounting logic and tax calculations
- ✅ KSeF integration patterns and flows
- ✅ Invoice generation and validation
- ✅ Business profile data model
- ✅ Polish tax compliance rules

### Non-Negotiables:
- **Correctness > Speed**: Accounting errors have legal/financial consequences
- **KSeF Test Mode**: Default to test environment unless explicitly production
- **Supabase MCP**: ALWAYS use MCP tools for backend queries
- **Reference Validation**: Check `z-all-ksef-repos/` for KSeF patterns

---

## Project Structure

```
ksef-ai/
├── src/
│   ├── App.tsx                    # Main app entry, provider hierarchy
│   ├── main.tsx                   # Vite entry point
│   ├── components/                # Shared components (legacy, being migrated)
│   ├── data/                      # Static data, constants
│   ├── integrations/
│   │   ├── supabase/              # Auto-generated Supabase client
│   │   └── ksef/                  # KSeF integration helpers
│   ├── modules/                   # Feature modules (primary structure)
│   │   ├── accounting/            # Księgowość (ledger, balance sheet, etc.)
│   │   ├── auth/                  # Authentication screens
│   │   ├── banking/               # Bank accounts
│   │   ├── contracts/             # Contracts (legacy, migrating to documents)
│   │   ├── customers/             # Kontrahenci (business partners)
│   │   ├── decisions/             # Company decisions (governance)
│   │   ├── documents/             # Document management system
│   │   ├── employees/             # HR, labour hours
│   │   ├── events/                # Event-driven accounting system
│   │   ├── inbox/                 # Business inbox, discussions
│   │   ├── invoices/              # Invoice management (income/expense)
│   │   ├── ksef/                  # KSeF screens
│   │   ├── onboarding/            # User onboarding flow
│   │   ├── operations/            # Operations module (transport, funeral, etc.)
│   │   ├── premium/               # Premium subscription
│   │   ├── products/              # Product/service catalog
│   │   ├── projects/              # Departments/projects
│   │   ├── settings/              # Settings screens
│   │   └── spolka/                # Sp. z o.o. specific features
│   ├── pages/                     # Page components, routing
│   │   └── routing/               # Route renderer, guards
│   ├── services/                  # Legacy services (being migrated to shared)
│   ├── shared/                    # Shared utilities (preferred location)
│   │   ├── components/            # Reusable components
│   │   ├── config/                # Configuration files
│   │   │   ├── routes.tsx         # ⭐ CENTRALIZED ROUTE CONFIG
│   │   │   └── domains.ts         # Domain configuration
│   │   ├── context/               # React contexts
│   │   │   ├── AuthContext.tsx    # ⭐ Auth state, premium status
│   │   │   ├── BusinessProfileContext.tsx
│   │   │   ├── DepartmentContext.tsx
│   │   │   └── WorkspaceTabsContext.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utility libraries
│   │   │   ├── queryClient.ts     # TanStack Query config
│   │   │   ├── queryPersistence.ts # Cache persistence
│   │   │   ├── auth-utils.ts      # Auth helpers
│   │   │   └── crossDomainAuth.ts # Cross-domain token flow
│   │   ├── services/              # ⭐ Service layer (business logic)
│   │   │   ├── ksef/              # ⭐ KSeF integration services
│   │   │   ├── emailService.ts
│   │   │   ├── storageService.ts
│   │   │   └── syncManager.ts
│   │   ├── types/                 # TypeScript types
│   │   │   ├── supabase.ts        # Auto-generated Supabase types
│   │   │   └── common.ts          # Shared types
│   │   ├── ui/                    # shadcn/ui components
│   │   └── utils/                 # Utility functions
│   └── vite-env.d.ts
├── docs/                          # Documentation
│   ├── ksef/                      # ⭐ KSeF documentation
│   │   ├── official-docs/         # Official KSeF docs
│   │   └── dev-logs/              # Development logs
│   └── *.md                       # Feature documentation
├── supabase/                      # Supabase config (if local dev)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

---

## Routing Architecture

### Centralized Route Configuration

**File**: `@/src/shared/config/routes.tsx`

**Pattern**: Declarative route config with metadata for nav generation

```typescript
export interface RouteConfig {
  path: string;
  element?: React.ReactNode;
  guard?: 'public' | 'protected' | 'premium' | 'onboarding';
  children?: RouteConfig[];
  title?: string;        // For nav generation
  icon?: string;         // Lucide icon name
  section?: string;      // Nav section grouping
  hideInNav?: boolean;   // Hide from sidebar
}

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

**Route Guards**:
- `public` - No authentication required
- `protected` - Requires authenticated user
- `premium` - Requires premium subscription
- `onboarding` - Onboarding flow only

**Route Renderer**: `@/src/pages/routing/RouteRenderer.tsx`
- Generates React Router routes from config
- Applies guards via `AppGate` component
- Handles lazy loading with Suspense
- Manages returnTo logic for auth redirects

### Adding a New Route

1. Add to `routes` array in `@/src/shared/config/routes.tsx`
2. Create lazy-loaded component import at top of file
3. Specify guard, title, icon, section
4. Route automatically appears in sidebar (unless `hideInNav: true`)

**Example**:
```typescript
// At top of routes.tsx
const MyNewPage = React.lazy(() => import('@/modules/mymodule/screens/MyNewPage'));

// In routes array
{
  path: '/my-new-feature',
  element: <MyNewPage />,
  guard: 'protected',
  title: 'My Feature',
  icon: 'Sparkles',
  section: 'main',
}
```

### Deep Links & Navigation

**Programmatic Navigation**:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/invoices/123');
```

**Link Components**:
```typescript
import { Link } from 'react-router-dom';

<Link to="/customers/456">View Customer</Link>
```

**Auth Redirects**:
- Unauthenticated users → `ksiegai.pl/auth/login?returnTo=<current_path>`
- After login → redirected back to original path
- Cross-domain token flow handles session transfer

---

## State Management

### TanStack Query (React Query)

**Primary data fetching pattern**. All server state managed via React Query.

**Query Client**: `@/src/shared/lib/queryClient.ts`

**Common Patterns**:

**1. Fetching Data**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useInvoices = (businessProfileId: string) => {
  return useQuery({
    queryKey: ['invoices', businessProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .order('issue_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
};
```

**2. Mutations**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: NewInvoice) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
```

**3. Optimistic Updates**:
```typescript
const mutation = useMutation({
  mutationFn: updateInvoice,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['invoice', id] });
    const previous = queryClient.getQueryData(['invoice', id]);
    queryClient.setQueryData(['invoice', id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['invoice', id], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
  },
});
```

**Cache Persistence** (Unique Feature):
- `@/src/shared/lib/queryPersistence.ts`
- Saves query cache to localStorage
- Restores on app load for instant UI
- Configured queries persist automatically

### React Context

**Provider Hierarchy** (from `@/src/App.tsx`):
```
ThemeProvider (dark mode)
└── QueryClientProvider (TanStack Query)
    └── TooltipProvider (Radix UI)
        └── Router (React Router)
            └── AuthProvider ⭐
                └── DepartmentProvider
                    └── BusinessProfileProvider ⭐
                        └── WorkspaceTabsProvider
```

**Key Contexts**:

**1. AuthContext** (`@/src/shared/context/AuthContext.tsx`):
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  login: (email: string, password: string) => Promise<...>;
  logout: () => Promise<void>;
  openPremiumDialog: (planId?: string) => void;
  signInWithGoogle: () => Promise<void>;
}

// Usage
const { user, isPremium, logout } = useAuth();
```

**2. BusinessProfileContext** (`@/src/shared/context/BusinessProfileContext.tsx`):
```typescript
// Manages active business profile selection
const { activeProfile, setActiveProfile, profiles } = useBusinessProfile();
```

**3. DepartmentContext** (`@/src/shared/context/DepartmentContext.tsx`):
```typescript
// For operations module (transport, funeral, etc.)
const { activeDepartment, setActiveDepartment } = useDepartment();
```

---

## Module Structure

### Standard Module Pattern

Each module in `src/modules/` follows this structure:

```
modules/mymodule/
├── screens/              # Page components
│   ├── MyList.tsx
│   ├── MyDetail.tsx
│   └── MyNew.tsx
├── components/           # Module-specific components
│   ├── MyCard.tsx
│   └── MyForm.tsx
├── hooks/                # Module-specific hooks
│   ├── useMyData.ts
│   └── useMyMutation.ts
├── data/                 # Data access layer (Supabase queries)
│   └── MyRepository.ts
├── types/                # Module-specific types
│   └── index.ts
└── utils/                # Module-specific utilities
    └── helpers.ts
```

### Key Modules

**invoices/** - Invoice management
- Screens: `IncomeList`, `ExpenseList`, `NewInvoice`, `EditInvoice`, `InvoiceDetail`
- Handles both income and expense invoices
- PDF generation, email sending
- KSeF integration for sending invoices

**ksef/** - KSeF integration UI
- Screens: `KsefPage`, `KsefInboxScreen`
- KSeF status dashboard
- Invoice sending interface
- Received invoice management

**accounting/** - Advanced accounting features
- Screens: `Accounting`, `BalanceSheet`, `GeneralLedger`, `KpirPage`, `VatPage`, `PitPage`
- Premium-only features
- Full double-entry bookkeeping
- Tax report generation

**operations/** - Multi-industry operations module
- Screens: `OperationsPage`, `JobDetailPage`, `JobsListPage`
- Department-based (Transport, Funeral, Construction, SaaS)
- Job/case management with documents, contracts, resources
- Operational workflow tracking

**documents/** - Document management system
- Screens: `DocumentsHubRedesigned`, `SectionDocumentsPage`, `DocumentDetailPage`
- Section-based organization (contracts, financial, operations, audit)
- Document templates and generation
- Attachment management

**customers/** - Kontrahenci (business partners)
- Screens: `CustomerList`, `NewCustomer`, `EditCustomer`, `CustomerDetail`
- NIP validation
- Transaction history
- Integration with invoices

**premium/** - Subscription management
- Screens: `Premium`, `PremiumPlanDetails`
- Stripe integration
- Plan selection and checkout
- Feature gating

---

## KSeF Integration

### Architecture Overview

**KSeF** = Krajowy System e-Faktur (Polish national e-invoicing system)

**Service Layer**: `@/src/shared/services/ksef/`

**Key Services**:

| Service | Purpose |
|---------|---------|
| `ksefAuthCoordinator.ts` | Manages auth lifecycle, session coordination |
| `ksefContextManager.ts` | Session context and state management |
| `ksefApiClient.ts` | HTTP client with retry/rate limiting |
| `ksefCryptographyService.ts` | XML signing, encryption |
| `ksefInvoiceRetrievalService.ts` | Fetch invoices from KSeF |
| `ksefSyncJob.ts` | Background sync orchestration |
| `ksefXmlGenerator.ts` | FA_VAT XML generation |
| `ksefValidator.ts` | Invoice validation before sending |
| `ksefService.ts` | High-level service facade |

### Configuration

**File**: `@/src/shared/services/ksef/config.ts`

```typescript
export const KSEF_CONFIGS: Record<KsefEnvironment, KsefConfig> = {
  test: {
    environment: 'test',
    baseUrl: 'https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge',
    // ... proxied through Supabase Edge Function to avoid CORS
  },
  production: {
    environment: 'production',
    baseUrl: 'https://api.ksef.mf.gov.pl/v2',
    // ... direct to KSeF API
  },
};
```

**Important**: Test environment uses Supabase Edge Function proxy to handle CORS issues.

### Authentication Flow

1. User provides NIP + token from KSeF portal
2. Token encrypted via `ksefSecretManager.encryptToken()`
3. Stored in `business_profiles.ksef_token_encrypted`
4. Session initialized via `ksefAuthCoordinator.initializeSession()`
5. Session context stored in `ksefContextManager`
6. All API calls use active session token
7. Token refresh handled automatically

### Sending Invoices

**Flow**:
1. User creates invoice in ksef-ai
2. Validation via `ksefValidator.validateInvoice()`
3. XML generation via `ksefXmlGenerator.generateFaVat()`
4. Signing via `ksefCryptographyService.signXml()`
5. Send via `ksefApiClient.sendInvoice()`
6. Log operation in `ksef_audit_log`
7. Store raw XML in `ksef_documents_raw`

**Code Example**:
```typescript
import { ksefService } from '@/shared/services/ksef';

const sendToKsef = async (invoice: Invoice) => {
  try {
    const result = await ksefService.sendInvoice(
      invoice,
      businessProfile,
      'test' // or 'production'
    );
    
    console.log('KSeF Number:', result.ksefNumber);
    console.log('Reference:', result.referenceNumber);
  } catch (error) {
    console.error('KSeF send failed:', error);
  }
};
```

### Receiving Invoices

**Background Sync**:
- Orchestrated by `ksefSyncJob.ts`
- Triggered periodically (via n8n or cron)
- Fetches new invoices since last sync
- Stores in `ksef_invoices_received` table

**Manual Fetch**:
```typescript
import { ksefInvoiceRetrievalService } from '@/shared/services/ksef';

const fetchInvoices = async () => {
  const invoices = await ksefInvoiceRetrievalService.fetchInvoices(
    businessProfileId,
    { fromDate: '2024-01-01', toDate: '2024-12-31' }
  );
  
  // Process invoices...
};
```

### Audit Logging

**All KSeF operations logged** in `ksef_audit_log`:
- Operation type (send, fetch, auth, etc.)
- Request/response payloads
- HTTP status codes
- Error messages
- Duration
- User/business profile context

**Query Example**:
```typescript
const { data } = await supabase
  .from('ksef_audit_log')
  .select('*')
  .eq('business_profile_id', profileId)
  .order('created_at', { ascending: false });
```

### Reference Validation

**ALWAYS** check `z-all-ksef-repos/` for:
- Crypto/signing flows (`ksef-client-java/`)
- Endpoint usage patterns
- XML structure validation
- Edge case handling

**Official Docs**: `@/docs/ksef/official-docs/`

---

## Data Access Patterns

### Supabase Client

**File**: `@/src/integrations/supabase/client.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

// Auto-configured with project URL and anon key
// TypeScript types auto-generated from database schema
```

### Standard Query Pattern

**Repository Pattern** (preferred):

```typescript
// modules/mymodule/data/MyRepository.ts
import { supabase } from '@/integrations/supabase/client';

export const fetchMyData = async (businessProfileId: string) => {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  
  if (error) throw error;
  return data;
};

export const createMyRecord = async (record: NewRecord) => {
  const { data, error } = await supabase
    .from('my_table')
    .insert(record)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Hook Pattern** (for React components):

```typescript
// modules/mymodule/hooks/useMyData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchMyData } from '../data/MyRepository';

export const useMyData = (businessProfileId: string) => {
  return useQuery({
    queryKey: ['myData', businessProfileId],
    queryFn: () => fetchMyData(businessProfileId),
    enabled: !!businessProfileId,
  });
};
```

### RLS (Row Level Security)

**All user-facing tables have RLS enabled**.

**Standard Policy Pattern**:
```sql
-- Users see only their own data
CREATE POLICY "Users see own records"
ON my_table FOR SELECT
USING (
  business_profile_id IN (
    SELECT id FROM business_profiles 
    WHERE user_id = auth.uid()
  )
);
```

**Admin Override**:
```sql
-- Admins see all data
CREATE POLICY "Admins see all"
ON my_table FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);
```

**Important**: Frontend permissions are NOT a security boundary. Always rely on RLS.

---

## Common Tasks

### Adding a New Feature

1. **Identify Module**: Determine which module owns the feature
2. **Create Components**: Add screens/components in module directory
3. **Add Route**: Update `@/src/shared/config/routes.tsx`
4. **Data Layer**: Create repository functions if new queries needed
5. **Hooks**: Create custom hooks for data fetching
6. **Types**: Add TypeScript types in module `types/` directory
7. **Test**: Verify with actual data, not mocks

### Modifying Supabase Schema

**CRITICAL**: Use Supabase MCP tools, never guess schema.

```typescript
// 1. Apply migration
mcp0_apply_migration({
  project_id: 'rncrzxjyffxmfbnxlqtm',
  name: 'add_my_feature_table',
  query: `
    CREATE TABLE my_feature (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_profile_id UUID REFERENCES business_profiles(id),
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE my_feature ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users see own" ON my_feature
    FOR SELECT USING (
      business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    );
  `
});

// 2. Generate TypeScript types
mcp0_generate_typescript_types({ project_id: 'rncrzxjyffxmfbnxlqtm' });

// 3. Check for security issues
mcp0_get_advisors({ project_id: 'rncrzxjyffxmfbnxlqtm', type: 'security' });
```

### Working with KSeF

1. **Read Official Docs**: `@/docs/ksef/official-docs/`
2. **Check Reference**: `z-all-ksef-repos/ksef-client-java/`
3. **Use Test Environment**: Default to `test` unless explicitly told otherwise
4. **Follow Service Pattern**: Use existing services in `@/src/shared/services/ksef/`
5. **Log Operations**: All KSeF calls automatically logged in `ksef_audit_log`
6. **Handle Errors**: KSeF can be unreliable, implement retry logic

### Adding a New Invoice Type

1. Update `TransactionType` enum in `@/src/shared/types/common.ts`
2. Add validation logic in `@/modules/invoices/utils/validators.ts`
3. Update PDF generation in `@/modules/invoices/utils/pdfGenerator.ts`
4. Add KSeF XML generation if applicable
5. Update invoice list screens to filter by type

---

## Environment & Configuration

### Development

```bash
npm run dev  # Start Vite dev server on http://localhost:5173
```

### Build

```bash
npm run build        # Production build
npm run build:dev    # Development build (with debug info)
```

### Environment Variables

**Supabase**:
- URL and key auto-configured in `@/src/integrations/supabase/client.ts`
- No `.env` file needed for Supabase connection

**KSeF**:
- Endpoints configured in `@/src/shared/services/ksef/config.ts`
- Test environment proxied through Supabase Edge Function

**Stripe** (if using):
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key

### TypeScript Configuration

**File**: `tsconfig.json`

**Path Aliases**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage**:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/context/AuthContext';
import { Dashboard } from '@/pages/Dashboard';
```

---

## Testing

### Current Setup

**Framework**: Jest + React Testing Library

**Config**: `jest.config.js`

**Run Tests**:
```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
```

### Testing Patterns

**Component Tests**:
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

**Hook Tests**:
```typescript
import { renderHook } from '@testing-library/react';
import { useMyHook } from './useMyHook';

test('returns correct data', () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.data).toBeDefined();
});
```

**Supabase Mocking**:
```typescript
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));
```

---

## Performance Optimization

### Query Caching

**Default Cache Time**: 5 minutes (configurable per query)

**Cache Persistence**:
- Queries automatically persisted to localStorage
- Restored on app load for instant UI
- Configured in `@/src/shared/lib/queryPersistence.ts`

### Code Splitting

**Lazy Loading**:
- All routes lazy-loaded via `React.lazy()`
- Suspense boundaries for loading states
- Automatic code splitting by Vite

**Example**:
```typescript
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));

<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### Bundle Optimization

**Vite Configuration**:
- Tree-shaking enabled by default
- Dynamic imports for large modules
- CSS code splitting

---

## Debugging & Troubleshooting

### Common Issues

**"User not authenticated"**:
1. Check `AuthContext` - is `user` null?
2. Verify Supabase session in browser DevTools → Application → Local Storage
3. Check cross-domain token flow if coming from ksiegai.pl
4. Verify RLS policies allow access

**"KSeF integration not working"**:
1. Check environment (test vs production)
2. Verify token not expired (`ksef_token_expires_at`)
3. Check `ksef_audit_log` for error details
4. Validate against reference implementation
5. Check CORS (test env uses proxy)

**"Data not loading"**:
1. Check React Query DevTools (enabled in dev mode)
2. Verify Supabase query in Network tab
3. Check RLS policies
4. Verify `business_profile_id` is correct
5. Check query key for cache issues

### Logging

**Console Logs**:
- Auth state changes logged in `AuthContext`
- KSeF operations logged to console + database
- Query cache operations logged in dev mode

**Supabase Logs**:
- Use Supabase MCP: `mcp0_get_logs({ project_id, service: 'api' })`

**KSeF Audit Log**:
```typescript
const { data } = await supabase
  .from('ksef_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## Code Style & Conventions

### File Naming

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase with `use` prefix (`useMyHook.ts`)
- **Utilities**: camelCase (`myUtil.ts`)
- **Types**: PascalCase (`MyType.ts` or `index.ts`)

### Import Order

1. React imports
2. Third-party libraries
3. Absolute imports (`@/...`)
4. Relative imports (`./...`)
5. Types (if separate)

### Component Structure

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/shared/context/AuthContext';

interface MyComponentProps {
  id: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id }) => {
  const { user } = useAuth();
  const { data, isLoading } = useMyData(id);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

### Don't Add Comments Unless Asked

- Code should be self-documenting
- Only add comments for complex business logic
- Don't add TODO comments without discussion

---

## Integration Points

### With ksiegai-next

**Auth Flow**:
1. User registers/logs in on `ksiegai.pl`
2. Cross-domain token set in localStorage
3. Redirect to `app.ksiegai.pl` with token
4. ksef-ai validates token and establishes session

**Code**: `@/src/shared/lib/crossDomainAuth.ts`

### With admin-ksiegai

**Shared Data**:
- `business_profiles` - Admin can view all
- `invoices` - Admin can view all
- `ksef_audit_log` - Admin monitors operations

**No Direct Integration**: Communication via Supabase database only

### With n8n

**Automation Triggers**:
- KSeF background sync (calls `ksefSyncJob.ts` logic)
- Email sending (uses `emailService.ts`)
- Scheduled tasks (data cleanup, reminders)

**Integration**: n8n calls Supabase Edge Functions or direct DB access

---

## Security Best Practices

### Authentication

- **Never** store tokens in plain text
- Use `ksefSecretManager` for KSeF token encryption
- Validate sessions on every protected route
- Clear auth state on logout

### Data Access

- **Always** filter by `business_profile_id`
- **Never** trust frontend permissions
- Rely on RLS for security boundary
- Validate user input before Supabase queries

### KSeF Integration

- **Default to test environment**
- Log all operations for audit trail
- Encrypt tokens at rest
- Validate XML before sending
- Handle errors gracefully (don't expose internals)

---

## Premium System Rules

### 🚫 NEVER DO - Premium Anti-Patterns

- **NEVER** use old `isPremium` boolean from AuthContext (deprecated)
- **NEVER** make direct API calls to `premium_subscriptions` or `enhanced_subscriptions` tables
- **NEVER** trust client-side premium status checks
- **NEVER** use stored `is_active` field from database
- **NEVER** implement premium checks without server verification
- **NEVER** store premium tokens in localStorage or sessionStorage

### ✅ ALWAYS DO - Premium Best Practices

- **ALWAYS** use `usePremiumSync()` hook for premium status
- **ALWAYS** let SyncManager handle premium verification (integrated)
- **ALWAYS** use server-side verification for sensitive operations
- **ALWAYS** check premium token validity before API calls
- **ALWAYS** rely on Edge Function `verify-premium-access` for verification
- **ALWAYS** use `usePremiumFeature(feature)` for specific feature checks
- **ALWAYS** protect premium routes with `usePremiumRoute()`

### 🔐 Premium Security Architecture

**Multi-Layer Security**:
1. **Real-Time Sync** - WebSocket monitors subscription changes
2. **Server Verification** - Edge Function validates and generates tokens
3. **Token-Based Access** - 5-minute encrypted JWT tokens
4. **Audit Logging** - All verification attempts tracked
5. **Database RLS** - Final security layer

**Premium Tiers**: `free` | `jdg_premium` | `spolka_premium` | `enterprise`

**Subscription Priority**:
1. Enterprise Benefits (highest)
2. Enhanced Subscriptions
3. Business Profile (legacy)

### 📋 Premium Feature Requirements

```typescript
// Feature access by tier
FEATURE_TIERS = {
  'advanced_analytics': ['jdg_premium', 'spolka_premium', 'enterprise'],
  'unlimited_invoices': ['jdg_premium', 'spolka_premium', 'enterprise'],
  'ksef_integration': ['jdg_premium', 'spolka_premium', 'enterprise'],
  'multi_business': ['enterprise'],
  'api_access': ['enterprise'],
  'priority_support': ['enterprise'],
}
```

### 🎯 Premium Hook Usage

**Main Premium Hook**:
```typescript
const { isActive, tier, token, isLoading } = usePremiumSync();
```

**Feature-Specific Hook**:
```typescript
const { hasAccess, isLoading } = usePremiumFeature('advanced_analytics');
```

**Route Protection Hook**:
```typescript
const { isAllowed, isLoading } = usePremiumRoute();
```

**Token Access Hook**:
```typescript
const { token, isValid } = usePremiumToken();
```

### 🚨 Premium Debugging

**Check Status**:
```typescript
import { premiumSyncService } from '@/shared/services/premiumSyncService';
const status = premiumSyncService.getStatus();
```

**Common Issues**:
- Token expired → Auto-refreshes, check network
- WebSocket disconnected → Auto-reconnects (max 5 attempts)
- Verification failing → Check Edge Function logs
- Old API calls → Remove direct table queries

### 🔄 Migration Rules

**Replace Old Code**:
```typescript
// ❌ OLD - Remove
const { isPremium } = useAuth();

// ✅ NEW - Use
const { isActive } = usePremiumSync();
```

**Remove Direct Queries**:
```typescript
// ❌ OLD - Remove
supabase.from('premium_subscriptions').select('*')

// ✅ NEW - Use hooks
const { isActive } = usePremiumSync();
```

### 📊 Premium Monitoring

**Audit Logs**: Check `premium_access_logs` table
**Edge Function**: Monitor `verify-premium-access` logs
**Real-Time Status**: Use `premiumSyncService.getStatus()`

### 🚀 Deployment

**Edge Function**: Deployed via MCP tools
**Secret**: `PREMIUM_TOKEN_SECRET` set via Supabase Dashboard (CLI not available)
**Database**: `premium_access_logs` table with RLS policies

---

## 🚨 **IMPORTANT: CLI Limitations & Manual Setup**

### **Supabase CLI Not Available**
- ❌ **CLI commands don't work** in this environment
- ✅ **Use MCP tools** for all database operations
- ✅ **Use Supabase Dashboard** for secrets and manual setup
- ✅ **Manual panel access** required for environment variables

### **Setting Secrets Without CLI**

Since Supabase CLI is not available, set secrets via Dashboard:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select Project**: `rncrzxjyffxmfbnxlqtm`
3. **Navigate**: Settings → Edge Functions
4. **Add Secret**: `PREMIUM_TOKEN_SECRET`
5. **Set Value**: Your generated secure secret

**Example Secret Value**:YOYO
```
YOUR_GENERATED_SECRET_HERE (use your own from pre-key.64 file)
```

### **Why Manual Setup is Required**

- **MCP tools don't include** secret management functions
- **CLI access restricted** in current environment  
- **Dashboard provides** full control over environment variables
- **Manual setup ensures** secrets are properly configured

### **Alternative: Generate Secret via Node.js**

```bash
# Generate secure secret without OpenSSL
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### **Verification Steps**

After setting secret in Dashboard:

1. **Test Edge Function**: Use browser or curl to test `verify-premium-access`
2. **Check Logs**: Use `get_logs` MCP tool to verify function works
3. **Monitor Premium System**: Check if premium verification works in app

---

---

## Premium Invoicing System

### 🎯 **Multi-Company Billing Architecture**

**Core Principle**: Users receive ONE consolidated invoice for ALL their premium companies.

### **Billing Model**
- **One invoice per user per billing period**
- **Multiple line items** - one per premium company
- **Aggregated total** - sum of all company subscriptions
- **Automatic generation** - 1st of each month
- **Payment methods** - Stripe (card, BLIK, Przelewy24)

### **Example Scenario**
```
User has 3 companies:
- Company A: JDG Premium (19 PLN/month)
- Company B: Spółka Premium (89 PLN/month)
- Company C: Spółka Premium (89 PLN/month)

Invoice Total: 197 PLN + 23% VAT = 242.31 PLN
```

---

### 📊 **Database Tables**

#### **subscription_invoices**
Main invoice records with status tracking
- `invoice_number` - Format: INV-YYYY-MM-NNNN
- `subtotal_amount` - In grosze (cents)
- `tax_amount` - 23% VAT
- `total_amount` - Final amount to pay
- `status` - draft, pending, paid, failed, cancelled, overdue
- `billing_period_start/end` - Period covered
- `due_date` - Payment deadline (7 days default)
- `stripe_checkout_session_id` - Stripe session reference
- `pdf_url` - Generated invoice PDF

#### **subscription_invoice_items**
Line items showing each company in invoice
- `business_profile_id` - Company reference
- `subscription_id` - Subscription reference
- `description` - "Premium JDG - Company Name"
- `subscription_type` - jdg_premium, spolka_premium
- `billing_cycle` - monthly, annual
- `unit_price` - Price in grosze
- `period_start/end` - Coverage period

#### **invoice_payment_attempts**
Payment tracking and audit trail
- `invoice_id` - Invoice reference
- `amount` - Payment amount
- `payment_method` - stripe_checkout, bank_transfer, blik
- `status` - pending, succeeded, failed, cancelled
- `stripe_payment_intent_id` - Stripe payment reference

---

### ⚡ **Edge Functions**

#### **generate-subscription-invoice**
**Purpose**: Generate consolidated invoice for all user's premium companies

**Usage**:
```typescript
// Auto-generate for current month
const { data, error } = await supabase.functions.invoke(
  'generate-subscription-invoice'
);

// Generate for specific period
const { data, error } = await supabase.functions.invoke(
  'generate-subscription-invoice',
  {
    body: {
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-01-31'
    }
  }
);
```

**Response**:
```typescript
{
  success: true,
  invoice: {
    id: "uuid",
    invoice_number: "INV-2026-01-0001",
    total_amount: 24231, // in grosze
    items: [...]
  },
  summary: {
    invoice_number: "INV-2026-01-0001",
    total_companies: 3,
    subtotal: 197.00,
    tax: 45.31,
    total: 242.31,
    due_date: "2026-01-08T00:00:00Z"
  }
}
```

**Key Features**:
- Aggregates ALL active premium subscriptions
- Calculates VAT (23%)
- Generates unique invoice number
- Creates line items per company
- Sets due date (7 days)

#### **create-invoice-checkout**
**Purpose**: Create Stripe checkout session for invoice payment

**Usage**:
```typescript
const { data, error } = await supabase.functions.invoke(
  'create-invoice-checkout',
  {
    body: {
      invoiceId: 'invoice-uuid',
      successUrl: 'https://app.com/invoices/success',
      cancelUrl: 'https://app.com/invoices'
    }
  }
);

// Redirect to checkout
window.location.href = data.checkout_url;
```

**Response**:
```typescript
{
  success: true,
  checkout_url: "https://checkout.stripe.com/...",
  session_id: "cs_xxx",
  invoice: {
    id: "uuid",
    invoice_number: "INV-2026-01-0001",
    total_amount: 242.31,
    currency: "pln"
  }
}
```

**Key Features**:
- Multi-company line items
- Polish payment methods (card, BLIK, P24)
- VAT included
- Automatic customer creation
- Payment attempt logging

---

### 🔄 **Invoice Generation Flow**

```
1. Monthly Cron Job (1st of month)
   ↓
2. Get all users with active premium subscriptions
   ↓
3. For each user:
   - Get all premium companies
   - Calculate total (sum of all subscriptions)
   - Generate invoice with line items
   - Set due date (7 days)
   ↓
4. Invoice created with status: pending
   ↓
5. User receives email notification
```

### 💳 **Payment Flow**

```
User → Invoice List → Select Invoice → Pay Now
  ↓
Create Checkout Session (Edge Function)
  ↓
Stripe Checkout (card/BLIK/P24)
  ↓
Payment Success Webhook
  ↓
Update Invoice Status → paid
Update Subscriptions → active
Generate PDF Invoice
Send Email with PDF
```

---

### 📝 **Invoice Queries**

#### **Get User Invoices**
```typescript
const { data: invoices } = await supabase
  .from('subscription_invoices')
  .select(`
    *,
    items:subscription_invoice_items (
      *,
      business_profile:business_profiles (
        id,
        name
      )
    )
  `)
  .order('issued_at', { ascending: false });
```

#### **Get Pending Invoices**
```typescript
const { data: pending } = await supabase
  .from('subscription_invoices')
  .select('*')
  .eq('status', 'pending')
  .lt('due_date', new Date().toISOString())
  .order('due_date', { ascending: true });
```

#### **Get Invoice by Number**
```typescript
const { data: invoice } = await supabase
  .from('subscription_invoices')
  .select(`
    *,
    items:subscription_invoice_items (*)
  `)
  .eq('invoice_number', 'INV-2026-01-0001')
  .single();
```

---

### 🎨 **Frontend Integration**

#### **Invoice List Component**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

function InvoiceList() {
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_invoices')
        .select('*, items:subscription_invoice_items(*)')
        .order('issued_at', { ascending: false });
      return data;
    }
  });

  return (
    <div>
      {invoices?.map(invoice => (
        <InvoiceCard key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
}
```

#### **Pay Invoice Button**
```typescript
async function handlePayInvoice(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke(
    'create-invoice-checkout',
    {
      body: {
        invoiceId,
        successUrl: `${window.location.origin}/invoices/success`,
        cancelUrl: `${window.location.origin}/invoices`
      }
    }
  );

  if (error) {
    toast.error('Failed to create checkout session');
    return;
  }

  // Redirect to Stripe
  window.location.href = data.checkout_url;
}
```

---

### 🔐 **Security & RLS**

**RLS Policies**:
- ✅ Users can only view their own invoices
- ✅ Users can only view their own invoice items
- ✅ Service role can manage all invoices
- ✅ Payment attempts are user-scoped

**Payment Security**:
- ✅ Stripe handles all payment processing
- ✅ No card details stored in database
- ✅ Webhook signature verification required
- ✅ Invoice IDs in metadata for verification

---

### 📊 **Pricing Reference**

| Plan | Monthly | Annual |
|------|---------|--------|
| JDG Premium | 19 PLN | 190 PLN |
| Spółka Premium | 89 PLN | 890 PLN |
| Enterprise | Custom | Custom |

### 🧾 **VAT Handling**

**Dynamic VAT Status**: VAT calculated per company based on business profile settings

**VAT Status Options**:
- **exempt** (zwolniony) - 0% VAT for VAT-exempt companies
- **zero** - 0% VAT rate
- **standard** - 23% VAT rate
- **reduced** - Reduced VAT rate (future use)

**Example Mixed Scenario**:
```
Company A: JDG Premium (19 PLN) - VAT exempt → 19.00 PLN
Company B: Spółka Premium (89 PLN) - Standard VAT → 109.47 PLN (89 + 23%)
Company C: Spółka Premium (89 PLN) - VAT exempt → 89.00 PLN

Invoice Total: 217.47 PLN
- Net: 197.00 PLN
- VAT: 20.47 PLN (only from Company B)
```

**Quick VAT Registration**: Use VatStatusManager component to instantly switch companies from VAT-exempt to standard VAT when ready for registration.

---

### 🚀 **Deployment Steps**

1. **Database Schema**: ✅ Already created via migration
2. **Deploy Edge Functions**:
   ```bash
   # Using MCP tools
   mcp1_deploy_edge_function(
     project_id: "rncrzxjyffxmfbnxlqtm",
     name: "generate-subscription-invoice",
     entrypoint_path: "index.ts",
     verify_jwt: true,
     files: [...]
   )
   
   mcp1_deploy_edge_function(
     project_id: "rncrzxjyffxmfbnxlqtm",
     name: "create-invoice-checkout",
     entrypoint_path: "index.ts",
     verify_jwt: true,
     files: [...]
   )
   ```

3. **Set Stripe Secret**: In Supabase Dashboard → Settings → Edge Functions
   - `STRIPE_SECRET_KEY` = your Stripe secret key

4. **Configure Webhook**: In Stripe Dashboard
   - URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/invoice-payment-webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`

5. **Test Flow**:
   - Generate test invoice
   - Create checkout session
   - Complete test payment
   - Verify invoice marked as paid

---

### 📚 **Related Documentation**

- **Design Doc**: `docs/PREMIUM_INVOICING_SYSTEM.md`
- **Implementation Summary**: `docs/INVOICING_IMPLEMENTATION_SUMMARY.md`
- **Subscription Types**: `src/shared/types/subscriptions.ts`
- **Premium Security**: `docs/PREMIUM_SECURITY_IMPLEMENTATION.md`

---

### 🎯 **Key Concepts for AI Agents**

1. **Multi-Company Billing**: ONE invoice per user for ALL companies
2. **Automatic Generation**: Cron job on 1st of month
3. **Stripe Integration**: Use existing Stripe setup
4. **Polish VAT**: Always add 23% tax
5. **Payment Methods**: Card, BLIK, Przelewy24
6. **Invoice Numbers**: Auto-generated (INV-YYYY-MM-NNNN)
7. **Due Date**: 7 days from issue date
8. **Status Flow**: draft → pending → paid/failed/overdue
9. **RLS Security**: Users only see their own invoices
10. **MCP Tools**: Always use for database operations

---

## MCP Supabase Tools - Complete Guide

### 🔧 **Essential MCP Tools for Backend Management**

**ALWAYS use MCP tools for Supabase operations** - never use direct SQL or CLI commands unless specifically instructed.

---

### 📚 **Documentation & Research Tools**

#### **search_docs**
**Purpose**: Search Supabase documentation using GraphQL
**When to Use**: Always check docs before implementing features
**Usage**:
```typescript
// Search for RLS policies
search_docs(query: "Row Level Security policies", limit: 10)

// Search for Edge Functions
search_docs(query: "Edge Functions deployment", limit: 5)

// Search for specific error codes
search_docs(query: "PGRST116 error", limit: 3)
```

**Best Practices**:
- ✅ **Always call this first** when unsure about implementation
- ✅ Use for troubleshooting error codes
- ✅ Check for latest patterns before coding

---

### 🏢 **Organization & Project Management**

#### **list_organizations**
**Purpose**: List all user organizations
**When to Use**: Creating projects, checking costs
**Usage**:
```typescript
// Get all organizations
list_organizations()
```

#### **get_organization**
**Purpose**: Get organization details including subscription
**When to Use**: Understanding billing limits, features
**Usage**:
```typescript
// Check organization subscription
get_organization(id: "org-id-here")
```

#### **list_projects**
**Purpose**: Discover all user projects
**When to Use**: Finding project IDs, understanding setup
**Usage**:
```typescript
// Find your project ID
list_projects()
```

#### **get_project**
**Purpose**: Get detailed project information
**When to Use**: Checking project status, database info
**Usage**:
```typescript
// Check project details
get_project(id: "rncrzxjyffxmfbnxlqtm")
```

#### **get_cost**
**Purpose**: Get cost for new projects/branches
**When to Use**: Before creating resources
**Usage**:
```typescript
// Check project creation cost
get_cost(organization_id: "org-id", type: "project")

// Check branch creation cost
get_cost(organization_id: "org-id", type: "branch")
```

#### **confirm_cost**
**Purpose**: Get user confirmation for costs
**When to Use**: Required before create_project/create_branch
**Usage**:
```typescript
// Get confirmation ID
confirm_cost(type: "project", amount: 0.01, recurrence: "monthly")
```

#### **create_project**
**Purpose**: Create new Supabase project
**When to Use**: Setting up new environments
**Usage**:
```typescript
// Create new project
create_project(
  name: "ksef-ai-staging",
  region: "us-west-1",
  organization_id: "org-id",
  confirm_cost_id: "confirmation-id"
)
```

#### **pause_project / restore_project**
**Purpose**: Manage project lifecycle
**When to Use**: Cost management, maintenance
**Usage**:
```typescript
pause_project(id: "project-id")
restore_project(id: "project-id")
```

---

### 🗄️ **Database Management Tools**

#### **list_tables**
**Purpose**: List all database tables
**When to Use**: Understanding schema, checking migrations
**Usage**:
```typescript
// List all tables
list_tables(project_id: "rncrzxjyffxmfbnxlqtm", schemas: ["public"])

// List specific schema tables
list_tables(project_id: "rncrzxjyffxmfbnxlqtm", schemas: ["auth", "public"])
```

#### **list_extensions**
**Purpose**: List database extensions
**When to Use**: Checking available extensions
**Usage**:
```typescript
// Check available extensions
list_extensions(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **list_migrations**
**Purpose**: List all database migrations
**When to Use**: Understanding database changes, debugging
**Usage**:
```typescript
// Check migration history
list_migrations(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **apply_migration**
**Purpose**: Apply DDL migrations to database
**When to Use**: Creating tables, adding columns, RLS policies
**CRITICAL**: **ALWAYS use this for DDL operations**
**Usage**:
```typescript
// Create new table
apply_migration(
  project_id: "rncrzxjyffxmfbnxlqtm",
  name: "create_premium_logs_table",
  query: `
    CREATE TABLE premium_access_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      tier text NOT NULL,
      verified boolean NOT NULL,
      accessed_at timestamptz DEFAULT now()
    );
    
    ALTER TABLE premium_access_logs ENABLE ROW LEVEL SECURITY;
  `
)

// Add RLS policy
apply_migration(
  project_id: "rncrzxjyffxmfbnxlqtm",
  name: "premium_logs_rls_policy",
  query: `
    CREATE POLICY "Users can view own logs" ON premium_access_logs
    FOR SELECT USING (user_id = auth.uid());
  `
)
```

#### **execute_sql**
**Purpose**: Execute raw SQL queries
**When to Use**: Data queries, testing, debugging
**CRITICAL**: **NEVER use for DDL operations**
**Usage**:
```typescript
// Check table data
execute_sql(
  project_id: "rncrzxjyffxmfbnxlqtm",
  query: "SELECT * FROM premium_access_logs WHERE user_id = 'user-id' LIMIT 10"
)

// Test RLS policies
execute_sql(
  project_id: "rncrzxjyffxmfbnxlqtm",
  query: "SELECT COUNT(*) FROM enhanced_subscriptions"
)
```

---

### 📊 **Monitoring & Debugging Tools**

#### **get_logs**
**Purpose**: Get service logs for debugging
**When to Use**: Troubleshooting Edge Functions, API issues
**Usage**:
```typescript
// Get Edge Function logs
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "edge-function")

// Get API logs
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "api")

// Get database logs
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "postgres")
```

#### **get_advisors**
**Purpose**: Get security and performance recommendations
**When to Use**: After database changes, security audits
**Usage**:
```typescript
// Check for security issues
get_advisors(project_id: "rncrzxjyffxmfbnxlqtm", type: "security")

// Check performance recommendations
get_advisors(project_id: "rncrzxjyffxmfbnxlqtm", type: "performance")
```

---

### 🔑 **API & Keys Management**

#### **get_project_url**
**Purpose**: Get project API URL
**When to Use**: Configuration, API setup
**Usage**:
```typescript
// Get API URL
get_project_url(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **get_publishable_keys**
**Purpose**: Get API keys for frontend
**When to Use**: Environment setup, key rotation
**Usage**:
```typescript
// Get all publishable keys
get_publishable_keys(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **generate_typescript_types**
**Purpose**: Generate TypeScript types from database
**When to Use**: After schema changes, type safety
**Usage**:
```typescript
// Generate types
generate_typescript_types(project_id: "rncrzxjyffxmfbnxlqtm")
```

---

### ⚡ **Edge Functions Management**

#### **list_edge_functions**
**Purpose**: List all deployed Edge Functions
**When to Use**: Checking deployment status
**Usage**:
```typescript
// List all functions
list_edge_functions(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **get_edge_function**
**Purpose**: Get Edge Function source code
**When to Use**: Debugging, reviewing code
**Usage**:
```typescript
// Get function code
get_edge_function(
  project_id: "rncrzxjyffxmfbnxlqtm", 
  function_slug: "verify-premium-access"
)
```

#### **deploy_edge_function**
**Purpose**: Deploy Edge Function
**When to Use**: Creating/updating functions
**Usage**:
```typescript
// Deploy new function
deploy_edge_function(
  project_id: "rncrzxjyffxmfbnxlqtm",
  name: "verify-premium-access",
  entrypoint_path: "index.ts",
  verify_jwt: true,
  files: [
    {
      name: "index.ts",
      content: `
        import "jsr:@supabase/functions-js/edge-runtime.d.ts";
        
        Deno.serve(async (req: Request) => {
          const data = { message: "Hello from Edge Function!" };
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      `
    }
  ]
)
```

---

### 🌿 **Branch Management**

#### **create_branch**
**Purpose**: Create development branch
**When to Use**: Feature development, testing
**Usage**:
```typescript
// Create dev branch
create_branch(
  project_id: "rncrzxjyffxmfbnxlqtm",
  name: "feature-premium-upgrade",
  confirm_cost_id: "confirmation-id"
)
```

#### **list_branches**
**Purpose**: List all development branches
**When to Use**: Checking branch status
**Usage**:
```typescript
// List all branches
list_branches(project_id: "rncrzxjyffxmfbnxlqtm")
```

#### **merge_branch**
**Purpose**: Merge branch to production
**When to Use**: Deploying features
**Usage**:
```typescript
// Merge branch
merge_branch(branch_id: "branch-id-here")
```

#### **rebase_branch**
**Purpose**: Rebase branch on production
**When to Use**: Syncing with main branch
**Usage**:
```typescript
// Rebase branch
rebase_branch(branch_id: "branch-id-here")
```

#### **reset_branch**
**Purpose**: Reset branch to clean state
**When to Use**: Starting over, fixing issues
**Usage**:
```typescript
// Reset branch
reset_branch(branch_id: "branch-id-here")
```

#### **delete_branch**
**Purpose**: Delete development branch
**When to Use**: Cleanup, finished features
**Usage**:
```typescript
// Delete branch
delete_branch(branch_id: "branch-id-here")
```

---

### 🎯 **Best Practices for MCP Tools**

#### **🔒 Security Rules**
- ✅ **ALWAYS** use `apply_migration` for DDL operations
- ✅ **NEVER** hardcode generated IDs in migrations
- ✅ **ALWAYS** check RLS policies with advisors
- ✅ **NEVER** expose sensitive data in responses

#### **📋 Workflow Patterns**

**1. Database Changes**:
```typescript
// 1. Check current schema
list_tables(project_id: "rncrzxjyffxmfbnxlqtm")

// 2. Apply migration
apply_migration(project_id: "rncrzxjyffxmfbnxlqtm", name: "...", query: "...")

// 3. Verify changes
list_tables(project_id: "rncrzxjyffxmfbnxlqtm")

// 4. Check advisors
get_advisors(project_id: "rncrzxjyffxmfbnxlqtm", type: "security")
```

**2. Edge Function Deployment**:
```typescript
// 1. Check existing functions
list_edge_functions(project_id: "rncrzxjyffxmfbnxlqtm")

// 2. Deploy function
deploy_edge_function(project_id: "rncrzxjyffxmfbnxlqtm", ...)

// 3. Verify deployment
list_edge_functions(project_id: "rncrzxjyffxmfbnxlqtm")

// 4. Check logs if issues
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "edge-function")
```

**3. Troubleshooting**:
```typescript
// 1. Check logs
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "api")

// 2. Check advisors
get_advisors(project_id: "rncrzxjyffxmfbnxlqtm", type: "security")

// 3. Test with execute_sql
execute_sql(project_id: "rncrzxjyffxmfbnxlqtm", query: "SELECT ...")

// 4. Search docs if needed
search_docs(query: "error code explanation", limit: 5)
```

#### **🚨 Common Issues & Solutions**

**Migration Fails**:
1. Check `get_logs` for database errors
2. Verify SQL syntax with `search_docs`
3. Use `execute_sql` to test query first

**Edge Function Issues**:
1. Check `get_logs` for edge-function service
2. Verify function code with `get_edge_function`
3. Check JWT settings in deployment

**RLS Policy Issues**:
1. Run `get_advisors` for security recommendations
2. Test with `execute_sql` as different users
3. Review policy logic carefully

**Performance Issues**:
1. Check `get_advisors` for performance tips
2. Review recent migrations
3. Check query patterns

---

### 📚 **Quick Reference**

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `search_docs` | Documentation | Always check docs first |
| `apply_migration` | DDL changes | Schema modifications |
| `execute_sql` | Data queries | Testing, debugging |
| `deploy_edge_function` | Deploy functions | Function updates |
| `get_logs` | Debugging | Troubleshooting |
| `get_advisors` | Security/Performance | After changes |
| `list_tables` | Schema review | Understanding structure |
| `list_edge_functions` | Function status | Deployment checks |

---

### 🎯 **Project-Specific Usage**

**For ksef-ai Project**:
- **Project ID**: `rncrzxjyffxmfbnxlqtm`
- **Key Tables**: `business_profiles`, `enhanced_subscriptions`, `enterprise_benefits`
- **Key Functions**: `verify-premium-access`, `sync-check`
- **Regular Tasks**: Check advisors, monitor logs, verify RLS

**Example Workflow**:
```typescript
// 1. Check project status
get_project(id: "rncrzxjyffxmfbnxlqtm")

// 2. Check for security issues
get_advisors(project_id: "rncrzxjyffxmfbnxlqtm", type: "security")

// 3. Review recent logs
get_logs(project_id: "rncrzxjyffxmfbnxlqtm", service: "edge-function")

// 4. Generate types if schema changed
generate_typescript_types(project_id: "rncrzxjyffxmfbnxlqtm")
```

---

## Where to Change What

### Adding a New Module
- Create directory in `src/modules/`
- Follow standard module structure
- Add routes in `@/src/shared/config/routes.tsx`

### Modifying Auth Flow
- Update `@/src/shared/context/AuthContext.tsx`
- Check cross-domain logic in `@/src/shared/lib/crossDomainAuth.ts`

### Changing Invoice Logic
- Business logic: `@/src/modules/invoices/`
- PDF generation: `@/src/modules/invoices/utils/pdfGenerator.ts`
- KSeF XML: `@/src/shared/services/ksef/ksefXmlGenerator.ts`

### Updating KSeF Integration
- Service layer: `@/src/shared/services/ksef/`
- Configuration: `@/src/shared/services/ksef/config.ts`
- UI screens: `@/src/modules/ksef/screens/`

### Modifying Database Schema
- **Use Supabase MCP**: `mcp0_apply_migration`
- Update types: `mcp0_generate_typescript_types`
- Check advisors: `mcp0_get_advisors`

### Changing Routing
- Route config: `@/src/shared/config/routes.tsx`
- Route guards: `@/src/pages/routing/AppGate.tsx`
- Route renderer: `@/src/pages/routing/RouteRenderer.tsx`

---

## Known Constraints

### KSeF Limitations
- Test environment can be unstable
- Rate limiting (handle via `ksefRateLimitHandler`)
- CORS issues (mitigated via Supabase proxy)
- Token expiration (auto-refresh implemented)

### Performance
- Large invoice lists may be slow (implement pagination)
- PDF generation is synchronous (consider worker)
- Cache persistence has size limits (localStorage 5-10MB)

### Browser Support
- Modern browsers only (ES2020+)
- No IE11 support
- Mobile responsive but desktop-optimized

---

## Quick Reference

### Key Files
- **App Entry**: `src/App.tsx`
- **Routes**: `src/shared/config/routes.tsx`
- **Auth**: `src/shared/context/AuthContext.tsx`
- **Supabase**: `src/integrations/supabase/client.ts`
- **KSeF Services**: `src/shared/services/ksef/`
- **Query Client**: `src/shared/lib/queryClient.ts`

### Key Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint code
```

### Supabase Project
- **ID**: `rncrzxjyffxmfbnxlqtm`
- **Name**: Fakturing
- **Region**: EU North 1

---

**For system-wide architecture, see `@/ARCHITECTURE_OVERVIEW.md`**  
**For workspace rules, see `@/RULES.md`**
