# Ksiegai Sync Architecture Documentation

## Overview

This document provides a comprehensive overview of the current Ksiegai synchronization implementation between the CRM system and the Ksiegai accounting system.

## Architecture Summary

```
CRM Application (vite react) ←→ Supabase Database ←→ Ksiegai Application (vite react)
                                    ↓
                            Edge Functions (Sync Layer)
```

## Current Implementation Status

### ✅ **Working Components**
- **Account Linking**: CRM ↔ Ksiegai user linking works properly
- **Business Profiles Sync**: Successfully syncs business profiles from Ksiegai
- **Database Tables**: All sync tables are properly created and populated
- **Edge Functions**: Multiple sync functions are deployed and functional

### ❌ **Issues Identified**
- **Customer Sync**: Currently returning mock data instead of real Ksiegai customers
- **Invoice Sync**: Returning mock invoice data
- **Cross-Communication**: CRM-Ksiegai direct communication not working as expected

## Database Schema

### Core Tables

#### 1. `ksiegai_linked_accounts`
```sql
- id (uuid, primary key)
- crm_user_id (uuid) → Links to CRM user
- ksiegai_user_id (uuid) → Links to Ksiegai user
- ksiegai_user_email (text)
- ksiegai_business_profile_id (uuid, optional)
- ksiegai_business_name (text, optional)
- linked_at (timestamp)
- status ('active' | 'inactive' | 'suspended')
- last_sync_at (timestamp, optional)
- sync_enabled (boolean)
```

#### 2. `ksiegai_customers`
```sql
- id (uuid, primary key)
- crm_user_id (uuid)
- ksiegai_customer_id (uuid)
- ksiegai_user_id (uuid)
- name (text)
- tax_id (text, optional)
- address (text, optional)
- postal_code (text, optional)
- city (text, optional)
- email (text, optional)
- phone (text, optional)
- client_type ('buyer' | 'seller')
- business_profile_id (uuid, optional)
- is_shared (boolean)
- client_group_id (text, optional)
- sync_status ('synced' | 'pending' | 'error')
- synced_at (timestamp)
```

#### 3. `ksiegai_business_profiles`
```sql
- id (uuid, primary key)
- crm_user_id (uuid)
- ksiegai_user_id (uuid)
- ksiegai_business_profile_id (uuid)
- name (text)
- tax_id (text, optional)
- address (text, optional)
- city (text, optional)
- postal_code (text, optional)
- country (text, default: 'Poland')
- email (text, optional)
- phone (text, optional)
- bank_account (text, optional)
- is_default (boolean)
- is_active (boolean)
- synced_at (timestamp)
```

#### 4. `ksiegai_invoices`
```sql
- id (uuid, primary key)
- crm_user_id (uuid)
- ksiegai_invoice_id (text)
- ksiegai_user_id (uuid)
- invoice_number (text)
- ksiegai_customer_id (uuid)
- customer_name (text)
- amount (numeric)
- currency (text, default: 'PLN')
- issue_date (date)
- due_date (date)
- status ('pending' | 'paid' | 'overdue')
- sync_status ('synced' | 'pending' | 'error')
- synced_at (timestamp)
```

#### 5. `ksiegai_link_requests`
```sql
- id (uuid, primary key)
- crm_user_id (uuid)
- crm_email (text)
- token (text, unique)
- ksiegai_user_id (uuid, optional)
- expires_at (timestamp)
- status ('pending' | 'confirmed' | 'expired')
```

## Edge Functions Architecture

### Current Edge Functions

#### 1. **Account Linking Functions**
- **`validate-crm-link`** (CRM): Creates link requests
- **`confirm-crm-link`** (Ksiegai): Confirms and establishes links
- **`client-sync`** (CRM): Handles client-side linking

