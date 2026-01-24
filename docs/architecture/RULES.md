# AI Agent Rules for LATEST Workspace

## 🚨 Non-Negotiables

### 1. **ALWAYS Use Supabase MCP for Backend Operations**
- **NEVER** guess schema, RLS policies, or database structure
- **ALWAYS** use `mcp0_list_tables`, `mcp0_execute_sql`, `mcp0_apply_migration` for any backend work
- **ALWAYS** check `mcp0_get_advisors` after DDL changes for security/performance issues
- Project ID: `rncrzxjyffxmfbnxlqtm` (Fakturing - main backend)

### 2. **Never Hallucinate - Always Cite Files**
- Every claim must reference actual file paths with line numbers
- Use format: `@/absolute/path/to/file.ts:10-20` or `@/path/file.ts:30`
- If you don't know, search first using `code_search` or `grep_search`
- Never assume file locations or API signatures

### 3. **Correctness > Speed (Accounting/Tax Domain)**
- This system handles Polish accounting, tax compliance, and KSeF integration
- Mistakes can have legal/financial consequences
- Validate against official documentation before implementing
- Test mode exists for KSeF - use it liberally

### 4. **Respect Existing Patterns**
- Each app has established conventions - follow them
- Don't introduce new state management patterns without discussion
- Maintain consistency within each codebase
- Check existing similar features before creating new ones

### 5. **Reference Repos Are Read-Only**
- `z-all-ksef-repos/` contains official KSeF implementations
- Use for validation and understanding flows
- **DO NOT** modify these repos
- They are truth sources for crypto/session/endpoint patterns

## 📋 Work Order of Operations

### Phase 1: Understand Before Acting
1. Read the relevant `AGENT_GUIDE.md` for the app you're working on
2. Use `code_search` to find related code if task is non-trivial
3. Check Supabase schema if backend is involved
4. Review existing patterns in similar features
5. Check `WORK_LOG.md` for context from previous sessions

### Phase 2: Plan
1. Create or update plan using `update_plan` tool
2. Break down into concrete, verifiable steps
3. Identify dependencies and risks
4. Note which apps/services will be affected

