import { supabase } from '../client';
import { Expense, TransactionType } from '../../../types';
import { useAuth } from '@/App';
import { format } from 'date-fns';

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
    .from('expenses') // Assuming your expenses table is named 'expenses'
    .select('*') // Select all columns for now, can be optimized later
    .eq('user_id', userId);

  if (businessProfileId) {
    query = query.eq('business_profile_id', businessProfileId);
  }

  if (period) {
    const { startDate, endDate } = getPeriodDates(period);
    // Assuming 'issue_date' is the column to filter by period
    query = query.gte('issue_date', startDate).lte('issue_date', endDate);
  }

  const { data, error } = await query.order("issue_date", { ascending: false }); // Assuming an issue_date field for ordering

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  // If no data is returned or data is not an array, return an empty array
  if (!data || !Array.isArray(data)) {
    console.error("Supabase returned data in unexpected format or no data for expenses:", data);
    return [];
  }

  // Map the raw data to the Expense interface
  // Assuming Expense type has fields like id, user_id, business_profile_id, issue_date, amount, currency, description, created_at
  return data.map((dbExpense: any) => ({
    id: dbExpense.id,
    userId: dbExpense.user_id,
    businessProfileId: dbExpense.business_profile_id,
    issueDate: dbExpense.issue_date,
    amount: Number(dbExpense.amount) || 0,
    currency: dbExpense.currency || 'PLN',
    description: dbExpense.description || '',
    createdAt: dbExpense.created_at,
    // Add other fields as per your Expense type and database schema
    // For now, we are assuming a basic structure based on the SQL provided.
    // You might need to adjust this mapping based on your actual Expense type definition.
    transactionType: TransactionType.EXPENSE, // Assuming all fetched here are expenses
    date: dbExpense.issue_date, // Alias for compatibility if needed
  }));
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