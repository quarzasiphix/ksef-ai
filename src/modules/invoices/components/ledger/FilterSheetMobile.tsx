import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/lib/utils';

type SmartFilter = 'all' | 'unpaid_issued' | 'paid_not_booked' | 'booked_not_reconciled' | 'overdue';
type DocumentTypeFilter = 'all' | 'invoice' | 'receipt' | 'proforma' | 'correction';

interface FilterSheetMobileProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  smartFilter: SmartFilter;
  documentTypeFilter: DocumentTypeFilter;
  onSmartFilterChange: (filter: SmartFilter) => void;
  onDocumentTypeFilterChange: (filter: DocumentTypeFilter) => void;
  onReset: () => void;
  isIncome?: boolean;
}

export function FilterSheetMobile({
  isOpen,
  onOpenChange,
  smartFilter,
  documentTypeFilter,
  onSmartFilterChange,
  onDocumentTypeFilterChange,
  onReset,
  isIncome = true,
}: FilterSheetMobileProps) {
  const hasActiveFilters = smartFilter !== 'all' || documentTypeFilter !== 'all';

  const handleApply = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filtry</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(80vh-160px)]">
          {/* Status filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Status księgowy</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={smartFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSmartFilterChange('all')}
                className="flex-1 min-w-[120px]"
              >
                Wszystkie
              </Button>
              <Button
                variant={smartFilter === 'unpaid_issued' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSmartFilterChange('unpaid_issued')}
                className="flex-1 min-w-[120px]"
              >
                <Badge variant="secondary" className="mr-1 text-xs">⏳</Badge>
                Nieopłacone
              </Button>
              <Button
                variant={smartFilter === 'paid_not_booked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSmartFilterChange('paid_not_booked')}
                className="flex-1 min-w-[120px]"
              >
                <Badge variant="secondary" className="mr-1 text-xs">⚠️</Badge>
                Niezaksięgowane
              </Button>
              <Button
                variant={smartFilter === 'booked_not_reconciled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSmartFilterChange('booked_not_reconciled')}
                className="flex-1 min-w-[120px]"
              >
                <Badge variant="secondary" className="mr-1 text-xs">📘</Badge>
                Zaksięgowane
              </Button>
              <Button
                variant={smartFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSmartFilterChange('overdue')}
                className="flex-1 min-w-[120px]"
              >
                <Badge variant="secondary" className="mr-1 text-xs bg-red-100 text-red-700">🔴</Badge>
                Zaległe
              </Button>
            </div>
          </div>

          {/* Document type filters (only for income) */}
          {isIncome && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Typ dokumentu</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={documentTypeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDocumentTypeFilterChange('all')}
                  className="flex-1 min-w-[100px]"
                >
                  Wszystkie
                </Button>
                <Button
                  variant={documentTypeFilter === 'invoice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDocumentTypeFilterChange('invoice')}
                  className="flex-1 min-w-[100px]"
                >
                  Faktury VAT
                </Button>
                <Button
                  variant={documentTypeFilter === 'receipt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDocumentTypeFilterChange('receipt')}
                  className="flex-1 min-w-[100px]"
                >
                  Rachunki
                </Button>
                <Button
                  variant={documentTypeFilter === 'proforma' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDocumentTypeFilterChange('proforma')}
                  className="flex-1 min-w-[100px]"
                >
                  Proforma
                </Button>
                <Button
                  variant={documentTypeFilter === 'correction' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDocumentTypeFilterChange('correction')}
                  className="flex-1 min-w-[100px]"
                >
                  Korekty
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={!hasActiveFilters}
          >
            Wyczyść
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
          >
            Zastosuj
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
