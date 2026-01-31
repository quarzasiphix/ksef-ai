// TypeScript types for journal entries and multi-line accounting

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed' | 'void';
export type JournalSourceType = 'invoice' | 'payment' | 'bank_transaction' | 'manual' | 'adjustment' | 'opening_balance';
export type JournalLineSide = 'debit' | 'credit';

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  side: JournalLineSide;
  amount_minor: number;  // Amount in grosze
  amount?: number;  // Amount in PLN (calculated)
  description?: string;
  line_number: number;
  project_id?: string;
  department_id?: string;
  cost_center?: string;
  tags?: string[];
  created_at?: string;
}

export interface JournalEntry {
  id: string;
  business_profile_id: string;
  period_id?: string;
  
  // Source tracking
  source_type: JournalSourceType;
  source_id?: string;
  
  // Entry details
  entry_date: string;
  description: string;
  reference_number?: string;
  
  // Status
  entry_status: JournalEntryStatus;
  posted_at?: string;
  posted_by?: string;
  
  // Reversal
  reversed_at?: string;
  reversed_by?: string;
  reversal_of?: string;
  reversal_reason?: string;
  
  // Audit
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  
  // Metadata
  notes?: string;
  tags?: string[];
  
  // Related data
  lines?: JournalLine[];
  total_debits?: number;
  total_credits?: number;
}

export interface CreateJournalLineInput {
  account_id: string;
  side: JournalLineSide;
  amount: number;  // In PLN
  description?: string;
  line_number: number;
}

export interface CreateJournalEntryInput {
  business_profile_id: string;
  source_type: JournalSourceType;
  source_id?: string;
  entry_date: string;
  description: string;
  reference_number?: string;
  notes?: string;
  lines: CreateJournalLineInput[];
}

export interface PostingValidationError {
  field: string;
  message: string;
}

export interface PostingValidationResult {
  valid: boolean;
  errors: PostingValidationError[];
  warnings?: string[];
  total_debits: number;
  total_credits: number;
  difference: number;
}

// Helper to convert PLN to grosze
export function plnToGrosze(pln: number): number {
  return Math.round(pln * 100);
}

// Helper to convert grosze to PLN
export function groszeToPln(grosze: number): number {
  return grosze / 100;
}

// Validate journal entry balance
export function validateJournalBalance(lines: CreateJournalLineInput[]): PostingValidationResult {
  const errors: PostingValidationError[] = [];
  const warnings: string[] = [];
  
  // Check for empty lines
  if (lines.length === 0) {
    errors.push({ field: 'lines', message: 'At least one line is required' });
  }
  
  // Check for at least one debit and one credit
  const hasDebit = lines.some(l => l.side === 'debit');
  const hasCredit = lines.some(l => l.side === 'credit');
  
  if (!hasDebit) {
    errors.push({ field: 'lines', message: 'At least one debit line is required' });
  }
  
  if (!hasCredit) {
    errors.push({ field: 'lines', message: 'At least one credit line is required' });
  }
  
  // Calculate totals
  const total_debits = lines
    .filter(l => l.side === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  
  const total_credits = lines
    .filter(l => l.side === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);
  
  const difference = Math.abs(total_debits - total_credits);
  
  // Check balance (allow 0.01 PLN difference for rounding)
  if (difference > 0.01) {
    errors.push({ 
      field: 'balance', 
      message: `Entry is not balanced: debits (${total_debits.toFixed(2)}) != credits (${total_credits.toFixed(2)})` 
    });
  }
  
  // Check for zero amounts
  const hasZeroAmount = lines.some(l => l.amount <= 0);
  if (hasZeroAmount) {
    errors.push({ field: 'lines', message: 'All line amounts must be greater than zero' });
  }
  
  // Check for duplicate line numbers
  const lineNumbers = lines.map(l => l.line_number);
  const uniqueLineNumbers = new Set(lineNumbers);
  if (lineNumbers.length !== uniqueLineNumbers.size) {
    errors.push({ field: 'lines', message: 'Duplicate line numbers found' });
  }
  
  // Warnings
  if (lines.length > 20) {
    warnings.push('Entry has more than 20 lines - consider splitting into multiple entries');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    total_debits,
    total_credits,
    difference
  };
}
