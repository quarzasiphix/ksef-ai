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

## ⚡ SYNC MANAGER - CACHING SYSTEM (MANDATORY)

**CRITICAL**: Read `SYNC_MANAGER_GUIDE.md` for complete caching system rules

**ALWAYS use SyncManager for data fetching - NEVER fetch directly in components**

Key Points:
- Load once, cache everywhere with React Query
- Silent background updates every 60 seconds  
- No loading states between pages
- Add ALL new entities to syncManager

**See `SYNC_MANAGER_GUIDE.md` for detailed implementation patterns**

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

## Component Rules

**File Structure**:
- **Components**: `components/` (reusable UI)
- **Screens**: `screens/` (page components)
- **Hooks**: `hooks/` (custom React hooks)
- **Types**: `types/` (TypeScript interfaces)

**Naming Conventions**:
- **Components**: PascalCase (e.g., `InvoiceCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInvoiceData.ts`)
- **Types**: PascalCase (e.g., `Invoice.ts`)
- **Utilities**: camelCase (e.g., `invoiceUtils.ts`)

**UI Components**:
- **Shared**: Use `@/shared/ui/` components (Button, Card, etc.)
- **Custom**: Create module-specific components in module folders
- **Styling**: Tailwind CSS classes only - no inline styles

---

## Database Rules

**Table Naming**:
- **Snake Case**: `invoice_items`, `business_profiles`
- **Plural**: Always use plural form for table names
- **Business Profile**: Every table must have `business_profile_id` FK

**Column Naming**:
- **Snake Case**: `created_at`, `invoice_number`
- **Foreign Keys**: `table_name_id` (e.g., `customer_id`)
- **Timestamps**: `created_at`, `updated_at` (TIMESTAMPTZ)

**Required Columns**:
```sql
-- Every table should have these
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

---

## KSeF Integration Rules

**Environment**: ALWAYS default to test environment
```typescript
const ksefConfig = {
  environment: 'test', // Default to test
  // Only use 'production' when explicitly required
};
```

**Authentication**: Use official KSeF 2.0 flow
- Challenge-response authentication
- JWT token management
- Session lifecycle management

**Error Handling**: Comprehensive error classification
- Network errors (retry)
- Authentication errors (refresh token)
- Validation errors (user action required)
- Rate limiting (exponential backoff)

---

## Polish Accounting Rules

**VAT Rules**:
- **VAT Rates**: 23%, 8%, 5%, 0%, zw. (exempt)
- **VAT Exemption**: Track art. 113 status and 200k PLN limit
- **Currency**: PLN primary, EUR/USD/GBP supported

**Invoice Requirements**:
- **Invoice Numbers**: Sequential per business profile
- **Payment Terms**: Default 14 days, configurable
- **Legal Language**: Polish terms only (faktura, vat, etc.)

**Accounting Periods**:
- **Monthly**: Standard accounting periods
- **Auto-provision**: Create periods automatically
- **Locking**: Prevent changes to closed periods

---

## Development Workflow

**Feature Development**:
1. **Database**: Use MCP tools for schema changes
2. **Repository**: Create data access functions
3. **Hook**: Create React Query hook
4. **Component**: Build UI components
5. **Route**: Add to routing config
6. **Test**: Verify with MCP queries

**Code Quality**:
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow project linting rules
- **Prettier**: Auto-format on save
- **Imports**: Use absolute paths with `@/` alias

**Testing**:
- **Database**: Use MCP for test data setup
- **Components**: Storybook for UI components
- **Integration**: Test full user flows

---

## Security Rules

**Authentication**:
- **Supabase Auth**: Use built-in auth system
- **RLS**: Enable Row Level Security on all tables
- **Business Profile**: Isolate data by business_profile_id

**Data Validation**:
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries only
- **XSS Prevention**: Sanitize all user-generated content

**API Security**:
- **Edge Functions**: Use Supabase Edge Functions for server logic
- **Rate Limiting**: Implement rate limiting on public endpoints
- **CORS**: Configure proper CORS policies

---

## Performance Rules

**React Query**:
- **Caching**: Use appropriate staleTime and cacheTime
- **Prefetching**: Prefetch related data
- **Background Updates**: Enable background refetching

**Database**:
- **Indexes**: Add indexes for query performance
- **Queries**: Optimize SELECT statements
- **Connections**: Use connection pooling

**UI Performance**:
- **Lazy Loading**: Code split routes and components
- **Images**: Optimize image loading
- **Bundle Size**: Monitor and optimize bundle size

---

## Deployment Rules

**Environment Variables**:
- **Required**: All required env vars must be documented
- **Secrets**: Use Supabase secrets, never commit secrets
- **Validation**: Validate env vars on startup

**Migrations**:
- **MCP Only**: Use MCP tools for all schema changes
- **Version Control**: Generate migration files after MCP changes
- **Testing**: Test migrations on staging first

**Monitoring**:
- **Error Tracking**: Use error tracking service
- **Performance**: Monitor app performance
- **Logs**: Structured logging for debugging

---

## File Organization

**Module Structure**:
```
src/modules/mymodule/
├── components/          # Reusable components
├── screens/            # Page components
├── hooks/              # Custom hooks
├── data/               # Repository functions
├── types/              # TypeScript types
└── utils/              # Utility functions
```

**Shared Structure**:
```
src/shared/
├── ui/                 # Reusable UI components
├── lib/                # Utility libraries
├── hooks/              # Global hooks
├── context/            # React contexts
└── config/             # Configuration files
```

---

## Code Review Checklist

**Database Changes**:
- [ ] Used MCP tools for schema changes
- [ ] Added proper indexes
- [ ] Included business_profile_id
- [ ] Added RLS policies
- [ ] Generated migration file

**Frontend Changes**:
- [ ] Used proper TypeScript types
- [ ] Followed component structure
- [ ] Used shared UI components
- [ ] Added error handling
- [ ] Used absolute imports

**Integration Changes**:
- [ ] Updated syncManager if needed
- [ ] Added proper query keys
- [ ] Tested with cached data
- [ ] Verified performance

---

**REMEMBER**: This is an accounting system - correctness, security, and compliance are non-negotiable. When in doubt, choose the more conservative approach.