### Phase 3: Execute
1. Make minimal, focused changes
2. Follow existing code style (don't add/remove comments unless asked)
3. Test in isolation when possible
4. Update `WORK_LOG.md` after significant milestones

### Phase 4: Verify
1. Check that changes compile/run
2. Verify against requirements
3. Check for unintended side effects
4. Update documentation if behavior changed

## 🏗️ Architecture Principles

### Multi-App Workspace Structure
```
LATEST/
├── ksef-ai/           # Main accounting app (React/Vite)
├── ksiegai-next/      # Marketing/auth site (Next.js)
├── admin-ksiegai/     # Admin console (React/Vite)
├── tovernet/
│   ├── crm-tover/     # CRM + client portal (React/Vite)
│   ├── tovernet-nest/ # Tovernet.online website (Next.js)
│   └── n8n/           # Automation workflows
└── z-all-ksef-repos/  # Reference only (DO NOT MODIFY)
```

### Data Flow & Boundaries
- **Supabase** = Single source of truth for all apps
- **ksef-ai** = Authoritative for accounting logic, KSeF integration
- **ksiegai-next** = Entry point for auth, SEO, AB testing
- **admin-ksiegai** = Internal operations, user management, email campaigns
- **crm-tover** = Client relationship management, separate from accounting
- **tovernet-nest** = Public website, no backend logic

### Auth Flow
1. User lands on `ksiegai.pl` (ksiegai-next)
2. Registers/logs in → Supabase Auth
3. Redirected to `app.ksiegai.pl` (ksef-ai) with cross-domain token
4. ksef-ai validates session and loads user workspace

## 🔐 Security & Compliance

### KSeF Integration Rules
- **Test environment** by default (`ksef_environment = 'test'`)
- Production requires explicit user opt-in
- All KSeF operations logged in `ksef_audit_log`
- Tokens encrypted at rest in `business_profiles.ksef_token_encrypted`
- Session management via `ksefAuthCoordinator.ts` and `ksefContextManager.ts`

### RLS (Row Level Security)
- **ALWAYS** enabled on user-facing tables
- Users see only their own `business_profiles` and related data
- Admins have elevated access via `admin_users` table
- Check policies before adding new tables

### Sensitive Data
- API keys → environment variables or Supabase secrets
- KSeF tokens → encrypted in database
- Never log sensitive data (NIPs, tokens, passwords)
- Use `ksef_audit_log` for operational logging

## 📝 Progress Tracking

### WORK_LOG.md Convention
Keep a single `WORK_LOG.md` in the workspace root with:

```markdown
# Work Log

## Current Objective
[What you're trying to achieve]

## Current Step
[Specific task in progress]

## Last Verified Working State
[What was confirmed working, when]

## Known Issues
- [Issue 1]
- [Issue 2]

## Next Steps
1. [Next action]
2. [Following action]

## Session History
### [Date] - [Summary]
- [Key changes]
- [Decisions made]
```

Update after:
- Completing major features
- Discovering important constraints
- Making architectural decisions
- Before long breaks in work

## 🎯 Common Tasks & How to Handle Them

### Adding a New Feature to ksef-ai
1. Check `@/ksef-ai/AGENT_GUIDE.md` for module structure
2. Find similar feature in `src/modules/`
3. Follow routing pattern in `src/shared/config/routes.tsx`
4. Use existing hooks from `src/shared/hooks/`
5. Add Supabase types if new tables involved
6. Test with actual data, not mocks

### Modifying Supabase Schema
1. **MUST** use `mcp0_apply_migration` with descriptive name
2. Check impact on all apps (ksef-ai, admin-ksiegai, crm-tover)
3. Update TypeScript types via `mcp0_generate_typescript_types`
4. Run `mcp0_get_advisors` to check for RLS/security issues
5. Document migration in relevant `AGENT_GUIDE.md`

### KSeF Integration Work
1. Read `@/ksef-ai/docs/ksef/official-docs/` first
2. Check reference implementation in `z-all-ksef-repos/`
3. Use test environment unless explicitly told otherwise
4. Follow patterns in `src/shared/services/ksef/`
5. Log all operations via `ksefAuditLog`
6. Handle errors gracefully (KSeF can be unreliable)

### Routing Changes
- **ksef-ai**: Update `src/shared/config/routes.tsx`
- **ksiegai-next**: Add to `app/` directory (Next.js App Router)
- **admin-ksiegai**: Update `src/App.tsx` Routes
- **crm-tover**: Update `src/App.tsx` Routes
- **tovernet-nest**: Add to `app/` directory (Next.js App Router)

### Cross-App Changes
1. Identify which apps are affected
2. Make changes in dependency order (Supabase → ksef-ai → others)
3. Test each app independently
4. Document in `ARCHITECTURE_OVERVIEW.md` if significant

## ⚠️ Common Pitfalls

### DON'T:
- ❌ Modify `z-all-ksef-repos/` (reference only)
- ❌ Hardcode Supabase URLs/keys (use env vars)
- ❌ Add features without checking existing patterns
- ❌ Skip RLS policies on new tables
- ❌ Use production KSeF without explicit approval
- ❌ Delete or weaken existing tests
- ❌ Add comments/documentation unless asked
- ❌ Assume schema - always check with MCP
- ❌ Make breaking changes without migration path

### DO:
- ✅ Use `code_search` for unfamiliar codebases
- ✅ Check `AGENT_GUIDE.md` before starting work
- ✅ Update `WORK_LOG.md` for long-running tasks
- ✅ Cite files with line numbers in explanations
- ✅ Test in KSeF test environment first
- ✅ Follow existing code style exactly
- ✅ Use Supabase MCP for all backend queries
- ✅ Check for similar existing implementations
- ✅ Validate against official docs for KSeF/tax logic

## 🔍 Finding Your Way Around

### "Where is X implemented?"
1. Use `code_search` with natural language query
2. Check relevant `AGENT_GUIDE.md` for module map
3. Use `grep_search` for specific symbols/strings
4. Check `ARCHITECTURE_OVERVIEW.md` for high-level map

### "How does Y work?"
1. Read the `AGENT_GUIDE.md` for that app
2. Find entry point (usually `App.tsx` or route config)
3. Trace through imports and data flow
4. Check Supabase schema for data model
5. Look at reference implementations if available

### "Can I change Z?"
1. Check if it's in `z-all-ksef-repos/` (NO)
2. Check if it affects multiple apps (coordinate changes)
3. Check if it's a shared pattern (maintain consistency)
4. Check if it has tests (don't break them)
5. When in doubt, ask before making breaking changes

## 📚 Key Documentation Files

- `ARCHITECTURE_OVERVIEW.md` - System-wide architecture map
- `WORK_LOG.md` - Session progress and decisions
- `ksef-ai/AGENT_GUIDE.md` - Main accounting app guide
- `ksiegai-next/AGENT_GUIDE.md` - Marketing site guide
- `admin-ksiegai/AGENT_GUIDE.md` - Admin console guide
- `tovernet/crm-tover/AGENT_GUIDE.md` - CRM guide
- `tovernet/tovernet-nest/AGENT_GUIDE.md` - Website guide
- `tovernet/n8n/AGENT_GUIDE.md` - Automation guide

## 🎓 Learning Resources

### KSeF (Polish e-Invoicing System)
- Official docs: `ksef-ai/docs/ksef/official-docs/`
- Reference implementations: `z-all-ksef-repos/`
- Internal services: `ksef-ai/src/shared/services/ksef/`

### Supabase
- Use MCP tools for schema exploration
- Check RLS policies before adding tables
- Generate TypeScript types after migrations

### Polish Accounting
- Tax types: `skala` (progressive), `liniowy` (flat 19%), `ryczalt` (flat rate)
- Entity types: `dzialalnosc` (sole prop), `sp_zoo` (LLC), `sa` (JSC)
- Accounting methods: `ksiegi_rachunkowe`, `kpir`, `ryczalt`, `ewidencja`

---

**Remember: When in doubt, search first, cite sources, and ask for clarification rather than guessing.**
