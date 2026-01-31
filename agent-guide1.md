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
