# ksef-ai Agent Guide

## 🚨 CRITICAL: MCP SUPABASE TOOLS REQUIRED

**NEVER make backend changes without using MCP Supabase tools first!**

**MANDATORY WORKFLOW**:
1. **ALWAYS** use `mcp1_list_tables` to see current database structure
2. **ALWAYS** use `mcp1_execute_sql` to examine table schemas before changes  
3. **ALWAYS** validate assumptions with actual database queries
4. **ALWAYS** use `mcp1_apply_migration` for schema changes - NEVER create migration files manually
5. **ALWAYS** generate migration file after successful MCP migration for version control
6. **NEVER** guess column names, data types, or table structures

**FAILURE TO FOLLOW THIS RULE WILL CAUSE DATA CORRUPTION AND DEPLOYMENT FAILURES**

**🚨 THIS IS AGENT RULES ONLY - NO DEV LOGS OR CODE EXAMPLES**
- These rules are for AI agents working on this project
- Do not write development logs, progress updates, or implementation notes IN HERE
- This file is for rules, patterns, and constraints only
- New agents should load this and start working immediately

---

## Application Overview

**Name**: ksef-ai (KsięgaI Accounting Application)  
**Tech Stack**: React 18 + Vite + TypeScript + TanStack Query + Supabase  
**Purpose**: Polish accounting system with KSeF e-invoicing integration

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
- **Supabase MCP**: ALWAYS use MCP tools for backend queries and schema changes - NEVER guess
- **Schema Verification**: ALWAYS check database structure with MCP before any backend changes
- **Reference Validation**: Check `z-all-ksef-repos/` for KSeF patterns

---

## Project Structure

**Key Modules**:
- `src/modules/accounting/` - Accounting features, ledger, balance sheet
- `src/modules/invoices/` - Invoice management (income/expense)
- `src/modules/ksef/` - KSeF integration UI and services
- `src/modules/customers/` - Business partners (kontrahenci)
- `src/shared/` - Reusable components, utilities, context

**Important Files**:
- `src/shared/config/routes.tsx` - Centralized route configuration
- `src/shared/context/AuthContext.tsx` - Auth and premium state
- `src/shared/context/BusinessProfileContext.tsx` - Active profile management

---

## Routing Rules

- **Centralized Config**: All routes in `src/shared/config/routes.tsx`
- **Lazy Loading**: Use `React.lazy()` for all route components
- **Route Guards**: `public`, `protected`, `premium`, `onboarding`
- **Navigation**: Routes auto-appear in sidebar unless `hideInNav: true`

---

## State Management Rules

**TanStack Query**: All server state via React Query
- **Query Client**: `@/src/shared/lib/queryClient.ts`
- **Cache Persistence**: Queries persist to localStorage automatically
- **Pattern**: Repository functions + custom hooks

**React Context**:
- **AuthContext**: User auth and premium status
- **BusinessProfileContext**: Active business profile
- **DepartmentContext**: Operations module departments

**Data Access Pattern**:
```typescript
// Repository: modules/mymodule/data/MyRepository.ts
export const fetchMyData = async (businessProfileId: string) => {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  if (error) throw error;
  return data;
};

// Hook: modules/mymodule/hooks/useMyData.ts
export const useMyData = (businessProfileId: string) => {
  return useQuery({
    queryKey: ['myData', businessProfileId],
    queryFn: () => fetchMyData(businessProfileId),
    enabled: !!businessProfileId,
  });
};
```

---

## Module Structure

**Standard Pattern**:
```
modules/mymodule/
├── screens/              # Page components
├── components/           # Module-specific components  
├── hooks/                # Module-specific hooks
├── data/                 # Data access layer (Supabase queries)
├── types/                # Module-specific types
└── utils/                # Module-specific utilities
```

