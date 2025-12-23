import { supabase } from '../client';
import type {
  PaymentAccount,
  PaymentAccountType,
  DocumentPayment,
  AccountMovement,
  AccountTransfer,
  AccountBalance,
  DocumentPaymentStatus,
  TreasurySummary,
  PaymentDirection,
  MovementSourceType,
  DocumentType,
  CreatePaymentAccountInput,
  CreateDocumentPaymentInput,
  CreateTransferInput,
  CreateAdjustmentInput,
  CreateReversalInput,
} from '@/modules/accounting/treasury';

// =============================================================================
// PAYMENT ACCOUNTS
// =============================================================================

export async function getPaymentAccounts(
  businessProfileId: string,
  accountType?: PaymentAccountType
): Promise<PaymentAccount[]> {
  let query = supabase
    .from('payment_accounts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('account_type')
    .order('name');

  if (accountType) {
    query = query.eq('account_type', accountType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPaymentAccount(id: string): Promise<PaymentAccount | null> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createPaymentAccount(input: CreatePaymentAccountInput): Promise<PaymentAccount> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: account, error: accountError } = await supabase
    .from('payment_accounts')
    .insert({
      business_profile_id: input.business_profile_id,
      account_type: input.account_type,
      name: input.name,
      currency: input.currency || 'PLN',
      opening_balance: input.opening_balance || 0,
      bank_name: input.bank_name || null,
      account_number: input.account_number || null,
      responsible_person: input.responsible_person || null,
      is_active: true,
    })
    .select()
    .single();

  if (accountError) throw accountError;

  // Create opening balance movement if non-zero
  if (input.opening_balance && input.opening_balance !== 0) {
    const direction: PaymentDirection = input.opening_balance > 0 ? 'IN' : 'OUT';
    await createMovement({
      business_profile_id: input.business_profile_id,
      payment_account_id: account.id,
      direction,
      amount: Math.abs(input.opening_balance),
      currency: input.currency || 'PLN',
      source_type: 'OPENING_BALANCE',
      source_id: account.id,
      description: 'Saldo początkowe',
      created_by: user.id,
    });
  }

  return account;
}

export async function updatePaymentAccount(
  id: string,
  updates: Partial<Pick<PaymentAccount, 'name' | 'bank_name' | 'account_number' | 'responsible_person' | 'is_active'>>
): Promise<PaymentAccount> {
  const { data, error } = await supabase
    .from('payment_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivatePaymentAccount(id: string): Promise<PaymentAccount> {
  return updatePaymentAccount(id, { is_active: false });
}

// =============================================================================
// ACCOUNT MOVEMENTS (Source of Truth)
// =============================================================================

interface CreateMovementParams {
  business_profile_id: string;
  payment_account_id: string;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  source_type: MovementSourceType;
  source_id: string | null;
  description: string;
  created_by: string;
  reversed_movement_id?: string;
  reversal_reason?: string;
}

async function createMovement(params: CreateMovementParams): Promise<AccountMovement> {
  const { data, error } = await supabase
    .from('account_movements')
    .insert({
      business_profile_id: params.business_profile_id,
      payment_account_id: params.payment_account_id,
      direction: params.direction,
      amount: params.amount,
      currency: params.currency,
      source_type: params.source_type,
      source_id: params.source_id,
      description: params.description,
      created_by: params.created_by,
      reversed_movement_id: params.reversed_movement_id || null,
      reversal_reason: params.reversal_reason || null,
      is_reversed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAccountMovements(
  businessProfileId: string,
  options?: {
    paymentAccountId?: string;
    sourceType?: MovementSourceType;
    startDate?: string;
    endDate?: string;
    includeReversed?: boolean;
    limit?: number;
  }
): Promise<AccountMovement[]> {
  let query = supabase
    .from('account_movements')
    .select(`
      *,
      payment_accounts!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (options?.paymentAccountId) {
    query = query.eq('payment_account_id', options.paymentAccountId);
  }
  if (options?.sourceType) {
    query = query.eq('source_type', options.sourceType);
  }
  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (!options?.includeReversed) {
    query = query.eq('is_reversed', false);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    payment_account_name: row.payment_accounts?.name,
    payment_accounts: undefined,
  }));
}

// =============================================================================
// DOCUMENT PAYMENTS
// =============================================================================

export async function createDocumentPayment(input: CreateDocumentPaymentInput): Promise<DocumentPayment> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Determine direction based on document type
  const direction: PaymentDirection = 
    input.document_type === 'sales_invoice' || input.document_type === 'KP' ? 'IN' : 'OUT';

  // Get account for description
  const account = await getPaymentAccount(input.payment_account_id);
  const accountName = account?.name || 'Unknown';

  // Create movement first
  const movement = await createMovement({
    business_profile_id: input.business_profile_id,
    payment_account_id: input.payment_account_id,
    direction,
    amount: input.amount,
    currency: input.currency || 'PLN',
    source_type: 'DOCUMENT_PAYMENT',
    source_id: input.document_id,
    description: `Płatność za dokument ${input.document_type} - ${accountName}`,
    created_by: user.id,
  });

  // Create payment record linked to movement
  const { data: payment, error } = await supabase
    .from('document_payments')
    .insert({
      business_profile_id: input.business_profile_id,
      document_type: input.document_type,
      document_id: input.document_id,
      payment_account_id: input.payment_account_id,
      direction,
      amount: input.amount,
      currency: input.currency || 'PLN',
      payment_date: input.payment_date,
      notes: input.notes || null,
      movement_id: movement.id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return payment;
}

export async function getDocumentPayments(
  businessProfileId: string,
  documentType: DocumentType,
  documentId: string
): Promise<DocumentPayment[]> {
  const { data, error } = await supabase
    .from('document_payments')
    .select(`
      *,
      payment_accounts!inner(name),
      account_movements!inner(is_reversed)
    `)
    .eq('business_profile_id', businessProfileId)
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .order('payment_date', { ascending: true });

  if (error) throw error;

  // Filter out payments with reversed movements
  return (data || [])
    .filter((row: any) => !row.account_movements?.is_reversed)
    .map((row: any) => ({
      ...row,
      payment_account_name: row.payment_accounts?.name,
      payment_accounts: undefined,
      account_movements: undefined,
    }));
}

export async function getDocumentPaymentStatus(
  businessProfileId: string,
  documentType: DocumentType,
  documentId: string,
  documentTotal: number,
  currency: string = 'PLN'
): Promise<DocumentPaymentStatus> {
  const payments = await getDocumentPayments(businessProfileId, documentType, documentId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = documentTotal - totalPaid;

  let status: DocumentPaymentStatus['status'] = 'unpaid';
  if (totalPaid >= documentTotal) {
    status = totalPaid > documentTotal ? 'overpaid' : 'paid';
  } else if (totalPaid > 0) {
    status = 'partial';
  }

  return {
    document_type: documentType,
    document_id: documentId,
    document_total: documentTotal,
    currency,
    total_paid: totalPaid,
    remaining: Math.max(0, remaining),
    status,
    payments,
  };
}

// =============================================================================
// TRANSFERS (Bank↔Cash, Bank↔Bank)
// =============================================================================

export async function createTransfer(input: CreateTransferInput): Promise<AccountTransfer> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  if (input.from_account_id === input.to_account_id) {
    throw new Error('Cannot transfer to the same account');
  }

  // Get accounts for descriptions
  const [fromAccount, toAccount] = await Promise.all([
    getPaymentAccount(input.from_account_id),
    getPaymentAccount(input.to_account_id),
  ]);

  const fromName = fromAccount?.name || 'Unknown';
  const toName = toAccount?.name || 'Unknown';
  const description = input.description || `Transfer ${fromName} → ${toName}`;

  // Create OUT movement from source
  const outMovement = await createMovement({
    business_profile_id: input.business_profile_id,
    payment_account_id: input.from_account_id,
    direction: 'OUT',
    amount: input.amount,
    currency: input.currency || 'PLN',
    source_type: 'TRANSFER',
    source_id: null, // Will be updated after transfer created
    description: `Transfer OUT: ${description}`,
    created_by: user.id,
  });

  // Create IN movement to destination
  const inMovement = await createMovement({
    business_profile_id: input.business_profile_id,
    payment_account_id: input.to_account_id,
    direction: 'IN',
    amount: input.amount,
    currency: input.currency || 'PLN',
    source_type: 'TRANSFER',
    source_id: null,
    description: `Transfer IN: ${description}`,
    created_by: user.id,
  });

  // Create transfer record
  const { data: transfer, error } = await supabase
    .from('account_transfers')
    .insert({
      business_profile_id: input.business_profile_id,
      from_account_id: input.from_account_id,
      to_account_id: input.to_account_id,
      amount: input.amount,
      currency: input.currency || 'PLN',
      transfer_date: input.transfer_date,
      description: input.description || null,
      reference_number: input.reference_number || null,
      out_movement_id: outMovement.id,
      in_movement_id: inMovement.id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Update movements with transfer ID
  await supabase
    .from('account_movements')
    .update({ source_id: transfer.id })
    .in('id', [outMovement.id, inMovement.id]);

  return transfer;
}

export async function getTransfers(
  businessProfileId: string,
  options?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AccountTransfer[]> {
  let query = supabase
    .from('account_transfers')
    .select(`
      *,
      from_account:payment_accounts!account_transfers_from_account_id_fkey(name),
      to_account:payment_accounts!account_transfers_to_account_id_fkey(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('transfer_date', { ascending: false });

  if (options?.accountId) {
    query = query.or(`from_account_id.eq.${options.accountId},to_account_id.eq.${options.accountId}`);
  }
  if (options?.startDate) {
    query = query.gte('transfer_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('transfer_date', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    from_account_name: row.from_account?.name,
    to_account_name: row.to_account?.name,
    from_account: undefined,
    to_account: undefined,
  }));
}

// =============================================================================
// ADJUSTMENTS & REVERSALS
// =============================================================================

export async function createAdjustment(input: CreateAdjustmentInput): Promise<AccountMovement> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error('Adjustment requires a reason (min 10 characters)');
  }

  return createMovement({
    business_profile_id: input.business_profile_id,
    payment_account_id: input.payment_account_id,
    direction: input.direction,
    amount: input.amount,
    currency: input.currency || 'PLN',
    source_type: 'ADJUSTMENT',
    source_id: null,
    description: `KOREKTA: ${input.reason}`,
    created_by: user.id,
  });
}

export async function reverseMovement(input: CreateReversalInput): Promise<AccountMovement> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error('Reversal requires a reason (min 10 characters)');
  }

  // Get original movement
  const { data: original, error: fetchError } = await supabase
    .from('account_movements')
    .select('*')
    .eq('id', input.movement_id)
    .single();

  if (fetchError) throw fetchError;
  if (!original) throw new Error('Movement not found');
  if (original.is_reversed) throw new Error('Movement already reversed');

  // Create reversal movement (opposite direction)
  const reversal = await createMovement({
    business_profile_id: input.business_profile_id,
    payment_account_id: original.payment_account_id,
    direction: original.direction === 'IN' ? 'OUT' : 'IN',
    amount: original.amount,
    currency: original.currency,
    source_type: 'REVERSAL',
    source_id: original.source_id,
    description: `STORNO: ${original.description}`,
    created_by: user.id,
    reversed_movement_id: input.movement_id,
    reversal_reason: input.reason,
  });

  // Mark original as reversed
  await supabase
    .from('account_movements')
    .update({ is_reversed: true })
    .eq('id', input.movement_id);

  return reversal;
}

// =============================================================================
// BALANCE CALCULATIONS (NEVER store, always compute)
// =============================================================================

export async function getAccountBalance(paymentAccountId: string): Promise<AccountBalance> {
  const { data, error } = await supabase
    .from('payment_account_balances')
    .select('*')
    .eq('payment_account_id', paymentAccountId)
    .single();

  if (error) {
    // Fallback: calculate manually if view doesn't exist
    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
      return calculateAccountBalanceManually(paymentAccountId);
    }
    throw error;
  }

  return data;
}

async function calculateAccountBalanceManually(paymentAccountId: string): Promise<AccountBalance> {
  const account = await getPaymentAccount(paymentAccountId);
  if (!account) throw new Error('Account not found');

  const { data: movements, error } = await supabase
    .from('account_movements')
    .select('direction, amount, created_at')
    .eq('payment_account_id', paymentAccountId)
    .eq('is_reversed', false);

  if (error) throw error;

  const mvts = movements || [];
  const totalIn = mvts.filter(m => m.direction === 'IN').reduce((sum, m) => sum + m.amount, 0);
  const totalOut = mvts.filter(m => m.direction === 'OUT').reduce((sum, m) => sum + m.amount, 0);
  const lastDate = mvts.length > 0 
    ? mvts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
    : null;

  return {
    payment_account_id: paymentAccountId,
    account_name: account.name,
    account_type: account.account_type,
    currency: account.currency,
    opening_balance: account.opening_balance,
    total_in: totalIn,
    total_out: totalOut,
    current_balance: account.opening_balance + totalIn - totalOut,
    movement_count: mvts.length,
    last_movement_date: lastDate,
  };
}

export async function getAccountBalances(
  businessProfileId: string,
  accountType?: PaymentAccountType
): Promise<AccountBalance[]> {
  // Try view first
  let query = supabase
    .from('payment_account_balances')
    .select('*')
    .eq('business_profile_id', businessProfileId);

  if (accountType) {
    query = query.eq('account_type', accountType);
  }

  const { data, error } = await query;

  if (error) {
    // Fallback: calculate manually for each account
    if (error.message.includes('does not exist')) {
      const accounts = await getPaymentAccounts(businessProfileId, accountType);
      return Promise.all(accounts.map(a => calculateAccountBalanceManually(a.id)));
    }
    throw error;
  }

  return data || [];
}

export async function getTreasurySummary(businessProfileId: string): Promise<TreasurySummary> {
  const balances = await getAccountBalances(businessProfileId);

  const bankBalances = balances.filter(b => b.account_type === 'BANK');
  const cashBalances = balances.filter(b => b.account_type === 'CASH');

  const totalBank = bankBalances.reduce((sum, b) => sum + b.current_balance, 0);
  const totalCash = cashBalances.reduce((sum, b) => sum + b.current_balance, 0);

  return {
    business_profile_id: businessProfileId,
    total_bank_balance: totalBank,
    total_cash_balance: totalCash,
    total_balance: totalBank + totalCash,
    currency: 'PLN',
    accounts: balances,
  };
}

// =============================================================================
// KP/KW INTEGRATION (Cash documents that create payments + movements)
// =============================================================================

export async function recordKP(
  businessProfileId: string,
  cashAccountId: string,
  amount: number,
  description: string,
  paymentDate: string,
  documentId?: string
): Promise<{ payment: DocumentPayment; movement: AccountMovement }> {
  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: 'KP',
    document_id: documentId || crypto.randomUUID(),
    payment_account_id: cashAccountId,
    amount,
    payment_date: paymentDate,
    notes: description,
  });

  const movement = (await getAccountMovements(businessProfileId, {
    paymentAccountId: cashAccountId,
    sourceType: 'DOCUMENT_PAYMENT',
    limit: 1,
  }))[0];

  return { payment, movement };
}

