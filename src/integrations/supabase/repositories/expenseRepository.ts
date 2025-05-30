import { supabase } from '../client';
import type { Expense, TransactionType } from '@/types';
import { useAuth } from '@/App';

export const getExpenses = async (userId: string, businessProfileId?: string) => {
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