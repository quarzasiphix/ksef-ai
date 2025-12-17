// Treasury Service - Unified interface for Bank/Cash accounts and payments
// Provides backward-compatible functions that work with both old and new schemas

import {
  getPaymentAccounts,
  getPaymentAccount,
  createPaymentAccount,
  getAccountBalance,
  getAccountBalances,
  getTreasurySummary,
  createDocumentPayment,
  getDocumentPaymentStatus,
  createTransfer,
  createAdjustment,
  reverseMovement,
  getAccountMovements,
} from '@/integrations/supabase/repositories/treasuryRepository';

import type {
  PaymentAccount,
  PaymentAccountType,
  AccountBalance,
  DocumentPaymentStatus,
  TreasurySummary,
  DocumentType,
  PaymentDirection,
} from '@/types/treasury';

// =============================================================================
// UNIFIED ACCOUNT ACCESS
// =============================================================================

export interface UnifiedAccount {
  id: string;
  businessProfileId: string;
  type: 'BANK' | 'CASH';
  name: string;
  currency: string;
  balance: number; // Computed, never stored
  // Bank fields
  bankName?: string;
  accountNumber?: string;
  // Cash fields
  responsiblePerson?: string;
  isActive: boolean;
}

export async function getUnifiedAccounts(
  businessProfileId: string,
  type?: 'BANK' | 'CASH'
): Promise<UnifiedAccount[]> {
  const balances = await getAccountBalances(businessProfileId, type);
  const accounts = await getPaymentAccounts(businessProfileId, type);

  return accounts.map(account => {
    const balance = balances.find(b => b.payment_account_id === account.id);
    return mapToUnifiedAccount(account, balance?.current_balance ?? account.opening_balance);
  });
}

export async function getUnifiedAccount(id: string): Promise<UnifiedAccount | null> {
  const account = await getPaymentAccount(id);
  if (!account) return null;

  const balance = await getAccountBalance(id);
  return mapToUnifiedAccount(account, balance.current_balance);
}

function mapToUnifiedAccount(account: PaymentAccount, computedBalance: number): UnifiedAccount {
  return {
    id: account.id,
    businessProfileId: account.business_profile_id,
    type: account.account_type,
    name: account.name,
    currency: account.currency,
    balance: computedBalance,
    bankName: account.bank_name ?? undefined,
    accountNumber: account.account_number ?? undefined,
    responsiblePerson: account.responsible_person ?? undefined,
    isActive: account.is_active,
  };
}

// =============================================================================
// BACKWARD COMPATIBLE: Bank Accounts
// =============================================================================

