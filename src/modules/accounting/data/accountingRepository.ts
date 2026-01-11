import { supabase } from '../../../integrations/supabase/client';
import { logEvent } from '@/modules/accounting/data/unifiedEventsRepository';
import type {
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  BalanceSheet,
  EquityTransaction,
  FixedAsset,
  DepreciationEntry,
  Shareholder,
  BalanceSheetData
} from '@/modules/accounting/accounting';

// Chart of Accounts
export async function getChartOfAccounts(businessProfileId: string): Promise<ChartOfAccount[]> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('account_number');

  if (error) throw error;
  return data || [];
}

export async function createChartOfAccount(account: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>): Promise<ChartOfAccount> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChartOfAccount(id: string, updates: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Journal Entries
export async function getJournalEntries(businessProfileId: string, startDate?: string, endDate?: string): Promise<JournalEntry[]> {
  let query = supabase
    .from('journal_entries')
    .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(*))')
    .eq('business_profile_id', businessProfileId)
    .order('entry_date', { ascending: false });

  if (startDate) {
    query = query.gte('entry_date', startDate);
  }
  if (endDate) {
    query = query.lte('entry_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createJournalEntry(
  entry: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>,
  lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id' | 'created_at'>[]
): Promise<JournalEntry> {
  // Validate double-entry bookkeeping: total debits must equal total credits
  const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Total debits must equal total credits in double-entry bookkeeping');
  }

  // Insert journal entry
  const { data: journalEntry, error: entryError } = await supabase
    .from('journal_entries')
    .insert(entry)
    .select()
    .single();

  if (entryError) throw entryError;

  // Insert journal entry lines
  const linesWithEntryId = lines.map(line => ({
    ...line,
    journal_entry_id: journalEntry.id
  }));

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(linesWithEntryId);

  if (linesError) throw linesError;

  return journalEntry;
}

export async function postJournalEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ is_posted: true })
    .eq('id', entryId);

  if (error) throw error;
}

