import { supabase } from '../client';
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
} from '@/types/kasa';

// ============================================================================
// CASH ACCOUNTS
// ============================================================================

export async function getCashAccounts(businessProfileId: string): Promise<CashAccount[]> {
  const { data, error } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCashAccount(id: string): Promise<CashAccount | null> {
  const { data, error } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createCashAccount(input: CreateCashAccountInput): Promise<CashAccount> {
  const { data, error } = await supabase
    .from('cash_accounts')
    .insert({
      business_profile_id: input.business_profile_id,
      name: input.name,
      currency: input.currency || 'PLN',
      opening_balance: input.opening_balance || 0,
      current_balance: input.opening_balance || 0,
      responsible_person: input.responsible_person || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCashAccount(
  id: string,
  updates: Partial<Pick<CashAccount, 'name' | 'responsible_person' | 'status'>>
): Promise<CashAccount> {
  const { data, error } = await supabase
    .from('cash_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    .from('cash_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_profile_id', businessProfileId)
    .eq('type', type)
    .gte('date', startOfYear)
    .lte('date', endOfYear);

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
    .from('cash_transactions')
    .select(`
      *,
      cash_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.cashAccountId) {
    query = query.eq('cash_account_id', options.cashAccountId);
  }
  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
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
    ...row,
    cash_account_name: row.cash_accounts?.name,
    cash_accounts: undefined,
  }));
}

export async function getCashTransaction(id: string): Promise<CashTransaction | null> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .select(`
      *,
      cash_accounts!inner(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    cash_account_name: (data as any).cash_accounts?.name,
    cash_accounts: undefined,
  } as CashTransaction;
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

  // Start a transaction-like operation
  const { data: transaction, error: txError } = await supabase
    .from('cash_transactions')
    .insert({
      business_profile_id: input.business_profile_id,
      cash_account_id: input.cash_account_id,
      document_number: documentNumber,
      type: input.type,
      amount: input.amount,
      date: input.date,
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

  if (txError) throw txError;

  // Update cash account balance
  const balanceChange = input.type === 'KP' ? input.amount : -input.amount;
  const { error: balanceError } = await supabase.rpc('update_cash_balance', {
    p_cash_account_id: input.cash_account_id,
    p_amount: balanceChange,
  });

  // If RPC doesn't exist, do manual update
  if (balanceError && balanceError.message.includes('does not exist')) {
    const account = await getCashAccount(input.cash_account_id);
    if (account) {
      await supabase
        .from('cash_accounts')
        .update({
          current_balance: account.current_balance + balanceChange,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.cash_account_id);
    }
  } else if (balanceError) {
    throw balanceError;
  }

  return transaction;
}

export async function approveCashTransaction(id: string): Promise<CashTransaction> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cash_transactions')
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
  // Get transaction first to reverse balance
  const transaction = await getCashTransaction(id);
  if (!transaction) throw new Error('Transaction not found');

  // Reverse balance change
  const balanceChange = transaction.type === 'KP' ? -transaction.amount : transaction.amount;
  const account = await getCashAccount(transaction.cash_account_id);
  if (account) {
    await supabase
      .from('cash_accounts')
      .update({
        current_balance: account.current_balance + balanceChange,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.cash_account_id);
  }

  const { error } = await supabase
    .from('cash_transactions')
    .delete()
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
  let query = supabase
    .from('cash_transfers')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('date', { ascending: false });

  if (options?.cashAccountId) {
    query = query.eq('cash_account_id', options.cashAccountId);
  }
  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createCashTransfer(input: CreateCashTransferInput): Promise<CashTransfer> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: transfer, error: transferError } = await supabase
    .from('cash_transfers')
    .insert({
      business_profile_id: input.business_profile_id,
      cash_account_id: input.cash_account_id,
      bank_account_id: input.bank_account_id || null,
      transfer_type: input.transfer_type,
      amount: input.amount,
      date: input.date,
      description: input.description || null,
      reference_number: input.reference_number || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (transferError) throw transferError;

  // Update cash account balance
  const balanceChange = input.transfer_type === 'bank_to_cash' ? input.amount : -input.amount;
  const account = await getCashAccount(input.cash_account_id);
  if (account) {
    await supabase
      .from('cash_accounts')
      .update({
        current_balance: account.current_balance + balanceChange,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.cash_account_id);
  }

  // Also create a corresponding cash transaction for audit trail
  const txType: CashTransactionType = input.transfer_type === 'bank_to_cash' ? 'KP' : 'KW';
  const category = input.transfer_type === 'bank_to_cash' ? 'withdrawal' : 'deposit';
  const description = input.transfer_type === 'bank_to_cash'
    ? 'Pobranie gotówki z banku'
    : 'Wpłata gotówki do banku';

  await createCashTransaction({
    business_profile_id: input.business_profile_id,
    cash_account_id: input.cash_account_id,
    type: txType,
    amount: input.amount,
    date: input.date,
    description: input.description || description,
    category: category as any,
    is_tax_deductible: false,
  });

  return transfer;
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
      cash_accounts!inner(name)
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
    cash_account_name: row.cash_accounts?.name,
    cash_accounts: undefined,
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
      cash_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .eq('cash_account_id', cashAccountId)
    .order('reconciliation_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    cash_account_name: (data as any).cash_accounts?.name,
    cash_accounts: undefined,
  } as CashReconciliation;
}

export async function createCashReconciliation(
  input: CreateCashReconciliationInput
): Promise<CashReconciliation> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Get current system balance
  const account = await getCashAccount(input.cash_account_id);
  if (!account) throw new Error('Cash account not found');

  const systemBalance = account.current_balance;
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

  // If there's a discrepancy, update the cash account balance to match counted
  if (result !== 'match') {
    await supabase
      .from('cash_accounts')
      .update({
        current_balance: countedBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.cash_account_id);
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
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
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
  const account = await getCashAccount(cashAccountId);
  if (!account) throw new Error('Cash account not found');

  let query = supabase
    .from('cash_transactions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('cash_account_id', cashAccountId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data: transactions, error } = await query;
  if (error) throw error;

  const txs = transactions || [];
  const totalKP = txs.filter(t => t.type === 'KP').reduce((sum, t) => sum + t.amount, 0);
  const totalKW = txs.filter(t => t.type === 'KW').reduce((sum, t) => sum + t.amount, 0);
  const pendingApproval = txs.filter(t => !t.is_approved).length;

  const lastReconciliation = await getLastReconciliation(businessProfileId, cashAccountId);

  return {
    totalKP,
    totalKW,
    netChange: totalKP - totalKW,
    currentBalance: account.current_balance,
    transactionCount: txs.length,
    pendingApproval,
    lastReconciliation,
  };
}

export async function getTotalCashBalance(businessProfileId: string): Promise<number> {
  const accounts = await getCashAccounts(businessProfileId);
  return accounts
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + a.current_balance, 0);
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
    .from('cash_transactions')
    .update({ attachment_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', transactionId);

  return data.publicUrl;
}
