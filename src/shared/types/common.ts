export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum PaymentMethodDb {
  TRANSFER = 'transfer',
  CASH = 'cash',
  CARD = 'card',
  OTHER = 'other',
}

// Inventory movement types
export type InventoryMovementType = 'restock' | 'sale';

export interface InventoryMovement {
  id: string;
  user_id: string;
  product_id: string;
  quantity_change: number; // positive for restock, negative for sale
  type: InventoryMovementType;
  note?: string;
  created_at?: string;
}
