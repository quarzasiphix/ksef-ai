import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Invoice, InvoiceType } from '@/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGlobalData } from '@/hooks/use-global-data';
import { useBusinessProfile } from "@/context/BusinessProfileContext";

// ExpenseList component for displaying a list of expenses
export default function ExpenseList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { invoices: { data: allInvoices, isLoading: isLoadingInvoices }, expenses: { data: allExpenses, isLoading: isLoadingExpenses } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();

  useEffect(() => {
    if (allInvoices) {
      // Debug: Log the first invoice to see its structure
      if (allInvoices.length > 0) {
        console.log('First invoice structure:', {
          ...allInvoices[0],
          // Get all keys including those in the prototype chain
          allKeys: [...Object.keys(allInvoices[0]), ...Object.getOwnPropertyNames(Object.getPrototypeOf(allInvoices[0]))]
        });
      }
      
      // Filter for expense transactions for the selected profile only
      const filteredExpenses = allExpenses?.filter(expense => {
        // Filter by selected business profile
        if (!selectedProfileId || expense.businessProfileId !== selectedProfileId) return false;
        
        // Safely get the transaction type regardless of case or property name
        const transactionType = (
          expense.transactionType ||
          (expense as any).transaction_type
        )?.toString().toLowerCase();
        
        return transactionType === 'expense';
      }) || []; // Provide a default empty array if allExpenses is null/undefined
      
      console.log('Filtered expense invoices:', filteredExpenses);
      setInvoices(filteredExpenses);
    }
  }, [allInvoices, allExpenses, selectedProfileId]);
  
  const isLoading = isLoadingInvoices || isLoadingExpenses;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wydatki</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami i rachunkami kosztowymi
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/expense/new?type=sales"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nowy wydatek
          </Link>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Brak zarejestrowanych wydatków</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Brak wyników wyszukiwania' : 'Dodaj swój pierwszy wydatek'}
            </p>
            <Link
              to="/expense/new"
              className="inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nowy wydatek
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontrahent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kwota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Akcje</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.number || 'Brak numeru'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: pl })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.buyer?.name || invoice.customerName || 'Brak danych'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(invoice.totalGrossValue || 0).toFixed(2)} zł
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.paid || invoice.isPaid
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.paid || invoice.isPaid ? 'Zapłacono' : 'Do zapłaty'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <Link
                      to={`/expense/${invoice.id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Podgląd
                    </Link>
                    <Link
                      to={`/expense/${invoice.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edytuj
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}