**Key Modules**:
- **invoices/** - Invoice management, PDF generation, KSeF
- **ksef/** - KSeF integration UI and services
- **accounting/** - Advanced accounting, premium-only
- **customers/** - Business partners (kontrahenci)
- **premium/** - Subscription management

---

## KSeF Integration Rules

**Environment**: Default to test environment unless explicitly production
**Service Layer**: `@/src/shared/services/ksef/`
**Authentication**: Token encrypted in `business_profiles.ksef_token_encrypted`
**Audit**: All operations logged in `ksef_audit_log`

**Key Services**:
- `ksefAuthCoordinator` - Session management
- `ksefApiClient` - HTTP client with retry
- `ksefXmlGenerator` - FA_VAT XML generation
- `ksefValidator` - Invoice validation

**Reference**: Check `z-all-ksef-repos/` for implementation patterns

---

## Data Access Rules

**Supabase Client**: `@/src/integrations/supabase/client.ts`
**Pattern**: Repository functions + React Query hooks
**RLS**: All user-facing tables have Row Level Security enabled

**Standard Query**:
```typescript
// Repository: modules/mymodule/data/MyRepository.ts
export const fetchMyData = async (businessProfileId: string) => {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  if (error) throw error;
  return data;
};
```

**RLS Policy Pattern**:
```sql
CREATE POLICY "Users see own records"
ON my_table FOR SELECT
USING (
  business_profile_id IN (
    SELECT id FROM business_profiles 
    WHERE user_id = auth.uid()
  )
);
```

---

## Common Tasks

**Adding New Feature**:
1. Identify module or create new one
2. Add screens/components in module directory
3. Add route to `@/src/shared/config/routes.tsx`
4. Create repository functions for data access
5. Create custom hooks for React components
6. Add TypeScript types in module `types/` directory

**Working with KSeF**:
1. Default to test environment
2. Check reference in `z-all-ksef-repos/`
3. Use existing services in `@/src/shared/services/ksef/`
4. All operations auto-logged in `ksef_audit_log`

---

## Premium System Rules

**🚨 NEVER USE OLD PREMIUM PATTERNS**:
- ❌ Never use `isPremium` boolean from AuthContext (deprecated)
- ❌ Never make direct API calls to subscription tables
- ❌ Never trust client-side premium checks

**✅ ALWAYS USE NEW PREMIUM SYSTEM**:
- ✅ Always use `usePremiumSync()` hook for premium status
- ✅ Always use server-side verification for sensitive operations
- ✅ Always use `usePremiumFeature(feature)` for specific features
- ✅ Always protect premium routes with `usePremiumRoute()`

**Premium Tiers**: `free` | `jdg_premium` | `spolka_premium` | `enterprise`

---

## Security Rules

**Authentication**:
- Never store tokens in plain text
- Use `ksefSecretManager` for KSeF token encryption
- Validate sessions on every protected route

**Data Access**:
- Always filter by `business_profile_id`
- Never trust frontend permissions
- Rely on RLS for security boundary

**KSeF Integration**:
- Default to test environment
- Log all operations for audit trail
- Handle errors gracefully

---

## Code Style

**File Naming**:
- Components: PascalCase (`MyComponent.tsx`)
- Hooks: camelCase with `use` prefix (`useMyHook.ts`)
- Utilities: camelCase (`myUtil.ts`)

**Import Order**:
1. React imports
2. Third-party libraries  
3. Absolute imports (`@/...`)
4. Relative imports (`./...`)

# ksef-ai Agent Guide

## 🚨 CRITICAL: MCP SUPABASE TOOLS REQUIRED

**NEVER make backend changes without using MCP Supabase tools first!**

**MANDATORY WORKFLOW**:
1. **ALWAYS** use `mcp1_list_tables` to see current database structure
2. **ALWAYS** use `mcp1_execute_sql` to examine table schemas before changes  
3. **ALWAYS** validate assumptions with actual database queries
4. **ALWAYS** use `mcp1_apply_migration` for schema changes - NEVER create migration files manually
5. **ALWAYS** generate migration file after successful MCP migration for version control
6. **NEVER** guess column names, data types, or table structures

**FAILURE TO FOLLOW THIS RULE WILL CAUSE DATA CORRUPTION AND DEPLOYMENT FAILURES**

**🚨 THIS IS AGENT RULES ONLY - NO DEV LOGS OR CODE EXAMPLES**
- These rules are for AI agents working on this project
- Do not write development logs, progress updates, or implementation notes
- Focus on rules, patterns, and constraints only
- New agents should load this and start working immediately

---

## Application Overview

**Name**: ksef-ai (KsięgaI Accounting Application)  
**Tech Stack**: React 18 + Vite + TypeScript + TanStack Query + Supabase  
**Purpose**: Polish accounting system with KSeF e-invoicing integration

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
- **Supabase MCP**: ALWAYS use MCP tools for backend queries and schema changes - NEVER guess
- **Schema Verification**: ALWAYS check database structure with MCP before any backend changes
- **Reference Validation**: Check `z-all-ksef-repos/` for KSeF patterns

---

## Project Structure

**Key Modules**:
- `src/modules/accounting/` - Accounting features, ledger, balance sheet
- `src/modules/invoices/` - Invoice management (income/expense)
- `src/modules/ksef/` - KSeF integration UI and services
- `src/modules/customers/` - Business partners (kontrahenci)
- `src/shared/` - Reusable components, utilities, context

**Important Files**:
- `src/shared/config/routes.tsx` - Centralized route configuration
- `src/shared/context/AuthContext.tsx` - Auth and premium state
- `src/shared/context/BusinessProfileContext.tsx` - Active profile management

---

## Routing Rules

- **Centralized Config**: All routes in `src/shared/config/routes.tsx`
- **Lazy Loading**: Use `React.lazy()` for all route components
- **Route Guards**: `public`, `protected`, `premium`, `onboarding`
- **Navigation**: Routes auto-appear in sidebar unless `hideInNav: true`

---

## State Management Rules

**TanStack Query**: All server state via React Query
- **Query Client**: `@/src/shared/lib/queryClient.ts`
- **Cache Persistence**: Queries persist to localStorage automatically
- **Pattern**: Repository functions + custom hooks

**React Context**:
- **AuthContext**: User auth and premium status
- **BusinessProfileContext**: Active business profile
- **DepartmentContext**: Operations module departments

**Data Access Pattern**:
```typescript
// Repository: modules/mymodule/data/MyRepository.ts
export const fetchMyData = async (businessProfileId: string) => {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  if (error) throw error;
  return data;
};

// Hook: modules/mymodule/hooks/useMyData.ts
export const useMyData = (businessProfileId: string) => {
  return useQuery({
    queryKey: ['myData', businessProfileId],
    queryFn: () => fetchMyData(businessProfileId),
    enabled: !!businessProfileId,
  });
};
```

---

## Module Structure

**Standard Pattern**:
```
modules/mymodule/
├── screens/              # Page components
├── components/           # Module-specific components  
├── hooks/                # Module-specific hooks
├── data/                 # Data access layer (Supabase queries)
├── types/                # Module-specific types
└── utils/                # Module-specific utilities
```

**Key Modules**:
- **invoices/** - Invoice management, PDF generation, KSeF
- **ksef/** - KSeF integration UI and services
- **accounting/** - Advanced accounting, premium-only
- **customers/** - Business partners (kontrahenci)
- **premium/** - Subscription management

---

## KSeF Integration Rules

**Environment**: Default to test environment unless explicitly production
**Service Layer**: `@/src/shared/services/ksef/`
**Authentication**: Token encrypted in `business_profiles.ksef_token_encrypted`
**Audit**: All operations logged in `ksef_audit_log`

**Key Services**:
- `ksefAuthCoordinator` - Session management
- `ksefApiClient` - HTTP client with retry
- `ksefXmlGenerator` - FA_VAT XML generation
- `ksefValidator` - Invoice validation

**Reference**: Check `z-all-ksef-repos/` for implementation patterns

---

## Data Access Rules

**Supabase Client**: `@/src/integrations/supabase/client.ts`
**Pattern**: Repository functions + React Query hooks
**RLS**: All user-facing tables have Row Level Security enabled

**Standard Query**:
```typescript
// Repository: modules/mymodule/data/MyRepository.ts
export const fetchMyData = async (businessProfileId: string) => {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  if (error) throw error;
  return data;
};
```

**RLS Policy Pattern**:
```sql
CREATE POLICY "Users see own records"
ON my_table FOR SELECT
USING (
  business_profile_id IN (
    SELECT id FROM business_profiles 
    WHERE user_id = auth.uid()
  )
);
```

---

## Common Tasks

**Adding New Feature**:
1. Identify module or create new one
2. Add screens/components in module directory
3. Add route to `@/src/shared/config/routes.tsx`
4. Create repository functions for data access
5. Create custom hooks for React components
6. Add TypeScript types in module `types/` directory

**Working with KSeF**:
1. Default to test environment
2. Check reference in `z-all-ksef-repos/`
3. Use existing services in `@/src/shared/services/ksef/`
4. All operations auto-logged in `ksef_audit_log`

---

## Premium System Rules

**🚨 NEVER USE OLD PREMIUM PATTERNS**:
- ❌ Never use `isPremium` boolean from AuthContext (deprecated)
- ❌ Never make direct API calls to subscription tables
- ❌ Never trust client-side premium checks

**✅ ALWAYS USE NEW PREMIUM SYSTEM**:
- ✅ Always use `usePremiumSync()` hook for premium status
- ✅ Always use server-side verification for sensitive operations
- ✅ Always use `usePremiumFeature(feature)` for specific features
- ✅ Always protect premium routes with `usePremiumRoute()`

**Premium Tiers**: `free` | `jdg_premium` | `spolka_premium` | `enterprise`

---

## Security Rules

**Authentication**:
- Never store tokens in plain text
- Use `ksefSecretManager` for KSeF token encryption
- Validate sessions on every protected route

**Data Access**:
- Always filter by `business_profile_id`
- Never trust frontend permissions
- Rely on RLS for security boundary

**KSeF Integration**:
- Default to test environment
- Log all operations for audit trail
- Handle errors gracefully

---

## Code Style

**File Naming**:
- Components: PascalCase (`MyComponent.tsx`)
- Hooks: camelCase with `use` prefix (`useMyHook.ts`)
- Utilities: camelCase (`myUtil.ts`)

**Import Order**:
1. React imports
2. Third-party libraries  
3. Absolute imports (`@/...`)
4. Relative imports (`./...`)

**No Comments**: Code should be self-documenting
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
