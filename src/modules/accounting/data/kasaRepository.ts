import { supabase } from '../../../integrations/supabase/client';
import {
  createDocumentPayment,
  getAccountBalance,
  getAccountBalances,
  getPaymentAccounts,
  createTransfer,
} from './treasuryRepository';
import type {
  CashAccount,
  CashTransaction,
  CashTransfer,
  CashReconciliation,
  CashSettings,
  CreateCashAccountInput,
  CreateCashTransactionInput,
  CreateCashTransferInput,
  CreateCashReconciliationInput,
  CashRegisterSummary,
  ReconciliationResult,
  CashTransactionType,
} from '@/modules/accounting/kasa';
import type { PaymentAccount } from '@/modules/accounting/treasury';

// ============================================================================
// CASH ACCOUNTS
// ============================================================================

function mapPaymentAccountToCashAccount(pa: PaymentAccount, computedBalance: number): CashAccount {
  return {
    id: pa.id,
    business_profile_id: pa.business_profile_id,
    name: pa.name,
    currency: pa.currency,
    opening_balance: pa.opening_balance,
    current_balance: computedBalance,
    responsible_person: pa.responsible_person ?? null,
    status: pa.is_active ? 'active' : 'closed',
    created_at: pa.created_at,
    updated_at: pa.updated_at,
  };
}

export async function getCashAccounts(businessProfileId: string): Promise<CashAccount[]> {
  const [accounts, balances] = await Promise.all([
    getPaymentAccounts(businessProfileId, 'CASH'),
    getAccountBalances(businessProfileId, 'CASH'),
  ]);

  return accounts
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((pa) => {
      const bal = balances.find((b) => b.payment_account_id === pa.id);
      return mapPaymentAccountToCashAccount(pa, bal?.current_balance ?? pa.opening_balance);
    });
}

export async function getCashAccount(id: string): Promise<CashAccount | null> {
  const { data: pa, error } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('id', id)
    .eq('account_type', 'CASH')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const bal = await getAccountBalance(id);
  return mapPaymentAccountToCashAccount(pa as any, bal.current_balance);
}

