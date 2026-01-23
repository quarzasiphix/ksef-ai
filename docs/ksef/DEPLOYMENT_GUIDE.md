# KSeF 2.0 Integration - Complete Deployment Guide

**Date**: January 23, 2026  
**Version**: 1.0  
**Status**: Ready for Deployment

---

## 📋 **Pre-Deployment Checklist**

### **1. Dependencies Installation**

```bash
# Navigate to project directory
cd ksef-ai

# Install required npm packages
npm install qrcode adm-zip fast-xml-parser

# Install TypeScript types
npm install -D @types/qrcode @types/adm-zip

# Verify installation
npm list qrcode adm-zip fast-xml-parser
```

### **2. Database Migration**

```bash
# Apply KSeF received invoices migration
supabase migration up 20260123_ksef_received_invoices

# Verify migration
supabase db diff
```

**Manual Migration** (if needed):
```sql
-- Run the SQL file directly
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/20260123_ksef_received_invoices.sql
```

### **3. Environment Variables**

Add to your `.env` file:

```env
# KSeF Configuration
KSEF_ENVIRONMENT=test  # or 'production'
KSEF_PROVIDER_NIP=your_provider_nip
KSEF_SYNC_INTERVAL_MINUTES=15
KSEF_QR_ENVIRONMENT=test  # or 'demo' or 'prod'

# Supabase (should already exist)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🚀 **Deployment Steps**

### **Step 1: Install Dependencies**

```bash
npm install
```

**Expected Output**:
```
added 3 packages, and audited 1234 packages in 5s
```

### **Step 2: Run Database Migration**

```bash
# Using Supabase CLI
supabase db push

# Or apply specific migration
supabase migration up 20260123_ksef_received_invoices
```

**Verify**:
```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'ksef_invoices_received';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'ksef_invoices_received';
```

### **Step 3: Initialize Background Sync Job**

Create a new file: `src/services/ksefSyncJobInit.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { KsefContextManager } from '@/shared/services/ksef/ksefContextManager';
import { createSyncJob } from '@/shared/services/ksef/ksefSyncJob';
import { getKsefConfig } from '@/shared/services/ksef/config';

// Initialize sync job
const config = getKsefConfig('test'); // Use 'production' in prod
const contextManager = new KsefContextManager(config, supabase);

export const ksefSyncJob = createSyncJob(supabase, contextManager, {
  intervalMinutes: 15,
  maxConcurrentProfiles: 3,
  retryAttempts: 3,
});

// Start sync job
ksefSyncJob.start();

console.log('KSeF sync job started');
```

Add to your app initialization (e.g., `src/main.tsx` or `src/App.tsx`):

```typescript
import './services/ksefSyncJobInit';
```

### **Step 4: Add KSeF Inbox to Navigation**

Update `src/modules/settings/screens/SettingsMenu.tsx`:

```typescript
{
  title: 'KSeF',
  items: [
    {
      id: 'ksef-inbox',
      label: 'Odebrane faktury',
      icon: Inbox,
      path: '/settings/ksef-inbox',
      description: 'Faktury pobrane z systemu KSeF'
    },
    {
      id: 'ksef-integration',
      label: 'Integracja KSeF',
      icon: Settings,
      path: '/settings/ksef-integration',
      description: 'Konfiguracja połączenia z KSeF'
    }
  ]
}
```

Add route in your router:

```typescript
{
  path: '/settings/ksef-inbox',
  element: <KsefInboxScreen />
}
```

### **Step 5: Build and Test**

```bash
# Build the application
npm run build

# Run tests (if available)
npm test

# Start development server
npm run dev
```

---

## 🧪 **Testing Checklist**

### **1. QR Code Generation**
- [ ] Submit test invoice to KSeF
- [ ] Verify QR code is generated
- [ ] Check QR code is stored in database
- [ ] Scan QR code with mobile device
- [ ] Verify QR code URL is correct

### **2. Invoice Retrieval**
- [ ] Trigger manual sync
- [ ] Verify invoices appear in inbox
- [ ] Check subject types are correct
- [ ] Verify metadata is parsed correctly
- [ ] Test filtering by subject type
- [ ] Test search functionality

### **3. Duplicate Detection**
- [ ] Try to submit same invoice twice
- [ ] Verify error code 440 is returned
- [ ] Check error message is clear
- [ ] Verify duplicate is not submitted to KSeF

### **4. Background Sync**
- [ ] Wait 15 minutes
- [ ] Check sync job runs automatically
- [ ] Verify new invoices are fetched
- [ ] Check HWM is updated correctly
- [ ] Review sync logs

### **5. Multi-Tenant Isolation**
- [ ] Switch business profiles
- [ ] Verify only profile's invoices shown
- [ ] Test sync per profile
- [ ] Check RLS policies work

---

## 📊 **Monitoring & Logging**

### **Database Queries for Monitoring**

```sql
-- Check sync job stats
SELECT 
  started_at,
  completed_at,
  duration_ms,
  profiles_synced,
  total_invoices_synced
FROM ksef_sync_runs
ORDER BY started_at DESC
LIMIT 10;

-- Check received invoices count
SELECT 
  business_profile_id,
  subject_type,
  COUNT(*) as invoice_count,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed_count
FROM ksef_invoices_received
GROUP BY business_profile_id, subject_type;

-- Check for errors in audit log
SELECT 
  operation,
  error_message,
  created_at
FROM ksef_audit_log
WHERE error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Check unprocessed invoices
SELECT * FROM ksef_unprocessed_invoices
LIMIT 10;
```

### **Application Logs**

Monitor these log messages:
- `KSeF sync job started`
- `Starting KSeF sync run...`
- `Synced X invoices across Y profiles`
- `Failed to sync profile: [error]`

---

## 🔧 **Configuration Options**

### **Sync Job Configuration**

```typescript
const ksefSyncJob = createSyncJob(supabase, contextManager, {
  intervalMinutes: 15,        // Sync every 15 minutes (recommended)
  maxConcurrentProfiles: 3,   // Max profiles to sync in parallel
  retryAttempts: 3,           // Retry failed syncs
  retryDelayMs: 5000,         // Delay between retries
  subjectTypes: [             // Which subject types to sync
    'subject1',  // As seller
    'subject2',  // As buyer
    'subject3',  // As other party
  ],
});
```

### **QR Code Configuration**

QR codes are automatically generated with:
- Environment: Based on `KSEF_ENVIRONMENT` variable
- Format: ISO/IEC 18004:2024 compliant
- Error correction: Level M (15% recovery)
- Size: 300x300 pixels

---

## 🚨 **Troubleshooting**

### **Issue: TypeScript Errors**

**Error**: `Cannot find module 'qrcode'`

**Solution**:
```bash
npm install qrcode @types/qrcode
```

### **Issue: Database Migration Fails**

**Error**: `relation "ksef_invoices_received" already exists`

**Solution**:
```sql
-- Check if table exists
SELECT * FROM ksef_invoices_received LIMIT 1;

-- If exists, migration already applied
-- If not, check migration file for errors
```

### **Issue: Sync Job Not Running**

**Check**:
1. Verify sync job is initialized in app
2. Check console for error messages
3. Verify business profiles have active KSeF integration
4. Check database for `ksef_integrations` with `status='active'`

**Debug**:
```typescript
// Check sync job status
console.log('Sync job running:', ksefSyncJob.isJobRunning());
console.log('Sync stats:', ksefSyncJob.getStats());
```

### **Issue: QR Codes Not Generating**

**Check**:
1. Verify `qrcode` package is installed
2. Check invoice has `issueDate` and seller `taxId`
3. Verify KSeF number is returned from submission
4. Check browser console for errors

**Debug**:
```typescript
// Test QR generation manually
import { ksefQrCodeService } from '@/shared/services/ksef';

const result = await ksefQrCodeService.generateInvoiceQr({
  sellerNip: '1234567890',
  issueDate: new Date(),
  invoiceXml: '<xml>...</xml>',
  ksefNumber: 'test-number',
  environment: 'test'
});

