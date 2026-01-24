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
