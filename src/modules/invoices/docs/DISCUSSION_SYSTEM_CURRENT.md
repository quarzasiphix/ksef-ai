# Invoice Discussion System - Current State Documentation

**Date**: 2026-01-30  
**Status**: ⚠️ Needs Complete Redesign  
**Priority**: High

---

## 🔴 Current Problems

### 1. **Architecture Issues**
- ❌ **Sloppy Implementation**: Code scattered across multiple files without clear structure
- ❌ **Always Visible**: Discussion panel always shows at bottom of invoice detail
- ❌ **Wrong Visibility Logic**: Shows for all invoices instead of only connected clients
- ❌ **No Client-User Linking**: Missing efficient system to check if client is a connected user
- ❌ **Performance Issues**: Makes unnecessary API calls, not optimized for sync system

### 2. **Current File Structure**
```
src/modules/invoices/
├── components/
│   └── discussion/
│       └── DiscussionPanel.tsx          ❌ Always renders, poor UX
├── data/
│   └── discussionRepository.ts          ❌ Missing client connection logic
└── screens/
    └── invoices/
        └── InvoiceDetail.tsx            ❌ Unconditional rendering
```

### 3. **Database Tables**
```sql
discussion_threads
├── id
├── invoice_id
├── business_profile_id
├── title
├── status
└── participant_count

discussion_messages
├── id
├── thread_id
├── user_id
├── message
└── created_at

discussion_participants
├── id
├── thread_id
├── user_id
└── role
```

### 4. **Current Logic Flow**
```
Invoice Detail Page
    ↓
Always Renders DiscussionPanel
    ↓
Fetches/Creates Thread (WRONG - no client check)
    ↓
Shows Discussion UI (WRONG - always visible)
```

---

## ❌ What's Wrong

### **Problem 1: No Client-User Connection Check**
```typescript
// Current: Just checks invoice ownership
if (invoice.user_id === user?.id) {
  <DiscussionPanel /> // WRONG - should check if CLIENT is connected
}
```

**Should Be**: Check if invoice's customer (client) has a business profile in the system via NIP/tax_id match.

### **Problem 2: Poor UX - Always Visible**
```typescript
// Current: Always at bottom of page
<div ref={discussionRef}>
  <DiscussionPanel /> // Takes up space, always visible
</div>
```

**Should Be**: Hidden behind a button, opens as popup/dialog.

### **Problem 3: No Sync System Integration**
- Doesn't use global data cache
- Makes individual API calls for each invoice
- Not optimized for "grab everything on launch" pattern
- Slow and inefficient

### **Problem 4: Missing Client-Business Profile Linking**
```typescript
// MISSING: Efficient way to check if customer is a connected user
// Need to match: customers.tax_id <-> business_profiles.tax_id
```

---

## 🎯 Required Redesign

### **New Requirements**

1. **Client Connection Logic**
   - Match `customers.tax_id` with `business_profiles.tax_id`
   - Only show discussion if client has a business profile in system
   - Efficient lookup via sync system

2. **UI/UX Changes**
   - Hide discussion behind button (e.g., "Dyskusja z kontrahentem")
   - Open as popup/dialog, not inline panel
   - Only show button if client is connected

3. **Performance Optimization**
   - Integrate with global data sync system
   - Fetch all connected clients on app launch
   - Cache client-business profile mappings
   - Minimize API calls

4. **Data Structure**
   - Create `connected_clients` cache in global data
   - Map customer_id → business_profile_id via tax_id
   - Keep in sync with real-time updates

---

## 📋 New Architecture Plan

### **Phase 1: Client-Business Profile Linking**

```typescript
// New table or view: client_business_connections
interface ClientBusinessConnection {
  customer_id: string;
  customer_tax_id: string;
  business_profile_id: string;
  business_profile_tax_id: string;
  connected_user_id: string;
  connection_type: 'tax_id_match' | 'manual_link';
  verified: boolean;
  created_at: string;
}
```

### **Phase 2: Sync System Integration**

```typescript
// Add to useGlobalData hook
const { 
  invoices,
  customers,
  connectedClients, // NEW: List of customers with business profiles
  ...
} = useGlobalData();

// Fetch on app launch
const connectedClients = customers.filter(customer => 
  businessProfiles.some(bp => bp.tax_id === customer.tax_id)
);
```

### **Phase 3: New UI Component**

```typescript
// New: DiscussionButton.tsx
<Button 
  variant="outline" 
  onClick={() => setShowDiscussionDialog(true)}
>
  <MessageSquare className="h-4 w-4 mr-2" />
  Dyskusja z kontrahentem
</Button>

// New: DiscussionDialog.tsx
<Dialog open={showDiscussionDialog} onOpenChange={setShowDiscussionDialog}>
  <DialogContent className="max-w-2xl h-[600px]">
    <DiscussionContent invoiceId={invoice.id} />
  </DialogContent>
</Dialog>
```

### **Phase 4: Visibility Logic**

```typescript
// Only show if client is connected
const isClientConnected = connectedClients.some(
  cc => cc.customer_id === invoice.customerId
);

{isClientConnected && (
  <DiscussionButton invoiceId={invoice.id} />
)}
```

---

## 🔧 Implementation Steps

### **Step 1: Create Client Connection System**
- [ ] Create database view/function for tax_id matching
- [ ] Add to sync-check edge function
- [ ] Add to useGlobalData hook
- [ ] Cache connected clients list

### **Step 2: Redesign UI Components**
- [ ] Create DiscussionButton component
- [ ] Create DiscussionDialog component
- [ ] Remove inline DiscussionPanel from InvoiceDetail
- [ ] Add button with conditional rendering

### **Step 3: Update Repository**
- [ ] Add client connection validation
- [ ] Optimize queries for sync system
- [ ] Add caching layer

### **Step 4: Testing**
- [ ] Test with connected client (should show button)
- [ ] Test with non-connected client (should hide button)
- [ ] Test discussion creation and messaging
- [ ] Test sync system integration

---

## 📊 Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| API calls per invoice view | 3-5 | 0 (use cache) |
| Time to check client connection | 200-500ms | <10ms (cache lookup) |
| Discussion load time | 1-2s | <100ms (cached) |
| UI responsiveness | Poor (always visible) | Excellent (on-demand) |

---

## 🚀 Expected Benefits

1. **Better UX**: Discussion hidden until needed, cleaner interface
2. **Better Performance**: Sync system integration, cached lookups
3. **Correct Logic**: Only shows for connected clients
4. **Scalability**: Efficient for many invoices and clients
5. **Maintainability**: Clear, organized code structure

---

## 📝 Notes

- Current implementation has security fixes but wrong business logic
- Need to completely redo visibility logic based on client connection
- Must integrate with existing sync system for performance
- UI should be popup/dialog, not inline panel
- Tax ID (NIP) matching is the key to client-business profile linking

---

## 🔗 Related Files to Modify

1. `src/modules/invoices/components/discussion/DiscussionPanel.tsx` - Remove or refactor
2. `src/modules/invoices/data/discussionRepository.ts` - Add client connection logic
3. `src/modules/invoices/screens/invoices/InvoiceDetail.tsx` - Replace with button
4. `src/shared/hooks/use-global-data.tsx` - Add connected clients
5. `supabase/functions/sync-check/index.ts` - Add client connections sync

---

**Status**: Ready for redesign implementation
