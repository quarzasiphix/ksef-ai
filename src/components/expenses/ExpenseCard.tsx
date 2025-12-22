import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { formatCurrency } from "@/lib/invoice-utils";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { TransactionType } from "@/types";

export interface ExpenseSummary {
  id: string;
  issueDate: string;
  amount: number;
  description?: string;
  customerName?: string;
  transactionType: TransactionType;
  linkedInvoiceId?: string | null;
  isShared?: boolean;
}

const ExpenseCard: React.FC<{ expense: ExpenseSummary }> = ({ expense }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (expense.isShared && expense.linkedInvoiceId) {
      navigate(`/expense/share/${expense.linkedInvoiceId}`);
      return;
    }
    navigate(`/expense/${expense.id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-colors"
      onClick={handleNavigate}
    >
      <CardContent className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">
          {format(new Date(expense.issueDate), "dd.MM.yyyy", { locale: pl })}
        </div>
        <h3 className="font-semibold truncate">
          {expense.description || "Wydatek"}
        </h3>
        {expense.customerName && (
          <p className="text-xs text-muted-foreground truncate">
            {expense.customerName}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
          {!expense.isShared && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/expense/${expense.id}/edit`);
              }}
              className="text-muted-foreground hover:text-primary"
              title="Edytuj"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseCard;