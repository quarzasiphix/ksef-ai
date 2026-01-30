# Invoice Discussion System - Redesign Implementation

**Date**: 2026-01-30  
**Status**: 🚧 In Progress  
**Priority**: High

---

## 🎯 Design Goals

1. **Client Connection Based**: Only show discussion for invoices where the customer is a connected user
2. **Efficient Lookup**: Use sync system to cache client-business profile connections
3. **Better UX**: Discussion behind button, opens as popup dialog
4. **Performance**: Zero extra API calls, use cached data
5. **Clean Code**: Well-organized, maintainable structure

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    App Launch / Sync                        │
│  Fetch: invoices, customers, business_profiles              │
│  Compute: connectedClients (tax_id matching)                │
│  Cache: Map<customer_id, business_profile_id>               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Invoice Detail Page                       │
│  Check: Is invoice.customerId in connectedClients?          │
│  If YES: Show "Dyskusja" button                             │
│  If NO: Hide discussion completely                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    User Clicks Button                        │
│  Open: DiscussionDialog (popup)                             │
│  Load: Thread and messages (if not cached)                  │
│  Display: Chat interface with real-time updates             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Data Structures

### **1. Connected Client Interface**
```typescript
interface ConnectedClient {
  customer_id: string;
  customer_name: string;
  customer_tax_id: string;
  business_profile_id: string;
  business_profile_name: string;
  business_profile_tax_id: string;
  connected_user_id: string;
  match_type: 'tax_id' | 'manual';
  verified: boolean;
}
```

### **2. Global Data Extension**
```typescript
interface GlobalData {
  // Existing
  invoices: Invoice[];
  customers: Customer[];
  businessProfiles: BusinessProfile[];
  
  // NEW
  connectedClients: ConnectedClient[];
  connectedClientsMap: Map<string, ConnectedClient>; // customer_id -> ConnectedClient
}
```

### **3. Discussion Dialog State**
```typescript
interface DiscussionDialogState {
  open: boolean;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  connectedClient: ConnectedClient;
}
```

---

## 🔧 Implementation Components

### **Component 1: Client Connection Matcher**
**File**: `src/shared/lib/client-connection-matcher.ts`

```typescript
/**
 * Matches customers with business profiles via tax_id
 * Returns list of connected clients
 */
export function matchConnectedClients(
  customers: Customer[],
  businessProfiles: BusinessProfile[]
): ConnectedClient[] {
  const connections: ConnectedClient[] = [];
  
  for (const customer of customers) {
    if (!customer.tax_id) continue;
    
    // Find matching business profile by tax_id
    const matchedProfile = businessProfiles.find(
      bp => bp.tax_id === customer.tax_id && bp.tax_id !== null
    );
    
    if (matchedProfile) {
      connections.push({
        customer_id: customer.id,
        customer_name: customer.name,
        customer_tax_id: customer.tax_id,
        business_profile_id: matchedProfile.id,
        business_profile_name: matchedProfile.name,
        business_profile_tax_id: matchedProfile.tax_id,
        connected_user_id: matchedProfile.user_id,
        match_type: 'tax_id',
        verified: true,
      });
    }
  }
  
  return connections;
}

/**
 * Creates fast lookup map for checking if customer is connected
 */
export function createConnectedClientsMap(
  connectedClients: ConnectedClient[]
): Map<string, ConnectedClient> {
  return new Map(
    connectedClients.map(cc => [cc.customer_id, cc])
  );
}

/**
 * Check if a customer is a connected user
 */
export function isCustomerConnected(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): boolean {
  return connectedClientsMap.has(customerId);
}

/**
 * Get connected client info for a customer
 */
export function getConnectedClient(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): ConnectedClient | null {
  return connectedClientsMap.get(customerId) || null;
}
```

---

### **Component 2: Discussion Button**
**File**: `src/modules/invoices/components/discussion/DiscussionButton.tsx`

```typescript
import React from 'react';
import { Button } from '@/shared/ui/button';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';

interface DiscussionButtonProps {
  onClick: () => void;
  unreadCount?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const DiscussionButton: React.FC<DiscussionButtonProps> = ({
  onClick,
  unreadCount = 0,
  variant = 'outline',
  size = 'default',
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className="relative"
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Dyskusja z kontrahentem
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="ml-2 px-1.5 py-0.5 text-xs"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
};
```

---

### **Component 3: Discussion Dialog**
**File**: `src/modules/invoices/components/discussion/DiscussionDialog.tsx`

```typescript
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { DiscussionContent } from './DiscussionContent';
import { ConnectedClient } from '@/shared/lib/client-connection-matcher';

interface DiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  connectedClient: ConnectedClient;
}

export const DiscussionDialog: React.FC<DiscussionDialogProps> = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  connectedClient,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[700px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dyskusja - Faktura {invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Rozmowa z {connectedClient.customer_name}
          </DialogDescription>
        </DialogHeader>
        
        <DiscussionContent
          invoiceId={invoiceId}
          connectedClient={connectedClient}
          className="flex-1"
        />
      </DialogContent>
    </Dialog>
  );
};
```

---

### **Component 4: Discussion Content (Refactored)**
**File**: `src/modules/invoices/components/discussion/DiscussionContent.tsx`

```typescript
// Refactored from DiscussionPanel
// Removed ownership validation (already checked by parent)
// Optimized for dialog usage
// Uses connectedClient prop instead of fetching
```

---

## 🔄 Sync System Integration

### **Update useGlobalData Hook**
**File**: `src/shared/hooks/use-global-data.tsx`

```typescript
// Add connected clients computation
const connectedClients = useMemo(() => {
  if (!customers || !businessProfiles) return [];
  return matchConnectedClients(customers, businessProfiles);
}, [customers, businessProfiles]);

const connectedClientsMap = useMemo(() => {
  return createConnectedClientsMap(connectedClients);
}, [connectedClients]);

return {
  // ... existing
  connectedClients,
  connectedClientsMap,
};
```

---

## 📍 Invoice Detail Integration

### **Update InvoiceDetail.tsx**

```typescript
// Import
import { DiscussionButton } from '@/modules/invoices/components/discussion/DiscussionButton';
import { DiscussionDialog } from '@/modules/invoices/components/discussion/DiscussionDialog';
import { isCustomerConnected, getConnectedClient } from '@/shared/lib/client-connection-matcher';

// State
const [showDiscussionDialog, setShowDiscussionDialog] = useState(false);

// Check if customer is connected
const { connectedClientsMap } = useGlobalData();
const isClientConnected = isCustomerConnected(invoice.customerId, connectedClientsMap);
const connectedClient = getConnectedClient(invoice.customerId, connectedClientsMap);

// Render (in actions area, not at bottom)
{isClientConnected && connectedClient && (
  <>
    <DiscussionButton
      onClick={() => setShowDiscussionDialog(true)}
      unreadCount={0} // TODO: Get from cache
    />
    
    <DiscussionDialog
      open={showDiscussionDialog}
      onOpenChange={setShowDiscussionDialog}
      invoiceId={invoice.id}
      invoiceNumber={invoice.number}
      connectedClient={connectedClient}
    />
  </>
)}
```

---

## 🎨 UI/UX Flow

### **Before (Current)**
```
Invoice Detail Page
├── Header
├── Invoice Info
├── Items
├── Totals
└── Discussion Panel ← Always visible, takes space
    ├── Messages
    └── Input
```

### **After (New)**
```
Invoice Detail Page
├── Header
│   └── Actions
│       └── [Dyskusja] Button ← Only if client connected
├── Invoice Info
├── Items
└── Totals

[User clicks button]
    ↓
Dialog Popup (overlay)
├── Header: "Dyskusja - F/2/26"
├── Subtitle: "Rozmowa z Adam Frącala"
├── Messages Area (scrollable)
└── Input Area
```

---

## ⚡ Performance Optimization

### **Cache Strategy**
1. **On App Launch**: Compute all connected clients once
2. **In Memory**: Store in React context/global state
3. **Lookup**: O(1) hash map lookup by customer_id
4. **Updates**: Re-compute on customer/business profile changes

### **API Call Reduction**
| Operation | Before | After |
|-----------|--------|-------|
| Check if client connected | 1 API call | 0 (cache lookup) |
| Load discussion | 2-3 API calls | 1 (only messages) |
| Open dialog | 3-4 API calls | 1 (if not cached) |

---

## 🧪 Testing Checklist

- [ ] Connected client: Button shows, dialog opens
- [ ] Non-connected client: Button hidden
- [ ] Multiple invoices: Correct client detection
- [ ] Tax ID matching: Accurate matching logic
- [ ] Dialog UX: Smooth open/close
- [ ] Real-time messages: Subscription works
- [ ] Performance: Fast lookups (<10ms)
- [ ] Sync system: Updates on data changes

---

## 📝 Migration Notes

### **Files to Remove/Refactor**
- ❌ Remove: Inline DiscussionPanel from InvoiceDetail
- ✅ Keep: discussionRepository.ts (update logic)
- ✅ Refactor: DiscussionPanel → DiscussionContent
- ✅ New: DiscussionButton, DiscussionDialog

### **Database Changes**
- No schema changes needed
- Existing tables work as-is
- All logic is application-level

---

**Next Steps**: Implement components in order listed above
