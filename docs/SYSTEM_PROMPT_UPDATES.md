# System Prompt Updates - Documentation Organization

**Date**: 2024-01-24  
**Status**: ✅ Complete  
**Files Updated**: `RULES.md`, `WORK_LOG.md`

---

## 🎯 Objective

Update the AI agent system prompt to properly organize documentation in the correct project folders with subject-based subfolders.

---

## 🔧 Changes Made

### 1. Updated RULES.md

#### Added Documentation Organization Section
```markdown
### Documentation Organization
**ALL new documentation must be created in the corresponding project's `docs/` folder:**

- **ksiegai-next/docs/** - Marketing site, auth, A/B testing, SEO
- **ksef-ai/docs/** - Main accounting app, KSeF integration, invoicing
- **admin-ksiegai/docs/** - Admin console, user management, operations
- **tovernet/crm-tover/docs/** - CRM functionality, client management
- **tovernet/tovernet-nest/docs/** - Public website content
- **tovernet/n8n/docs/** - Automation workflows
```

#### Added Subject-Based Subfolders
```markdown
**Subject-based subfolders (create if not exist):**
- `stripe/` - Stripe payments, webhooks, billing
- `ksef/` - KSeF integration, Polish e-invoicing
- `invoicing/` - Invoice generation, templates, variables
- `auth/` - Authentication, session management
- `email/` - Email templates, sending, campaigns
- `security/` - Security audits, permissions, RLS
- `deployment/` - Build processes, CI/CD, hosting
- `ui/` - UI components, responsive design
- `api/` - API endpoints, integrations
- `testing/` - Test strategies, mock systems
- `architecture/` - System design, patterns
```

#### Added Documentation Creation Guidelines
```markdown
### Creating New Documentation
1. **Identify the correct project** based on primary context
2. **Create subject-based subfolder** if it doesn't exist
3. **Create documentation file** with descriptive name
4. **Follow documentation template** with proper structure
```

#### Updated Key Documentation Files Section
- Separated repository-level from project-specific documentation
- Added subject-based documentation categories
- Updated file paths to reflect new organization

#### Updated DO/DON'T Section
- Added documentation creation to DO list
- Emphasized proper folder organization

### 2. Updated WORK_LOG.md

#### Added Documentation Note
```markdown
**Documentation Organization**: All new documentation must be created in the corresponding project's `docs/` folder with subject-based subfolders (stripe/, auth/, deployment/, etc.). See `RULES.md` for complete documentation guidelines.
```

---

## 📁 Documentation Reorganization

### Files Moved to Correct Locations

#### Stripe Documentation
- `STRIPE_WEBHOOK_ARCHITECTURE.md` → `ksef-ai/docs/stripe/webhook-architecture.md`

#### Auth Documentation  
- `GOOGLE_LOGIN_FINAL_FIX.md` → `ksiegai-next/docs/auth/google-login-fix.md`

#### Deployment Documentation
- `CLOUDFLARE_DEPLOY_GUIDE.md` → `ksiegai-next/docs/deployment/cloudflare-deployment.md`
- `DEPLOYMENT_READY.md` → `ksiegai-next/docs/deployment/deployment-ready.md`

### Folders Created
- `ksef-ai/docs/stripe/`
- `ksiegai-next/docs/auth/`
- `ksiegai-next/docs/deployment/`

---

## 📋 Example File Paths

### Correct Documentation Organization
- ✅ `ksef-ai/docs/stripe/webhook-architecture.md`
- ✅ `ksiegai-next/docs/auth/google-login-fix.md`
- ✅ `admin-ksiegai/docs/email/campaign-variables.md`
- ✅ `ksef-ai/docs/ksef/integration-guide.md`
- ✅ `ksiegai-next/docs/deployment/cloudflare-deployment.md`

### Incorrect (Should Not Be Used)
- ❌ Repository-level docs for project-specific features
- ❌ Mixed subject content in wrong project folders
- ❌ No subject-based subfolder organization

---

## 🎯 Documentation Template

All new documentation should follow this template:

```markdown
# [Document Title]

**Date**: YYYY-MM-DD  
**Status**: [draft/in-progress/completed]  
**Project**: [ksef-ai/ksiegai-next/admin-ksiegai/etc]

---

## Overview
[Brief description of what this covers]

## Implementation Details
[Technical details, code examples]

## Usage Instructions
[How to use/implement]

## Testing
[How to test this feature]

## Troubleshooting
[Common issues and solutions]

---

**Related Files**: [link to relevant code files]
**Dependencies**: [what this depends on]
**Impact**: [what this affects]
```

---

## 🚀 Impact

### For AI Agents
- Clear guidelines on where to create documentation
- Proper organization by project and subject
- Consistent documentation structure
- Better discoverability of existing docs

### For Developers
- Easy to find relevant documentation
- Logical folder structure
- Consistent naming conventions
- Clear project boundaries

### For Future Maintenance
- Scalable documentation organization
- Easy to add new subject areas
- Clear ownership by project
- Reduced documentation duplication

---

## ✅ Verification Checklist

- [x] Updated `RULES.md` with documentation organization rules
- [x] Added subject-based subfolder guidelines
- [x] Created documentation creation process
- [x] Updated DO/DON'T sections
- [x] Reorganized existing documentation files
- [x] Created proper folder structure
- [x] Updated `WORK_LOG.md` with documentation note
- [x] Created this summary document

---

**The system prompt is now updated to properly organize documentation in the correct project folders with subject-based subfolders!** 🎉