export async function recordKW(
  businessProfileId: string,
  cashAccountId: string,
  amount: number,
  description: string,
  paymentDate: string,
  documentId?: string
): Promise<{ payment: DocumentPayment; movement: AccountMovement }> {
  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: 'KW',
    document_id: documentId || crypto.randomUUID(),
    payment_account_id: cashAccountId,
    amount,
    payment_date: paymentDate,
    notes: description,
  });

  const movement = (await getAccountMovements(businessProfileId, {
    paymentAccountId: cashAccountId,
    sourceType: 'DOCUMENT_PAYMENT',
    limit: 1,
  }))[0];

  return { payment, movement };
}

// =============================================================================
// INVOICE PAYMENT HELPERS
// =============================================================================

export async function markInvoiceAsPaid(
  businessProfileId: string,
  invoiceType: 'sales_invoice' | 'purchase_invoice',
  invoiceId: string,
  paymentAccountId: string,
  amount: number,
  paymentDate: string,
  notes?: string
): Promise<DocumentPayment> {
  return createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: invoiceType,
    document_id: invoiceId,
    payment_account_id: paymentAccountId,
    amount,
    payment_date: paymentDate,
    notes,
  });
}

export async function markInvoiceAsPartiallyPaid(
  businessProfileId: string,
  invoiceType: 'sales_invoice' | 'purchase_invoice',
  invoiceId: string,
  paymentAccountId: string,
  amount: number,
  invoiceTotal: number,
  paymentDate: string,
  notes?: string
): Promise<{ payment: DocumentPayment; status: DocumentPaymentStatus }> {
  // Validate amount
  const currentStatus = await getDocumentPaymentStatus(
    businessProfileId,
    invoiceType,
    invoiceId,
    invoiceTotal
  );

  if (amount > currentStatus.remaining) {
    throw new Error(`Amount ${amount} exceeds remaining ${currentStatus.remaining}`);
  }

  const payment = await createDocumentPayment({
    business_profile_id: businessProfileId,
    document_type: invoiceType,
    document_id: invoiceId,
    payment_account_id: paymentAccountId,
    amount,
    payment_date: paymentDate,
    notes,
  });

  const newStatus = await getDocumentPaymentStatus(
    businessProfileId,
    invoiceType,
    invoiceId,
    invoiceTotal
  );

  return { payment, status: newStatus };
}
