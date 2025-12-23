import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  Pen, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Invoice } from '@/types';

interface ExpenseListViewProps {
  expenses: Invoice[];
  selectedExpenses: Set<string>;
  isMultiSelectMode: boolean;
  onToggleSelection: (id: string, event?: React.MouseEvent) => void;
  onMarkAsPaid?: (id: string, expense: Invoice) => Promise<void>;
  onMarkAsUnpaid?: (id: string, expense: Invoice) => Promise<void>;
}

export const ExpenseListView: React.FC<ExpenseListViewProps> = ({
  expenses,
  selectedExpenses,
  isMultiSelectMode,
  onToggleSelection,
  onMarkAsPaid,
  onMarkAsUnpaid,
}) => {
  const navigate = useNavigate();

  const getUrgencyInfo = (expense: Invoice) => {
    if (!expense.dueDate) return null;
    
    const dueDate = new Date(expense.dueDate);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    const isPaid = (expense as any).isPaid || (expense as any).status === 'paid';
    
    if (isPaid) return null;
    
    if (daysUntilDue < 0) {
      return {
        type: 'overdue' as const,
        days: Math.abs(daysUntilDue),
        color: 'red',
        borderColor: 'border-l-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
      };
    } else if (daysUntilDue <= 7) {
      return {
        type: 'urgent' as const,
        days: daysUntilDue,
        color: 'orange',
        borderColor: 'border-l-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      };
    } else if (daysUntilDue <= 30) {
      return {
        type: 'upcoming' as const,
        days: daysUntilDue,
        color: 'blue',
        borderColor: 'border-l-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      };
    }
    
    return null;
  };

  const isReceived = (expense: Invoice) => {
    return typeof expense.id === 'string' && expense.id.startsWith('share-');
  };

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const urgency = getUrgencyInfo(expense);
        const received = isReceived(expense);
        const isPaid = (expense as any).isPaid || (expense as any).status === 'paid';
        const isSelected = selectedExpenses.has(expense.id);

        return (
          <Card
            key={expense.id}
            className={`transition-all hover:shadow-md cursor-pointer ${
              isSelected ? 'ring-2 ring-primary' : ''
            } ${urgency ? `border-l-4 ${urgency.borderColor} ${urgency.bgColor}` : ''} ${
              received && !isPaid ? 'border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-950/20' : ''
            }`}
            onClick={() => navigate(`/expense/${expense.id}`)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Checkbox for multi-select */}
                {isMultiSelectMode && (
                  <div className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(expense.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status icon */}
                    {urgency?.type === 'overdue' ? (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    ) : urgency?.type === 'urgent' ? (
                      <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    ) : isPaid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : received ? (
                      <ArrowDownCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}

                    {/* Title and badges */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <span className="font-semibold text-lg truncate">
                        {expense.description || expense.number || 'Wydatek'}
                      </span>
                      
                      {/* Status badges */}
                      {urgency?.type === 'overdue' && (
                        <Badge className="bg-red-600 text-white flex-shrink-0">
                          Przeterminowane {urgency.days} dni
                        </Badge>
                      )}
                      {urgency?.type === 'urgent' && (
                        <Badge className="bg-orange-500 text-white flex-shrink-0">
                          Termin za {urgency.days} dni
                        </Badge>
                      )}
                      {urgency?.type === 'upcoming' && (
                        <Badge className="bg-blue-500 text-white flex-shrink-0">
                          Za {urgency.days} dni
                        </Badge>
                      )}
                      {received && !isPaid && (
                        <Badge className="bg-blue-600 text-white flex-shrink-0">
                          <ArrowDownCircle className="h-3 w-3 mr-1" />
                          Otrzymana
                        </Badge>
                      )}
                      {isPaid && (
                        <Badge variant="outline" className="flex-shrink-0">
                          Zapłacona
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Vendor info */}
                  <p className="text-sm text-muted-foreground">
                    {received ? 'od: ' : ''}
                    <span className="font-medium">{expense.customerName || 'Brak kontrahenta'}</span>
                  </p>

                  {/* Date and amount row */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(expense.issueDate), 'dd MMM yyyy', { locale: pl })}
                    </div>
                    {expense.dueDate && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Termin: {format(new Date(expense.dueDate), 'dd MMM yyyy', { locale: pl })}
                      </div>
                    )}
                    <div className="font-semibold text-base text-foreground">
                      {formatCurrency(expense.amount || expense.totalGrossValue || 0)} PLN
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/expense/${expense.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Szczegóły
                  </Button>
                  
                  {received && !isPaid && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkAsPaid) onMarkAsPaid(expense.id, expense);
                        }}
                      >
                        Zatwierdź
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inbox/invoice/${expense.id}?section=discussion`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Dyskusja
                      </Button>
                    </>
                  )}
                  
                  {!received && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/expense/${expense.id}/edit`);
                        }}
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Edytuj
                      </Button>
                      
                      {isPaid ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (onMarkAsUnpaid) await onMarkAsUnpaid(expense.id, expense);
                          }}
                        >
                          Niezapłacone
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (onMarkAsPaid) await onMarkAsPaid(expense.id, expense);
                          }}
                        >
                          Zapłacone
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ExpenseListView;
