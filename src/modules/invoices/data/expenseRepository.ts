import { supabase } from '../../../integrations/supabase/client';
import { Expense, TransactionType } from '../../../shared/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { format } from 'date-fns';
import { InvoiceType } from "@/shared/types";
import { getInvoiceSharesReceived } from './invoiceShareRepository';

// Function to get start and end dates based on selected period - Duplicated from Accounting.tsx for now
const getPeriodDates = (period: string): { startDate: string, endDate: string } => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (period) {
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      break;
    case 'last_quarter':
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
      endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      // Default to this month if period is not recognized
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Format dates to YYYY-MM-DD for easier comparison/filtering
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
};

export const getExpenses = async (userId: string, businessProfileId?: string, period?: string) => {
  if (!userId) {
    console.error("No user ID provided to getExpenses");
    return [];
  }

  let query = supabase
    .from('invoices') // Query invoices table with transaction_type = 'expense'
    .select(`
      *,
      customers(name)
    `)
    .eq('transaction_type', 'expense')
    .eq('user_id', userId);

  if (businessProfileId) {
    query = query.eq('business_profile_id', businessProfileId);
  }

  if (period) {
    const { startDate, endDate } = getPeriodDates(period);
    // Use issue_date for expenses (invoice_date doesn't exist)
    query = query.gte('issue_date', startDate).lte('issue_date', endDate);
  }

  const { data, error } = await query.order("issue_date", { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  // If no data is returned or data is not an array, return an empty array
  if (!data || !Array.isArray(data)) {
    console.error("Supabase returned data in unexpected format or no data for expenses:", data);
    return [];
  }

  console.log(`[getExpenses] Fetched ${data.length} expenses for businessProfileId: ${businessProfileId || 'ALL'}`);
  if (data.length > 0) {
    console.log('[getExpenses] Sample expense business_profile_id:', data[0]?.business_profile_id);
  }

  /* -------------------------------------------------------------
     Fetch invoices shared with this user and convert to expenses
  --------------------------------------------------------------*/
  let receivedShares: any[] = [];
  try {
    receivedShares = await getInvoiceSharesReceived(userId);
  } catch (shareErr) {
    console.warn('Unable to fetch received invoice shares:', shareErr?.message || shareErr);
  }

  const sharedExpenses: Expense[] = (receivedShares || []).map((share) => {
    const inv = share.invoices;
    if (!inv) return null;
    return {
      id: share.id,
      userId,
      businessProfileId: share.receiver_business_profile_id || inv.business_profiles?.id || '',
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      amount: Number(inv.total_gross_value) || 0,
      currency: inv.currency || 'PLN',
      description: `Faktura od ${inv.customers?.name || inv.business_profiles?.name || 'kontrahenta'} (${inv.number})`,
      customerName: inv.customers?.name || inv.business_profiles?.name || null,
      counterpartyName: inv.customers?.name || inv.business_profiles?.name || null,
      createdAt: share.shared_at,
      transactionType: TransactionType.EXPENSE,
      date: inv.issue_date,
      linkedInvoiceId: share.invoice_id,
      isShared: true,
      shareId: share.id,
    } as Expense;
  }).filter(Boolean) as Expense[];

  // Map the raw data to the Expense interface
  // Map invoice data to expense format
  const mappedExpenses = data.map((dbInvoice: any) => ({
    id: dbInvoice.id,
    userId: dbInvoice.user_id,
    businessProfileId: dbInvoice.business_profile_id,
    issueDate: dbInvoice.issue_date,
    dueDate: dbInvoice.due_date,
    amount: Number(dbInvoice.total_gross_value) || 0,
    currency: dbInvoice.currency || 'PLN',
    description: dbInvoice.description || '',
    customerName: dbInvoice.customers?.name || null,
    counterpartyName: dbInvoice.customers?.name || null,
    createdAt: dbInvoice.created_at,
    // Map invoice fields to expense interface
    transactionType: TransactionType.EXPENSE,
    date: dbInvoice.issue_date, // Use issue_date for expenses (invoice_date doesn't exist)
    linkedInvoiceId: null,
    isShared: false,
    // Additional invoice fields
    number: dbInvoice.number,
    totalNetValue: Number(dbInvoice.total_net_value) || 0,
    totalGrossValue: Number(dbInvoice.total_gross_value) || 0,
    totalVatValue: Number(dbInvoice.total_vat_value) || 0,
    isPaid: dbInvoice.is_paid || false,
    paid: dbInvoice.is_paid || false,
    status: dbInvoice.status,
    paymentMethod: dbInvoice.payment_method,
    items: dbInvoice.invoice_items || [],
  }));

  // Combine real expenses with shared ones
  return [...mappedExpenses, ...sharedExpenses];
};

export const saveExpense = async (expense: Omit<Expense, 'id' | 'createdAt'> & { id?: string }) => {
  const payload: any = {
    user_id: expense.userId,
    transaction_type: 'expense',
    issue_date: expense.issueDate,
    due_date: expense.dueDate,
    total_gross_value: expense.amount,
    total_net_value: (expense as any).totalNetValue || (expense.amount * 0.77), // Approximate if not provided
    total_vat_value: (expense as any).totalVatValue || (expense.amount * 0.23), // Approximate if not provided
    currency: expense.currency || 'PLN',
    description: expense.description || '',
    customer_id: (expense as any).customerId || null,
    number: (expense as any).number || `EXP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    status: 'draft',
    is_paid: (expense as any).isPaid || false,
    payment_method: (expense as any).paymentMethod || 'gotówka',
    // Additional optional fields below
  };

  if (expense.businessProfileId) {
    payload.business_profile_id = expense.businessProfileId;
  }

  let expenseId = expense.id;
  let data;

  if (expense.id) {
    // Update existing expense
    const updateRes = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', expense.id)
      .select()
      .single();
    if (updateRes.error) throw updateRes.error;
    data = updateRes.data;
    expenseId = data.id;
    // Remove old items
    await supabase.from('invoice_items').delete().eq('invoice_id', expenseId);
  } else {
    // Insert new expense
    const insertRes = await supabase
      .from('invoices')
      .insert(payload)
      .select()
      .single();
    if (insertRes.error) throw insertRes.error;
    data = insertRes.data;
    expenseId = data.id;
  }

  // Insert items if provided
  if (expense.items && expense.items.length > 0) {
    const itemsPayload = expense.items.map(item => ({
      expense_id: expenseId,
      product_id: item.productId || null,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: Number(item.vatRate) ?? 0,
      unit: item.unit || 'szt.',
      total_net_value: item.totalNetValue ?? 0,
      total_gross_value: item.totalGrossValue ?? 0,
      total_vat_value: item.totalVatValue ?? 0,
      vat_exempt: item.vatExempt ?? false,
    }));
    const { error: itemsError } = await supabase.from('expense_items').insert(itemsPayload as any);
    if (itemsError) throw itemsError;
  }

  return data;
};

export const getExpense = async (id: string) => {
  // Fetch the expense along with its related items in a single query
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;

  if (!data) throw new Error('Expense not found');

  // Cast to any for flexible property access
  const dbExpense: any = data;

  // Map expense_items rows to the shared InvoiceItem shape
  let mappedItems = (dbExpense.expense_items || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name || 'Pozycja',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unit_price) || 0,
    vatRate: Number(item.vat_rate) ?? 0,
    unit: item.unit || 'szt.',
    totalNetValue: Number(item.total_net_value) || 0,
    totalGrossValue: Number(item.total_gross_value) || 0,
    totalVatValue: Number(item.total_vat_value) || 0,
    vatExempt: item.vat_exempt ?? false,
  }));

  // If there are no item rows, create a synthetic one based on the amount field
  if (mappedItems.length === 0) {
    const amount = Number(dbExpense.amount) || 0;
    mappedItems = [
      {
        id: `synthetic-${dbExpense.id}`,
        name: dbExpense.description || 'Wydatek',
        quantity: 1,
        unitPrice: amount,
        vatRate: 0,
        unit: 'szt.',
        totalNetValue: amount,
        totalGrossValue: amount,
        totalVatValue: 0,
        vatExempt: true,
      },
    ];
  }

  return {
    // Original DB columns (camelCased where needed)
    id: dbExpense.id,
    user_id: dbExpense.user_id,
    businessProfileId: dbExpense.business_profile_id,
    issueDate: dbExpense.issue_date,
    amount: Number(dbExpense.amount) || 0,
    currency: dbExpense.currency || 'PLN',
    description: dbExpense.description || '',
    created_at: dbExpense.created_at,
    customerId: dbExpense.customer_id || null,

    // Fields expected by InvoiceDetail & other invoice-centric components
    items: mappedItems,
    number: dbExpense.number || `EXP-${dbExpense.id.slice(0, 6)}`,
    type: InvoiceType.SALES, // Treat expenses like normal VAT invoices for display purposes
    transactionType: TransactionType.EXPENSE,
    dueDate: dbExpense.due_date || dbExpense.issue_date,
    sellDate: dbExpense.issue_date,
    date: dbExpense.issue_date,
    paymentMethod: dbExpense.payment_method || 'cash',
    isPaid: dbExpense.is_paid ?? false,
    paid: dbExpense.paid ?? false,
    status: dbExpense.status || 'paid',
    comments: dbExpense.comments || '',
    totalNetValue: mappedItems.reduce((acc: number, it: any) => acc + (it.totalNetValue || 0), 0),
    totalVatValue: mappedItems.reduce((acc: number, it: any) => acc + (it.totalVatValue || 0), 0),
    totalGrossValue: mappedItems.reduce((acc: number, it: any) => acc + (it.totalGrossValue || 0), 0),
    totalAmount: Number(dbExpense.amount) || 0,
    ksef: dbExpense.ksef || { status: 'none' },
    businessName: dbExpense.business_name || undefined,
    customerName: dbExpense.customer_name || undefined,
    vat: dbExpense.vat ?? false,
    vatExemptionReason: dbExpense.vat_exemption_reason || undefined,
  };
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// You would also need functions for saving, getting a single, and deleting expenses
// based on your application's requirements, similar to invoiceRepository.

// Example placeholder for saveExpense (you would need to implement this fully)
/*
export async function saveExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'date'> & { id?: string }): Promise<Expense> {
  console.log('saveExpense called with:', expense);
  // Implementation for inserting or updating an expense
  return {} as Expense; // Placeholder return
}
*/