#### 2. **Data Sync Functions**
- **`sync-ksiegai-business-profiles`** ✅ **WORKING**
- **`sync-ksiegai-clients`** ❌ **MOCK DATA**
- **`sync-ksiegai-invoices`** ❌ **MOCK DATA**
- **`sync-ksiegai-customers`** ❌ **NEEDS API KEY**
- **`ksiegai-init`** ✅ **DATABASE READS**
- **`ksiegai-data`** ✅ **DATABASE READS**
- **`crm-data-access`** ❌ **NO DATA FOUND**

#### 3. **Utility Functions**
- **`search-ksiegai-by-nip`** ✅ **WORKING**
- **`get-ksiegai-customers`** ❌ **MOCK DATA**
- **`fetch-ksiegai-data`** ✅ **WORKING**

## Account Linking Flow

### Step 1: CRM User Initiates Link
1. User goes to CRM Settings → Ksiegai Integration
2. Clicks "Link Ksiegai Account"
3. CRM calls `validate-crm-link` function
4. Creates `ksiegai_link_requests` record with token
5. Returns link URL: `https://ksiegai.app/settings/token/{token}`

### Step 2: Ksiegai User Confirms
1. User opens link in Ksiegai application
2. `CrmLinking.tsx` component loads
3. Validates token from URL
4. Shows user the CRM email requesting link
5. User clicks "Confirm Link"
6. Ksiegai calls `confirm-crm-link` function
7. Creates `ksiegai_linked_accounts` record
8. Updates link request status to 'confirmed'

### Step 3: Sync Initialization
1. After link confirmation, both systems can sync data
2. Business profiles sync automatically (working)
3. Customers and invoices require additional setup

## Data Sync Mechanisms

### Working Sync: Business Profiles

The `sync-ksiegai-business-profiles` function works correctly:

```typescript
// Fetches from Ksiegai user's actual data
const { data: profiles } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('user_id', ksiegaiUserId)
```

**Why it works**: Business profiles are stored in the same database schema with direct user_id mapping.

### Broken Sync: Customers & Invoices

The customer and invoice sync functions return mock data because:

1. **Wrong Data Source**: Looking in wrong database/schema
2. **Missing API Keys**: External Ksiegai API not configured
3. **Mock Data Fallback**: Functions return hardcoded mock data when real data not found

## Current Data Flow

```
CRM User Request
    ↓
ksiegai-init (Edge Function)
    ↓
ksiegai_customers table (Database)
    ↓
Returns 3 customers (previously synced)
```

**Problem**: Only showing previously synced customers, not all customers from Ksiegai system.

## Frontend Integration

### CRM Application Files

#### 1. **Settings.tsx** - Main Settings Page
- Handles account linking UI
- Shows linked account status
- Manages sync settings
- Located: `src/modules/admin/screens/Settings.tsx`

#### 2. **ClientManagementClean.tsx** - Customer Management
- Displays Ksiegai customers
- Handles customer linking
- Calls `KsiegaiCacheService.getCustomers()`
- Located: `src/modules/admin/screens/ClientManagementClean.tsx`

#### 3. **KsiegaiCacheService.ts** - Data Caching
- Manages Ksiegai data caching
- Calls `ksiegai-init` function
- Handles cache invalidation
- Located: `src/services/ksiegaiCacheService.ts`

### Ksiegai Application Files

#### 1. **CrmLinking.tsx** - Link Confirmation
- Handles CRM link requests
- Shows pending link confirmations
- Confirms or rejects links
- Located: `ksef-ai/src/modules/settings/screens/CrmLinking.tsx`

## Authentication & Security

### JWT Authentication
- All Edge Functions use JWT authentication
- CRM users authenticated via Supabase Auth
- Ksiegai users authenticated via their own system

### Cross-System Communication
- **Shared Secret Key**: `crm_ksiegai_secure_2026_cross_comm_a1b2c3d4e5f6g7h8i9j0`
- **Internal API Calls**: Functions can call each other with shared secret
- **User ID Mapping**: Links established via `ksiegai_linked_accounts` table

## Issues & Solutions

### Issue 1: Mock Data in Customer/Invoice Sync

**Problem**: Functions return hardcoded mock data instead of real Ksiegai data.