// Balance Sheets
export async function getBalanceSheets(businessProfileId: string): Promise<BalanceSheet[]> {
  const { data, error } = await supabase
    .from('balance_sheets')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('period_end', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function calculateBalanceSheet(
  businessProfileId: string,
  periodEnd: string
): Promise<BalanceSheetData> {
  // Get trial balance from posted journal entries (new system)
  const { data: trialBalance, error } = await supabase.rpc('get_trial_balance', {
    p_business_profile_id: businessProfileId,
    p_period_end: periodEnd,
  });

  if (error) throw error;

  // Build balances map by account code
  const balances: Record<string, number> = {};

  trialBalance?.forEach((row: any) => {
    balances[row.account_code] = row.balance;
  });

  // Build balance sheet structure from chart accounts
  const balanceSheet: BalanceSheetData = {
    assets: {
      current: {
        cash: (balances['140'] || 0) + (balances['130'] || 0), // Kasa + Bank
        accounts_receivable: balances['202'] || 0, // Rozrachunki z odbiorcami
        inventory: balances['300'] || 0,
        other: 0,
        total: 0
      },
      fixed: {
        property: balances['100'] || 0, // Środki trwałe
        equipment: balances['020'] || 0,
        accumulated_depreciation: balances['071'] || 0,
        net: 0,
        total: 0
      },
      total: 0
    },
    liabilities: {
      current: {
        accounts_payable: balances['201'] || 0, // Rozrachunki z dostawcami
        short_term_debt: (balances['222'] || 0) + (balances['229'] || 0) + (balances['231'] || 0) + (balances['234'] || 0), // VAT + ZUS + US
        other: 0,
        total: 0
      },
      long_term: {
        long_term_debt: balances['280'] || 0,
        other: 0,
        total: 0
      },
      total: 0
    },
    equity: {
      share_capital: balances['800'] || 0,
      retained_earnings: balances['820'] || 0,
      current_year_profit: 0,
      total: 0
    }
  };

  // Calculate totals
  balanceSheet.assets.current.total = 
    balanceSheet.assets.current.cash +
    balanceSheet.assets.current.accounts_receivable +
    balanceSheet.assets.current.inventory +
    balanceSheet.assets.current.other;

  balanceSheet.assets.fixed.net = 
    balanceSheet.assets.fixed.property +
    balanceSheet.assets.fixed.equipment -
    balanceSheet.assets.fixed.accumulated_depreciation;
  balanceSheet.assets.fixed.total = balanceSheet.assets.fixed.net;

  balanceSheet.assets.total = 
    balanceSheet.assets.current.total +
    balanceSheet.assets.fixed.total;

  balanceSheet.liabilities.current.total =
    balanceSheet.liabilities.current.accounts_payable +
    balanceSheet.liabilities.current.short_term_debt +
    balanceSheet.liabilities.current.other;

  balanceSheet.liabilities.long_term.total =
    balanceSheet.liabilities.long_term.long_term_debt +
    balanceSheet.liabilities.long_term.other;

  balanceSheet.liabilities.total =
    balanceSheet.liabilities.current.total +
    balanceSheet.liabilities.long_term.total;

  balanceSheet.equity.total =
    balanceSheet.equity.share_capital +
    balanceSheet.equity.retained_earnings +
    balanceSheet.equity.current_year_profit;

  return balanceSheet;
}

export async function saveBalanceSheet(balanceSheet: Omit<BalanceSheet, 'id' | 'created_at' | 'updated_at'>): Promise<BalanceSheet> {
  const { data, error } = await supabase
    .from('balance_sheets')
    .insert(balanceSheet)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Equity Transactions
export async function getEquityTransactions(businessProfileId: string): Promise<EquityTransaction[]> {
  const { data, error } = await supabase
    .from('equity_transactions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEquityTransactionsByShareholder(
  businessProfileId: string,
  shareholderName: string
): Promise<EquityTransaction[]> {
  const { data, error } = await supabase
    .from('equity_transactions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('shareholder_name', shareholderName)
    .eq('transaction_type', 'capital_contribution')
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEquityTransaction(transaction: Omit<EquityTransaction, 'id' | 'created_at' | 'updated_at'> & { 
  payment_method?: 'bank' | 'cash';
  cash_account_id?: string;
  bank_account_id?: string;
  signed_document_id?: string;
}): Promise<EquityTransaction> {
  const { data, error } = await supabase
    .from('equity_transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;

  // Create cash transaction (KP) if payment method is cash
  let kpDocumentId: string | undefined;
  
  if (data && transaction.payment_method === 'cash' && transaction.cash_account_id) {
    // Import createCashTransaction dynamically to avoid circular dependency
    const { createCashTransaction } = await import('./kasaRepository');
    
    try {
      const kpDoc = await createCashTransaction({
        business_profile_id: transaction.business_profile_id,
        cash_account_id: transaction.cash_account_id,
        type: transaction.transaction_type === 'capital_contribution' ? 'KP' : 'KW',
        amount: transaction.amount,
        date: transaction.transaction_date,
        description: transaction.description || `Wniesienie kapitału - ${transaction.shareholder_name}`,
        counterparty_name: transaction.shareholder_name,
        category: 'capital_contribution',
        is_tax_deductible: false,
        accounting_origin: 'manual',
      });

      kpDocumentId = kpDoc.id;

      // Create account movement linked to cash transaction
      const { data: { user } } = await supabase.auth.getUser();
      const direction = transaction.transaction_type === 'capital_contribution' ? 'IN' : 'OUT';
      
      await supabase
        .from('account_movements')
        .insert({
          business_profile_id: transaction.business_profile_id,
          payment_account_id: transaction.cash_account_id,
          direction,
          amount: transaction.amount,
          currency: 'PLN',
          source_type: 'cash_transaction',
          source_id: kpDoc.id,
          description: transaction.description || `Zdarzenie kapitałowe: ${transaction.transaction_type}`,
          created_by: user?.id,
        });
      
      // Link uploaded document to equity transaction and KP if document was uploaded
      if (transaction.signed_document_id) {
        const { linkDocumentToEquityTransaction } = await import('../services/documentStorageService');
        try {
          await linkDocumentToEquityTransaction(
            transaction.signed_document_id,
            data.id,
            kpDoc.id
          );
        } catch (linkError) {
          console.error('Failed to link document:', linkError);
        }
      }
      
      // Log event for equity transaction
      try {
        await logEvent(
          transaction.business_profile_id,
          'capital_event',
          'equity_transaction',
          data.id,
          `Zdarzenie kapitałowe: ${transaction.transaction_type} - ${transaction.amount} PLN przez kasę`,
          {
            entityReference: `${transaction.transaction_type}-${data.id.substring(0, 8)}`,
            amount: transaction.amount,
            currency: 'PLN',
            changes: {
              transaction_type: transaction.transaction_type,
              amount: transaction.amount,
              payment_method: transaction.payment_method,
              cash_account_id: transaction.cash_account_id,
              shareholder_name: transaction.shareholder_name,
              kp_document_id: kpDoc.id,
            },
            metadata: {
              description: transaction.description,
              transaction_date: transaction.transaction_date,
            }
          }
        );
      } catch (eventError) {
        console.error('Failed to log equity transaction event:', eventError);
      }
    } catch (error) {
      console.error('Failed to create cash transaction:', error);
      throw new Error('Nie udało się utworzyć dokumentu KP');
    }
  } else if (data && transaction.payment_method === 'bank' && transaction.bank_account_id) {
    // For bank transfers, just create account movement
    const { data: { user } } = await supabase.auth.getUser();
    const direction = transaction.transaction_type === 'capital_contribution' ? 'IN' : 'OUT';
    
    await supabase
      .from('account_movements')
      .insert({
        business_profile_id: transaction.business_profile_id,
        payment_account_id: transaction.bank_account_id,
        direction,
        amount: transaction.amount,
        currency: 'PLN',
        source_type: 'equity_transaction',
        source_id: data.id,
        description: transaction.description || `Zdarzenie kapitałowe: ${transaction.transaction_type}`,
        created_by: user?.id,
      });
    
    // Link uploaded document to equity transaction if document was uploaded
    if (transaction.signed_document_id) {
      const { linkDocumentToEquityTransaction } = await import('../services/documentStorageService');
      try {
        await linkDocumentToEquityTransaction(
          transaction.signed_document_id,
          data.id
        );
      } catch (linkError) {
        console.error('Failed to link document:', linkError);
      }
    }
  }

  return data;
}

// Fixed Assets
export async function getFixedAssets(businessProfileId: string): Promise<FixedAsset[]> {
  const { data, error } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createFixedAsset(asset: Omit<FixedAsset, 'id' | 'created_at' | 'updated_at'>): Promise<FixedAsset> {
  const { data, error } = await supabase
    .from('fixed_assets')
    .insert(asset)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFixedAsset(id: string, updates: Partial<FixedAsset>): Promise<FixedAsset> {
  const { data, error } = await supabase
    .from('fixed_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Depreciation
export async function calculateMonthlyDepreciation(assetId: string, periodDate: string): Promise<number> {
  const { data: asset, error } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) throw error;

  if (asset.depreciation_method === 'straight_line') {
    const monthlyDepreciation = asset.purchase_value / (asset.useful_life_years * 12);
    return monthlyDepreciation;
  }

  // Add declining balance method if needed
  return 0;
}

export async function createDepreciationEntry(entry: Omit<DepreciationEntry, 'id' | 'created_at'>): Promise<DepreciationEntry> {
  const { data, error } = await supabase
    .from('depreciation_entries')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Shareholders
export async function getShareholders(businessProfileId: string): Promise<Shareholder[]> {
  const { data, error } = await supabase
    .from('shareholders')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('share_percentage', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createShareholder(shareholder: Omit<Shareholder, 'id' | 'created_at' | 'updated_at'>): Promise<Shareholder> {
  const { data, error } = await supabase
    .from('shareholders')
    .insert(shareholder)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShareholder(id: string, updates: Partial<Shareholder>): Promise<Shareholder> {
  const { data, error } = await supabase
    .from('shareholders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getEquityTransactionWithDocument(transactionId: string): Promise<EquityTransaction & { documents?: any[] } | null> {
  const { data: transaction, error: transactionError } = await supabase
    .from('equity_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (transactionError) {
    console.error('Error fetching equity transaction:', transactionError);
    return null;
  }

  // Fetch associated documents
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('*')
    .eq('equity_transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (documentsError) {
    console.error('Error fetching documents:', documentsError);
    return transaction;
  }

  return {
    ...transaction,
    documents: documents || []
  };
}
