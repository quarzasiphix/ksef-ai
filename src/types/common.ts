export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export const TransactionTypeValues = {
  INCOME: TransactionType.INCOME,
  EXPENSE: TransactionType.EXPENSE
} as const;

export type PaymentMethodDb = 'cash' | 'transfer' | 'card' | 'other';

export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  CARD = 'card',
  OTHER = 'other'
}