**Root Cause**: 
- Looking in wrong database location
- Missing external API configuration
- Fallback to mock data when real data not found

**Solutions**:
1. **Option A**: Configure external Ksiegai API access
   - Add `KSIEGAI_API_URL` and `KSIEGAI_API_KEY` environment variables
   - Update functions to call external API

2. **Option B**: Direct Database Access
   - Find actual Ksiegai customer tables in database
   - Update queries to access correct tables

3. **Option C**: Cross-System Communication
   - Use shared secret to call Ksiegai Edge Functions
   - Ksiegai functions return real data from their system

### Issue 2: Only 3 Customers Showing

**Problem**: Only showing previously synced customers, not all customers.

**Root Cause**: 
- `ksiegai-init` reads from `ksiegai_customers` table
- Only contains customers synced during initial sync
- No mechanism to sync all customers

**Solution**:
- Implement full sync mechanism
- Use `sync-ksiegai-customers` with proper API access
- Trigger sync on demand or periodically

### Issue 3: Double Function Calls

**Problem**: Functions called twice on page load.

**Root Cause**: 
- Multiple useEffect hooks
- Cache invalidation issues
- React strict mode

**Solution**:
- Consolidate function calls
- Implement proper caching
- Use React.memo or useCallback

## Recommended Implementation Plan

### Phase 1: Fix Customer Sync (Immediate)

1. **Identify Real Data Source**
   ```sql
   -- Find actual customer tables
   SELECT tablename FROM pg_tables 
   WHERE tablename LIKE '%customer%' OR tablename LIKE '%client%';
   ```

2. **Update Sync Function**
   - Modify `sync-ksiegai-customers` to access real data
   - Remove mock data fallback
   - Add proper error handling

3. **Test Full Sync**
   - Call `sync-ksiegai-customers` with `syncAll: true`
   - Verify all customers are synced
   - Update UI to show all customers

### Phase 2: Implement Cross-System Communication

1. **Deploy Ksiegai Data Function**
   - Create `crm-data-access` in Ksiegai project
   - Use shared secret for authentication
   - Return real customer data

2. **Update CRM Init Function**
   - Call Ksiegai function with shared secret
   - Process and cache returned data
   - Handle errors gracefully

### Phase 3: Optimize Performance

1. **Implement Smart Caching**
   - Cache data for reasonable time
   - Background sync updates
   - Incremental updates only

2. **Add Sync Status Indicators**
   - Show last sync time
   - Display sync status
   - Manual sync triggers

## Environment Variables Required

### For External API Access
```bash
KSIEGAI_API_URL=https://api.ksiegai.pl
KSIEGAI_API_KEY=your-ksiegai-api-key
```

### For Cross-System Communication
```bash
# Shared secret (already hardcoded)
CRM_KSIEGAI_SHARED_KEY=crm_ksiegai_secure_2026_cross_comm_a1b2c3d4e5f6g7h8i9j0
```

## Testing Checklist

### Account Linking
- [ ] CRM can initiate link request
- [ ] Ksiegai receives link request
- [ ] Ksiegai can confirm link
- [ ] CRM shows linked status
- [ ] Link requests expire properly

### Data Sync
- [ ] Business profiles sync correctly
- [ ] All customers sync from Ksiegai
- [ ] Invoices sync from Ksiegai
- [ ] Sync updates existing records
- [ ] Sync handles new records

### UI Integration
- [ ] CRM displays all customers
- [ ] Customer data is accurate
- [ ] Sync status is visible
- [ ] Manual sync works
- [ ] Cache invalidation works

## Conclusion

The Ksiegai sync architecture is partially implemented with working account linking and business profile sync. The main issues are:

1. **Customer/Invoice Sync**: Returning mock data instead of real Ksiegai data
2. **Data Source**: Need to identify correct Ksiegai customer data location
3. **Cross-Communication**: CRM-Ksiegai direct communication needs implementation

The recommended approach is to first identify the real Ksiegai customer data source and update the sync functions accordingly. This will provide immediate access to all customer data without requiring external API configuration.
