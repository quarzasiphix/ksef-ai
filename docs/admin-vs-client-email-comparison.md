# Admin vs Client Email System Comparison

## Overview

The client invoice email system is designed to **share the same template infrastructure** as the admin email system while maintaining proper security and access controls.

## 🔄 What's Shared

### Email Template System
- **Same Database Table**: `email_templates`
- **Same Template Engine**: Variable replacement and array rendering
- **Same N8N Integration**: Identical webhook payload format
- **Same Template Management**: Admin panel manages all templates

### Template Processing Logic
```typescript
// Identical in both systems
function replaceAllVariables(str: string, vars: Record<string, any>): string
function renderArrayItems(html: string, arrayKey: string, items: any[]): string
```

### N8N Webhook Format
```typescript
// Same payload structure for both admin and client
{
  to: recipient_email,
  subject: finalSubject,
  html_body: finalHtml,
  templateName: template.name,
}
```

## 🔒 What's Different

### Authentication & Authorization

| Aspect | Admin System | Client System |
|--------|--------------|---------------|
| **JWT Check** | ✅ Required | ✅ Required |
| **Permission Table** | `admin_users` | `workspace_users` |
| **Role Check** | `admin`, `super_admin` | `admin`, `editor` |
| **Access Scope** | Global admin access | Workspace-specific access |

### Data Access Patterns

**Admin System**:
```typescript
// Checks admin_users table
const { data: adminUser } = await supabase
  .from("admin_users")
  .select("role, is_active")
  .eq("user_id", authUser.user.id)
```

**Client System**:
```typescript
// Checks workspace access through invoice relationship
const { data: invoice } = await supabase
  .from("invoices")
  .select(`*, workspace!inner(workspace_users!inner(user_id, role))`)
  .eq("workspace.workspace_users.user_id", authUser.user.id)
```

### Request Structure

**Admin System**:
```typescript
interface AdminEmailRequest {
  templateKey: string;        // Any template
  recipientEmail: string;      // Any email
  variables?: Record<string, any>; // Custom variables
}
```

**Client System**:
```typescript
interface ClientInvoiceEmailRequest {
  invoiceId: string;          // Specific invoice
  recipientEmail?: string;    // Optional (uses customer email)
  customMessage?: string;     // Optional personal message
}
```

## 📋 Template Usage

### Admin Templates
- **Template Key**: Any key (e.g., `welcome_email`, `password_reset`)
- **Variables**: Custom per template
- **Recipients**: Any email address
- **Use Cases**: System notifications, marketing, admin communications

### Client Invoice Template
- **Template Key**: Fixed to `invoice_email`
- **Variables**: Standardized invoice data structure
- **Recipients**: Customer email or specified override
- **Use Cases**: Invoice delivery to clients

## 🛡️ Security Model

### Admin System Security
```typescript
// Global admin permissions
if (!['admin', 'super_admin'].includes(adminUser.role)) {
  return 403; // Forbidden
}
```

### Client System Security
```typescript
// Multi-layer security check
1. JWT Authentication ✅
2. Invoice Access Control ✅ (user must have workspace access)
3. Role Permission Check ✅ (admin/editor only)
4. Workspace Isolation ✅ (can only access own invoices)
```

## 🔄 Integration Benefits

### For Administrators
- **Single Template Management**: Manage all email templates in one place
- **Consistent Branding**: Same templates across admin and client systems
- **Unified Analytics**: All email sends logged in same system
- **Easy Maintenance**: One template engine to maintain

### For Developers
- **Reusable Code**: Same template processing logic
- **Consistent API**: Similar error handling and response formats
- **Shared Documentation**: One template system to learn
- **Unified Testing**: Same template rendering tests apply

## 📊 Database Schema

### Shared Tables
```sql
-- Both systems use these tables
email_templates          -- Template definitions
email_send_logs         -- Audit trail (optional for client)
```

### Permission Tables
```sql
-- Admin system
admin_users             -- Global admin permissions

-- Client system  
workspace_users         -- Workspace-specific permissions
workspaces              -- Workspace isolation
invoices               -- Invoice data with workspace relationships
```

## 🚀 Deployment Considerations

### Template Deployment
1. **Deploy Templates Once**: Templates are shared between systems
2. **Admin Panel Management**: Use admin panel to manage `invoice_email` template
3. **Variable Documentation**: Ensure template variables are documented

### Security Deployment
1. **Edge Function Permissions**: Deploy both functions with appropriate JWT settings
2. **Workspace Setup**: Ensure proper workspace_user relationships
3. **Role Configuration**: Configure admin/editor roles in workspaces

### Migration Path
1. **Existing Templates**: Client system can use existing admin templates
2. **New Invoice Template**: Add `invoice_email` template to shared system
3. **Audit Logging**: Optional email_send_logs table for client sends

## 🎯 Best Practices

### Template Management
- **Use Admin Panel**: Manage `invoice_email` template through admin interface
- **Document Variables**: Keep clear documentation of available variables
- **Test Templates**: Test templates with real invoice data before deployment

### Security
- **Principle of Least Privilege**: Users only get access to their own invoices
- **Audit Everything**: Log all email sends for compliance
- **Validate Input**: Validate all user inputs in edge functions

### Performance
- **Cache Templates**: Consider caching frequently used templates
- **Batch Operations**: Batch invoice item queries for better performance
- **Monitor Usage**: Track email sending patterns and limits
