import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Invoice, InvoiceType } from '@/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGlobalData } from '@/hooks/use-global-data';
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Button } from "@/components/ui/button";
import ExpenseCard from '@/components/expenses/ExpenseCard';

const ZUS_NIP = "5220005994";
const ZUS_NAME = "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH";

// ExpenseList component for displaying a list of expenses
export default function ExpenseList() {
  const [searchTerm, setSearchTerm] = useState("");

  const { expenses: { data: allExpenses = [], isLoading: isLoadingExpenses } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const navigate = useNavigate();

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];

    const list = allExpenses.filter(expense => {
      const isShared = typeof expense.id === 'string' && expense.id.startsWith('share-');

      // Apply business profile filter only to own expenses; always include shared ones
      if (!isShared && selectedProfileId && expense.businessProfileId !== selectedProfileId) {
        return false;
      }

      const type = (expense.transactionType || (expense as any).transaction_type || "").toString().toLowerCase();
      return type === "expense";
    });

    console.log("Filtered expenses count:", list.length);
    return list;
  }, [allExpenses, selectedProfileId]);

  const isLoading = isLoadingExpenses;

  const handleAddZus = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const desc = `ZUS składka ${month}/${year}`;
    const date = today.toISOString().slice(0, 10);
    navigate(`/expense/new?zus=1&desc=${encodeURIComponent(desc)}&date=${date}`);
  };

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
          <Button asChild>
            <Link
              to="/expense/new"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nowy wydatek
            </Link>
          </Button>
          <Button variant="outline" onClick={handleAddZus}>
            Dodaj ZUS
          </Button>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredExpenses.map(exp => (
            <ExpenseCard
              key={exp.id}
              expense={{
                id: exp.id,
                issueDate: exp.issueDate,
                amount: exp.amount || exp.totalGrossValue || 0,
                description: exp.description,
                customerName: exp.customerName || (exp as any).buyer?.name
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}