export interface LegacyBankAccount {
  id: string;
  businessProfileId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  type: string;
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBankAccountsCompat(businessProfileId: string): Promise<LegacyBankAccount[]> {
  const accounts = await getUnifiedAccounts(businessProfileId, 'BANK');
  return accounts.map(a => ({
    id: a.id,
    businessProfileId: a.businessProfileId,
    bankName: a.bankName || '',
    accountNumber: a.accountNumber || '',
    accountName: a.name,
    currency: a.currency,
    balance: a.balance,
    type: 'checking',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function createBankAccountCompat(
  businessProfileId: string,
  bankName: string,
  accountNumber: string,
  accountName: string,
  openingBalance: number = 0,
  currency: string = 'PLN'
): Promise<LegacyBankAccount> {
  const account = await createPaymentAccount({
    business_profile_id: businessProfileId,
    account_type: 'BANK',
    name: accountName,
    currency,
    opening_balance: openingBalance,
    bank_name: bankName,
    account_number: accountNumber,
  });

  const balance = await getAccountBalance(account.id);

  return {
    id: account.id,
    businessProfileId: account.business_profile_id,
    bankName: account.bank_name || '',
    accountNumber: account.account_number || '',
    accountName: account.name,
    currency: account.currency,
    balance: balance.current_balance,
    type: 'checking',
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

// =============================================================================
// BACKWARD COMPATIBLE: Cash Accounts
// =============================================================================

export interface LegacyCashAccount {
  id: string;
  business_profile_id: string;
  name: string;
  currency: string;
  opening_balance: number;
  current_balance: number; // Computed
  responsible_person: string | null;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
}

export async function getCashAccountsCompat(businessProfileId: string): Promise<LegacyCashAccount[]> {
  const accounts = await getUnifiedAccounts(businessProfileId, 'CASH');
  return accounts.map(a => ({
    id: a.id,
    business_profile_id: a.businessProfileId,
    name: a.name,
    currency: a.currency,
    opening_balance: 0, // Not tracked in unified model
    current_balance: a.balance,
    responsible_person: a.responsiblePerson || null,
    status: a.isActive ? 'active' : 'closed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export async function createCashAccountCompat(
  businessProfileId: string,
  name: string,
  openingBalance: number = 0,
  responsiblePerson?: string,
  currency: string = 'PLN'
): Promise<LegacyCashAccount> {
  const account = await createPaymentAccount({
    business_profile_id: businessProfileId,
    account_type: 'CASH',
    name,
    currency,
    opening_balance: openingBalance,
    responsible_person: responsiblePerson,
  });

  const balance = await getAccountBalance(account.id);

  return {
    id: account.id,
    business_profile_id: account.business_profile_id,
    name: account.name,
    currency: account.currency,
    opening_balance: openingBalance,
    current_balance: balance.current_balance,
    responsible_person: account.responsible_person || null,
    status: account.is_active ? 'active' : 'closed',
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

// =============================================================================
// INVOICE PAYMENT INTEGRATION
// =============================================================================

export interface InvoicePaymentResult {
  success: boolean;
  payment_id: string;
  movement_id: string;
  total_paid: number;
  remaining: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
}

export async function payInvoice(
  businessProfileId: string,
  invoiceId: string,
  invoiceType: 'income' | 'expense',
  paymentAccountId: string,
  amount: number,
  paymentDate: string,
  invoiceTotal: number,
  notes?: string
): Promise<InvoicePaymentResult> {
  const docType: DocumentType = invoiceType === 'income' ? 'sales_invoice' : 'purchase_invoice';

  // Check current payment status
  const currentStatus = await getDocumentPaymentStatus(
    businessProfileId,
    docType,
    invoiceId,
    invoiceTotal
  );

  if (amount > currentStatus.remaining + 0.01) {
    throw new Error(`Kwota ${amount.toFixed(2)} przekracza pozostałą do zapłaty ${currentStatus.remaining.toFixed(2)}`);
  }

  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: docType,
    document_id: invoiceId,
    payment_account_id: paymentAccountId,
    amount,
    payment_date: paymentDate,
    notes,
  });

  const newStatus = await getDocumentPaymentStatus(
    businessProfileId,
    docType,
    invoiceId,
    invoiceTotal
  );

  return {
    success: true,
    payment_id: payment.id,
    movement_id: payment.movement_id || '',
    total_paid: newStatus.total_paid,
    remaining: newStatus.remaining,
    status: newStatus.status,
  };
}

export async function getInvoicePaymentStatus(
  businessProfileId: string,
  invoiceId: string,
  invoiceType: 'income' | 'expense',
  invoiceTotal: number
): Promise<DocumentPaymentStatus> {
  const docType: DocumentType = invoiceType === 'income' ? 'sales_invoice' : 'purchase_invoice';
  return getDocumentPaymentStatus(businessProfileId, docType, invoiceId, invoiceTotal);
}

// =============================================================================
// CASH REGISTER (KASA) INTEGRATION
// =============================================================================

export interface KasaTransactionResult {
  success: boolean;
  document_number: string;
  movement_id: string;
  new_balance: number;
}

export async function recordKasaKP(
  businessProfileId: string,
  cashAccountId: string,
  amount: number,
  description: string,
  paymentDate: string,
  counterparty?: string,
  category?: string
): Promise<KasaTransactionResult> {
  const documentId = crypto.randomUUID();
  const docNumber = await generateKasaDocNumber(businessProfileId, 'KP');

  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: 'KP',
    document_id: documentId,
    payment_account_id: cashAccountId,
    amount,
    payment_date: paymentDate,
    notes: `${docNumber}: ${description}${counterparty ? ` - ${counterparty}` : ''}`,
  });

  const balance = await getAccountBalance(cashAccountId);

  return {
    success: true,
    document_number: docNumber,
    movement_id: payment.movement_id || '',
    new_balance: balance.current_balance,
  };
}

export async function recordKasaKW(
  businessProfileId: string,
  cashAccountId: string,
  amount: number,
  description: string,
  paymentDate: string,
  counterparty?: string,
  category?: string,
  isTaxDeductible: boolean = true
): Promise<KasaTransactionResult> {
  const documentId = crypto.randomUUID();
  const docNumber = await generateKasaDocNumber(businessProfileId, 'KW');

  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: 'KW',
    document_id: documentId,
    payment_account_id: cashAccountId,
    amount,
    payment_date: paymentDate,
    notes: `${docNumber}: ${description}${counterparty ? ` - ${counterparty}` : ''}${isTaxDeductible ? '' : ' [NKUP]'}`,
  });

  const balance = await getAccountBalance(cashAccountId);

  return {
    success: true,
    document_number: docNumber,
    movement_id: payment.movement_id || '',
    new_balance: balance.current_balance,
  };
}

async function generateKasaDocNumber(businessProfileId: string, type: 'KP' | 'KW'): Promise<string> {
  const year = new Date().getFullYear();
  const movements = await getAccountMovements(businessProfileId, {
    sourceType: 'DOCUMENT_PAYMENT',
  });

  // Count existing KP/KW documents this year
  const count = movements.filter(m => 
    m.description.includes(`${type}/`) && 
    m.created_at.startsWith(String(year))
  ).length;

  return `${type}/${year}/${String(count + 1).padStart(4, '0')}`;
}

// =============================================================================
// TRANSFER INTEGRATION
// =============================================================================

export interface TransferResult {
  success: boolean;
  transfer_id: string;
  from_balance: number;
  to_balance: number;
}

export async function transferBetweenAccounts(
  businessProfileId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  transferDate: string,
  description?: string
): Promise<TransferResult> {
  const transfer = await createTransfer({
    business_profile_id: businessProfileId,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    amount,
    transfer_date: transferDate,
    description,
  });

  const [fromBalance, toBalance] = await Promise.all([
    getAccountBalance(fromAccountId),
    getAccountBalance(toAccountId),
  ]);

  return {
    success: true,
    transfer_id: transfer.id,
    from_balance: fromBalance.current_balance,
    to_balance: toBalance.current_balance,
  };
}

// =============================================================================
// CORRECTIONS
// =============================================================================

export async function correctAccountBalance(
  businessProfileId: string,
  accountId: string,
  direction: 'IN' | 'OUT',
  amount: number,
  reason: string
): Promise<{ movement_id: string; new_balance: number }> {
  const movement = await createAdjustment({
    business_profile_id: businessProfileId,
    payment_account_id: accountId,
    direction,
    amount,
    reason,
  });

  const balance = await getAccountBalance(accountId);

  return {
    movement_id: movement.id,
    new_balance: balance.current_balance,
  };
}

export async function reverseTransaction(
  businessProfileId: string,
  movementId: string,
  reason: string
): Promise<{ reversal_id: string; new_balance: number }> {
  const reversal = await reverseMovement({
    business_profile_id: businessProfileId,
    movement_id: movementId,
    reason,
  });

  const balance = await getAccountBalance(reversal.payment_account_id);

  return {
    reversal_id: reversal.id,
    new_balance: balance.current_balance,
  };
}

// =============================================================================
// SUMMARY & REPORTING
// =============================================================================

export { getTreasurySummary, getAccountBalance, getAccountBalances, getAccountMovements };
