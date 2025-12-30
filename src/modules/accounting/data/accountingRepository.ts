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
  // Get all posted journal entries up to period end
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(*))')
    .eq('business_profile_id', businessProfileId)
    .eq('is_posted', true)
    .lte('entry_date', periodEnd);

  if (error) throw error;

  // Calculate balances by account type
  const balances: Record<string, number> = {};

  entries?.forEach(entry => {
    entry.lines?.forEach((line: any) => {
      const accountNumber = line.account.account_number;
      if (!balances[accountNumber]) {
        balances[accountNumber] = 0;
      }
      balances[accountNumber] += line.debit_amount - line.credit_amount;
    });
  });

  // Build balance sheet structure (simplified - you'll need to map specific accounts)
  const balanceSheet: BalanceSheetData = {
    assets: {
      current: {
        cash: balances['100'] || 0,
        accounts_receivable: balances['201'] || 0,
        inventory: balances['300'] || 0,
        other: 0,
        total: 0
      },
      fixed: {
        property: balances['010'] || 0,
        equipment: balances['020'] || 0,
        accumulated_depreciation: balances['071'] || 0,
        net: 0,
        total: 0
      },
      total: 0
    },
    liabilities: {
      current: {
        accounts_payable: balances['201'] || 0,
        short_term_debt: balances['240'] || 0,
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

export async function createEquityTransaction(transaction: Omit<EquityTransaction, 'id' | 'created_at' | 'updated_at'> & { 
  payment_method?: 'bank' | 'cash';
  cash_account_id?: string;
  bank_account_id?: string;
}): Promise<EquityTransaction> {
  const { data, error } = await supabase
    .from('equity_transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;

  // Create account movement if payment method is specified
  if (data && transaction.payment_method) {
    const paymentAccountId = transaction.payment_method === 'cash' 
      ? transaction.cash_account_id 
      : transaction.bank_account_id;

    if (paymentAccountId) {
      // Determine direction: capital_contribution is IN, withdrawals/dividends are OUT
      const direction = transaction.transaction_type === 'capital_contribution' ? 'IN' : 'OUT';

      await supabase
        .from('account_movements')
        .insert({
          business_profile_id: transaction.business_profile_id,
          payment_account_id: paymentAccountId,
          direction,
          amount: transaction.amount,
          currency: 'PLN',
          source_type: 'equity_transaction',
          source_id: data.id,
          description: transaction.description || `Zdarzenie kapitałowe: ${transaction.transaction_type}`,
        });
      
      // Log event for equity transaction
      try {
        await logEvent(
          transaction.business_profile_id,
          'capital_event',
          'equity_transaction',
          data.id,
          `Zdarzenie kapitałowe: ${transaction.transaction_type} - ${transaction.amount} PLN przez ${transaction.payment_method === 'cash' ? 'kasę' : 'bank'}`,
          {
            entityReference: `${transaction.transaction_type}-${data.id.substring(0, 8)}`,
            amount: transaction.amount,
            currency: 'PLN',
            changes: {
              transaction_type: transaction.transaction_type,
              amount: transaction.amount,
              payment_method: transaction.payment_method,
              payment_account_id: paymentAccountId,
              shareholder_name: transaction.shareholder_name,
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