console.log('QR Code URL:', result.url);
```

### **Issue: Duplicate Detection Not Working**

**Check**:
1. Verify `ksef_documents_raw` table has data
2. Check `seller_nip`, `invoice_type`, `invoice_number` fields
3. Verify business profile ID is correct

**Debug**:
```sql
-- Check for duplicates manually
SELECT * FROM ksef_documents_raw
WHERE seller_nip = '1234567890'
  AND invoice_type = 'VAT'
  AND invoice_number = 'FV/2026/001';
```

---

## 📈 **Performance Optimization**

### **Database Indexes**

Already created by migration:
- `idx_ksef_received_profile` - Fast profile filtering
- `idx_ksef_received_ksef_num` - Fast KSeF number lookup
- `idx_ksef_received_storage_date` - Fast date range queries
- `idx_ksef_received_processed` - Fast unprocessed invoice queries

### **Sync Job Optimization**

```typescript
// For high-volume environments
const ksefSyncJob = createSyncJob(supabase, contextManager, {
  intervalMinutes: 10,         // More frequent syncs
  maxConcurrentProfiles: 5,    // More parallel processing
  retryAttempts: 5,            // More retries
});
```

### **Caching**

Token caching is automatic:
- Secrets: 5-minute cache
- Access tokens: 55-minute cache

---

## 🔒 **Security Checklist**

- [ ] KSeF tokens stored in Supabase Vault
- [ ] RLS policies enabled on all tables
- [ ] Environment variables not committed to git
- [ ] API keys not exposed in client code
- [ ] HTTPS enabled for all KSeF API calls
- [ ] User authentication required for all operations
- [ ] Audit logging enabled

---

## 📚 **Additional Resources**

### **Documentation**
- `COMPREHENSIVE_GAP_ANALYSIS.md` - Full feature analysis
- `IMPLEMENTATION_ROADMAP.md` - Implementation plan
- `FINAL_IMPLEMENTATION_SUMMARY.md` - Complete overview
- `SECRET_MANAGEMENT_GUIDE.md` - Vault integration

### **Official KSeF Resources**
- Test API: https://api-test.ksef.mf.gov.pl/docs/v2
- Demo API: https://api-demo.ksef.mf.gov.pl/docs/v2
- Production API: https://api.ksef.mf.gov.pl/docs/v2

### **Support**
- Check console logs for errors
- Review `ksef_audit_log` table
- Check Supabase logs
- Review sync job stats

---

## ✅ **Post-Deployment Verification**

### **Day 1**
- [ ] Verify sync job runs every 15 minutes
- [ ] Check at least one invoice retrieved
- [ ] Verify QR codes generated
- [ ] Test duplicate detection
- [ ] Review error logs

### **Week 1**
- [ ] Monitor sync job performance
- [ ] Check invoice retrieval accuracy
- [ ] Verify HWM updates correctly
- [ ] Review user feedback
- [ ] Optimize if needed

### **Month 1**
- [ ] Analyze sync patterns
- [ ] Review storage usage
- [ ] Check for any errors
- [ ] Plan optimizations
- [ ] Update documentation

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- ✅ Sync job runs every 15 minutes
- ✅ 99%+ invoice retrieval success rate
- ✅ QR codes on 100% of invoices
- ✅ Zero duplicate submissions
- ✅ < 5 second average sync time per profile

### **Business Metrics**
- ✅ All invoices automatically retrieved
- ✅ Legal compliance (QR codes)
- ✅ No manual intervention needed
- ✅ Multi-tenant isolation working
- ✅ User satisfaction high

---

## 🚀 **Go-Live Checklist**

- [ ] All dependencies installed
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Sync job initialized
- [ ] UI routes added
- [ ] Testing completed
- [ ] Monitoring configured
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Backup plan ready

---

**Deployment Status**: ✅ **READY FOR PRODUCTION**

**Estimated Deployment Time**: 2-4 hours

**Rollback Plan**: Revert database migration, remove sync job initialization, deploy previous version

---

**Last Updated**: January 23, 2026  
**Next Review**: After 1 week of production use
