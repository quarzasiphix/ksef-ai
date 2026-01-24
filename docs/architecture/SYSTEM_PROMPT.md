# System Prompt for Multi-Application Workspace

## Instructions for AI Agent

You are working with a multi-application workspace containing Polish accounting software, CRM, and automation systems. Before making any changes, you MUST:

1. **Read RULES.md first** - Contains non-negotiable rules, architecture principles, and work order
2. **Read ARCHITECTURE_OVERVIEW.md** - Complete system map, app boundaries, and integration points
3. **Read the specific app's AGENT_GUIDE.md** - Detailed patterns for the application you're modifying
4. **Check WORK_LOG.md** - Current progress, known issues, and next steps

## Critical Rules

- **ALWAYS use Supabase MCP tools** for any database operations - never guess schema
- **NEVER hallucinate** - Cite exact file paths and line numbers for all claims
- **Correctness > Speed** - This is accounting/tax software with legal implications
- **Default to KSeF test environment** unless explicitly told otherwise
- **Reference repos in z-all-ksef-repos/ are READ-ONLY** - use for validation only

## Key Applications

- **ksef-ai** - Main accounting app with KSeF integration (React + Vite)
- **ksiegai-next** - Marketing/auth site (Next.js, SEO-focused)
- **admin-ksiegai** - Admin console (React, anti-SEO)
- **tovernet/crm-tover** - CRM + client portal (dual-mode)
- **tovernet/tovernet-nest** - Tovernet website (Next.js)
- **tovernet/n8n** - Automation workflows

## Supabase Backend

- **Project ID**: rncrzxjyffxmfbnxlqtm
- **Single source of truth** for all applications
- **RLS enabled** on all user-facing tables
- **Use MCP tools**: mcp0_apply_migration, mcp0_execute_sql, mcp0_get_advisors

## Work Flow

1. Read documentation in order: RULES → ARCHITECTURE → AGENT_GUIDE → WORK_LOG
2. Identify which application(s) you're modifying
3. Use code_search/grep_search to understand existing patterns
4. Make minimal, focused changes
5. Update WORK_LOG.md if this is a long-running task

## KSeF Integration

- **Service layer**: ksef-ai/src/shared/services/ksef/
- **Reference**: z-all-ksef-repos/ksef-client-java/
- **Test environment**: Proxied through Supabase Edge Function
- **Production**: Direct to api.ksef.mf.gov.pl

## Cross-Domain Auth

- **Flow**: ksiegai.pl → app.ksiegai.pl via localStorage token
- **Token key**: ksiegai_auth_token (must match in both apps)
- **Implementation**: ksef-ai/src/shared/lib/crossDomainAuth.ts

## State Management

- **React Query (TanStack Query)** for all server state
- **React Context** for client state (Auth, BusinessProfile, Department)
- **Cache persistence** enabled in ksef-ai

## File Structure Patterns

- **ksef-ai**: modules/ feature structure, centralized routes
- **ksiegai-next**: Next.js App Router, static generation
- **admin-ksiegai**: pages/ structure, role-based routing
- **crm-tover**: modules/admin/ and modules/client/ split

## Security

- **Never expose internal data to clients**
- **RLS is the security boundary**, not frontend checks
- **Encrypt sensitive tokens** (KSeF, credentials)
- **Log all operations** for audit trails

## Before Any Code Changes

Ask yourself:
- Have I read the relevant documentation?
- Am I using the correct patterns for this app?
- Do I need to use Supabase MCP tools?
- Is this change minimal and focused?
- Should I update WORK_LOG.md?

## Documentation is Authoritative

These files contain the established patterns and decisions. Follow them unless you have a compelling reason to deviate, and document any deviations in WORK_LOG.md.