export async function createCashAccount(input: CreateCashAccountInput): Promise<CashAccount> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const openingBalance = input.opening_balance || 0;

  const { data: pa, error } = await supabase
    .from('payment_accounts')
    .insert({
      business_profile_id: input.business_profile_id,
      account_type: 'CASH',
      name: input.name,
      currency: input.currency || 'PLN',
      opening_balance: openingBalance,
      responsible_person: input.responsible_person || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  // Create OPENING_BALANCE movement if non-zero (balances remain derived)
  if (openingBalance !== 0) {
    await supabase
      .from('account_movements')
      .insert({
        business_profile_id: input.business_profile_id,
        payment_account_id: pa.id,
        direction: openingBalance > 0 ? 'IN' : 'OUT',
        amount: Math.abs(openingBalance),
        currency: input.currency || 'PLN',
        source_type: 'OPENING_BALANCE',
        source_id: pa.id,
        description: 'Saldo początkowe (kasa)',
        created_by: user.id,
      });
  }

  const bal = await getAccountBalance(pa.id);
  return mapPaymentAccountToCashAccount(pa as any, bal.current_balance);
}

export async function updateCashAccount(
  id: string,
  updates: Partial<Pick<CashAccount, 'name' | 'responsible_person' | 'status'>>
): Promise<CashAccount> {
  const { data: pa, error } = await supabase
    .from('payment_accounts')
    .update({
      name: updates.name,
      responsible_person: updates.responsible_person,
      is_active: updates.status ? updates.status === 'active' : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('account_type', 'CASH')
    .select()
    .single();

  if (error) throw error;
  const bal = await getAccountBalance(id);
  return mapPaymentAccountToCashAccount(pa as any, bal.current_balance);
}

export async function closeCashAccount(id: string): Promise<CashAccount> {
  return updateCashAccount(id, { status: 'closed' });
}

// ============================================================================
// CASH TRANSACTIONS (KP/KW)
// ============================================================================

async function generateDocumentNumber(
  businessProfileId: string,
  type: CashTransactionType,
  year: number
): Promise<string> {
  // Get count of transactions of this type for this year
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const { count, error } = await supabase
    .from('kasa_documents')
    .select('*', { count: 'exact', head: true })
    .eq('business_profile_id', businessProfileId)
    .eq('type', type)
    .gte('payment_date', startOfYear)
    .lte('payment_date', endOfYear);

  if (error) throw error;

  const nextNumber = (count || 0) + 1;
  return `${type}/${year}/${String(nextNumber).padStart(4, '0')}`;
}

export async function getCashTransactions(
  businessProfileId: string,
  options?: {
    cashAccountId?: string;
    startDate?: string;
    endDate?: string;
    type?: CashTransactionType;
    limit?: number;
  }
): Promise<CashTransaction[]> {
  let query = supabase
    .from('kasa_documents')
    .select(`
      *,
      payment_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.cashAccountId) {
    query = query.eq('cash_account_id', options.cashAccountId);
  }
  if (options?.startDate) {
    query = query.gte('payment_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('payment_date', options.endDate);
  }
  if (options?.type) {
    query = query.eq('type', options.type);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    business_profile_id: row.business_profile_id,
    cash_account_id: row.cash_account_id,
    document_number: row.document_number,
    type: row.type,
    amount: row.amount,
    date: row.payment_date,
    description: row.description,
    counterparty_name: row.counterparty_name,
    counterparty_tax_id: row.counterparty_tax_id,
    category: row.category,
    linked_document_type: row.linked_document_type,
    linked_document_id: row.linked_document_id,
    attachment_url: row.attachment_url,
    is_tax_deductible: row.is_tax_deductible,
    is_approved: row.is_approved,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cash_account_name: row.payment_accounts?.name,
    payment_accounts: undefined,
  }));
}

export async function getCashTransaction(id: string): Promise<CashTransaction | null> {
  const { data, error } = await supabase
    .from('kasa_documents')
    .select(`
      *,
      payment_accounts!inner(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    id: data.id,
    business_profile_id: data.business_profile_id,
    cash_account_id: (data as any).cash_account_id,
    document_number: (data as any).document_number,
    type: (data as any).type,
    amount: (data as any).amount,
    date: (data as any).payment_date,
    description: (data as any).description,
    counterparty_name: (data as any).counterparty_name,
    counterparty_tax_id: (data as any).counterparty_tax_id,
    category: (data as any).category,
    linked_document_type: (data as any).linked_document_type,
    linked_document_id: (data as any).linked_document_id,
    attachment_url: (data as any).attachment_url,
    is_tax_deductible: (data as any).is_tax_deductible,
    is_approved: (data as any).is_approved,
    approved_by: (data as any).approved_by,
    approved_at: (data as any).approved_at,
    created_by: (data as any).created_by,
    created_at: (data as any).created_at,
    updated_at: (data as any).updated_at,
    cash_account_name: (data as any).payment_accounts?.name,
    payment_accounts: undefined,
  } as any;
}

export async function createCashTransaction(
  input: CreateCashTransactionInput
): Promise<CashTransaction> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const year = new Date(input.date).getFullYear();
  const documentNumber = await generateDocumentNumber(
    input.business_profile_id,
    input.type,
    year
  );

  // 1) Create movement via document_payment (KP => IN, KW => OUT)
  await createDocumentPayment({
    business_profile_id: input.business_profile_id,
    document_type: input.type,
    document_id: crypto.randomUUID(),
    payment_account_id: input.cash_account_id,
    amount: input.amount,
    currency: 'PLN',
    payment_date: input.date,
    notes: input.description,
  });

  // 2) Create kasa document metadata
  const { data: doc, error: docError } = await supabase
    .from('kasa_documents')
    .insert({
      business_profile_id: input.business_profile_id,
      cash_account_id: input.cash_account_id,
      document_number: documentNumber,
      type: input.type,
      amount: input.amount,
      currency: 'PLN',
      payment_date: input.date,
      description: input.description,
      counterparty_name: input.counterparty_name || null,
      counterparty_tax_id: input.counterparty_tax_id || null,
      category: input.category,
      linked_document_type: input.linked_document_type || null,
      linked_document_id: input.linked_document_id || null,
      attachment_url: input.attachment_url || null,
      is_tax_deductible: input.is_tax_deductible ?? true,
      is_approved: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (docError) throw docError;

  return {
    id: doc.id,
    business_profile_id: doc.business_profile_id,
    cash_account_id: doc.cash_account_id,
    document_number: doc.document_number,
    type: doc.type,
    amount: doc.amount,
    date: doc.payment_date,
    description: doc.description,
    counterparty_name: doc.counterparty_name,
    counterparty_tax_id: doc.counterparty_tax_id,
    category: doc.category,
    linked_document_type: doc.linked_document_type,
    linked_document_id: doc.linked_document_id,
    attachment_url: doc.attachment_url,
    is_tax_deductible: doc.is_tax_deductible,
    is_approved: doc.is_approved,
    approved_by: doc.approved_by,
    approved_at: doc.approved_at,
    created_by: doc.created_by,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  } as any;
}

export async function approveCashTransaction(id: string): Promise<CashTransaction> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('kasa_documents')
    .update({
      is_approved: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCashTransaction(id: string): Promise<void> {
  // History-safe: do not delete. Mark as cancelled.
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('kasa_documents')
    .update({
      is_cancelled: true,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Cancelled from UI',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CASH TRANSFERS (Bank <-> Cash)
// ============================================================================

export async function getCashTransfers(
  businessProfileId: string,
  options?: {
    cashAccountId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<CashTransfer[]> {
  // Transfers are handled by treasury engine; keeping legacy signature.
  const { data, error } = await supabase
    .from('account_transfers')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('transfer_date', { ascending: false });

  if (error) throw error;

  const filtered = (data || []).filter((t: any) => {
    if (!options?.cashAccountId) return true;
    return t.from_account_id === options.cashAccountId || t.to_account_id === options.cashAccountId;
  });

  return filtered.map((t: any) => ({
    id: t.id,
    business_profile_id: t.business_profile_id,
    cash_account_id: t.to_account_id,
    bank_account_id: t.from_account_id,
    transfer_type: t.to_account_id === options?.cashAccountId ? 'bank_to_cash' : 'cash_to_bank',
    amount: t.amount,
    date: t.transfer_date,
    description: t.description,
    reference_number: t.reference_number,
    created_by: t.created_by,
    created_at: t.created_at,
  }));
}

export async function createCashTransfer(input: CreateCashTransferInput): Promise<CashTransfer> {
  // Create treasury transfer (two movements). Use provided bank_account_id if available.
  const fromAccountId = input.transfer_type === 'bank_to_cash'
    ? (input.bank_account_id || '')
    : input.cash_account_id;
  const toAccountId = input.transfer_type === 'bank_to_cash'
    ? input.cash_account_id
    : (input.bank_account_id || '');

  if (!fromAccountId || !toAccountId) {
    throw new Error('Missing bank account for transfer');
  }

  const transfer = await createTransfer({
    business_profile_id: input.business_profile_id,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    amount: input.amount,
    currency: 'PLN',
    transfer_date: input.date,
    description: input.description || null,
    reference_number: input.reference_number || null,
  });

  return {
    id: transfer.id,
    business_profile_id: transfer.business_profile_id,
    cash_account_id: input.cash_account_id,
    bank_account_id: input.bank_account_id || null,
    transfer_type: input.transfer_type,
    amount: transfer.amount,
    date: transfer.transfer_date,
    description: transfer.description,
    reference_number: transfer.reference_number,
    created_by: transfer.created_by,
    created_at: transfer.created_at,
  } as any;
}

// ============================================================================
// CASH RECONCILIATION
// ============================================================================

export async function getCashReconciliations(
  businessProfileId: string,
  cashAccountId?: string
): Promise<CashReconciliation[]> {
  let query = supabase
    .from('cash_reconciliations')
    .select(`
      *,
      payment_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('reconciliation_date', { ascending: false });

  if (cashAccountId) {
    query = query.eq('cash_account_id', cashAccountId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    cash_account_name: row.payment_accounts?.name,
    payment_accounts: undefined,
  }));
}

export async function getLastReconciliation(
  businessProfileId: string,
  cashAccountId: string
): Promise<CashReconciliation | null> {
  const { data, error } = await supabase
    .from('cash_reconciliations')
    .select(`
      *,
      payment_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .eq('cash_account_id', cashAccountId)
    .order('reconciliation_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    cash_account_name: (data as any).payment_accounts?.name,
    payment_accounts: undefined,
  } as CashReconciliation;
}

export async function createCashReconciliation(
  input: CreateCashReconciliationInput
): Promise<CashReconciliation> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get current system balance
  const bal = await getAccountBalance(input.cash_account_id);
  const systemBalance = bal.current_balance;
  const countedBalance = input.counted_balance;
  const difference = countedBalance - systemBalance;

  let result: ReconciliationResult = 'match';
  if (difference > 0.01) result = 'surplus';
  else if (difference < -0.01) result = 'shortage';

  const { data, error } = await supabase
    .from('cash_reconciliations')
    .insert({
      business_profile_id: input.business_profile_id,
      cash_account_id: input.cash_account_id,
      reconciliation_date: new Date().toISOString().split('T')[0],
      system_balance: systemBalance,
      counted_balance: countedBalance,
      difference: difference,
      result: result,
      explanation: input.explanation || null,
      counted_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // If there's a discrepancy, create an ADJUSTMENT movement so balance becomes counted.
  if (result !== 'match') {
    const direction = difference > 0 ? 'IN' : 'OUT';
    const { data: adj, error: adjError } = await supabase
      .from('account_movements')
      .insert({
        business_profile_id: input.business_profile_id,
        payment_account_id: input.cash_account_id,
        direction,
        amount: Math.abs(difference),
        currency: 'PLN',
        source_type: 'ADJUSTMENT',
        source_id: data.id,
        description: `KOREKTA UZGODNIENIA KASY: ${input.explanation || 'Brak wyjaśnienia'}`,
        created_by: user.id,
      })
      .select()
      .single();
    if (adjError) throw adjError;

    await supabase
      .from('cash_reconciliations')
      .update({ adjustment_movement_id: adj.id })
      .eq('id', data.id);
  }

  return data;
}

// ============================================================================
// CASH SETTINGS
// ============================================================================

export async function getCashSettings(businessProfileId: string): Promise<CashSettings | null> {
  const { data, error } = await supabase
    .from('cash_settings')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function upsertCashSettings(
  businessProfileId: string,
  settings: Partial<Omit<CashSettings, 'id' | 'business_profile_id' | 'created_at' | 'updated_at'>>
): Promise<CashSettings> {
  const { data, error } = await supabase
    .from('cash_settings')
    .upsert({
      business_profile_id: businessProfileId,
      high_expense_warning_threshold: settings.high_expense_warning_threshold ?? 1000,
      cash_share_warning_percentage: settings.cash_share_warning_percentage ?? 30,
      require_approval_above: settings.require_approval_above ?? null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'business_profile_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SUMMARY & ANALYTICS
// ============================================================================

export async function getCashRegisterSummary(
  businessProfileId: string,
  cashAccountId: string,
  startDate?: string,
  endDate?: string
): Promise<CashRegisterSummary> {
  const balance = await getAccountBalance(cashAccountId);

  const docs = await getCashTransactions(businessProfileId, { cashAccountId, startDate, endDate });
  const totalKP = docs.filter(t => t.type === 'KP').reduce((sum, t) => sum + t.amount, 0);
  const totalKW = docs.filter(t => t.type === 'KW').reduce((sum, t) => sum + t.amount, 0);
  const pendingApproval = docs.filter(t => !t.is_approved).length;

  const lastReconciliation = await getLastReconciliation(businessProfileId, cashAccountId);

  return {
    totalKP,
    totalKW,
    netChange: totalKP - totalKW,
    currentBalance: balance.current_balance,
    transactionCount: docs.length,
    pendingApproval,
    lastReconciliation,
  };
}

export async function getTotalCashBalance(businessProfileId: string): Promise<number> {
  const balances = await getAccountBalances(businessProfileId, 'CASH');
  return balances.reduce((sum, b) => sum + b.current_balance, 0);
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportCashRegisterCSV(
  businessProfileId: string,
  cashAccountId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const transactions = await getCashTransactions(businessProfileId, {
    cashAccountId,
    startDate,
    endDate,
  });

  const headers = [
    'Nr dokumentu',
    'Data',
    'Typ',
    'Kwota',
    'Opis',
    'Kontrahent',
    'NIP kontrahenta',
    'Kategoria',
    'Koszty uzyskania przychodu',
    'Zatwierdzony',
  ];

  const rows = transactions.map(tx => [
    tx.document_number,
    tx.date,
    tx.type,
    tx.amount.toFixed(2),
    tx.description,
    tx.counterparty_name || '',
    tx.counterparty_tax_id || '',
    tx.category,
    tx.is_tax_deductible ? 'Tak' : 'Nie',
    tx.is_approved ? 'Tak' : 'Nie',
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n');

  return csvContent;
}

// ============================================================================
// ATTACHMENT UPLOAD
// ============================================================================

export async function uploadCashAttachment(
  businessProfileId: string,
  transactionId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${businessProfileId}/kasa/${transactionId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('cash-attachments')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('cash-attachments').getPublicUrl(path);

  // Update transaction with attachment URL
  await supabase
    .from('kasa_documents')
    .update({ attachment_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', transactionId);

  return data.publicUrl;
}
