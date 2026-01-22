import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/shared/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { cn } from '@/shared/lib/utils';
import { ArrowUpDown, Calendar, DollarSign, FileText, Users } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';

type GroupingMode = 'month' | 'quarter' | 'year';
type SubGroupingMode = 'none' | 'month' | 'quarter';
type SortBy = 'date' | 'amount' | 'number' | 'customer';
type SortOrder = 'asc' | 'desc';

interface SortSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupingMode: GroupingMode;
  subGroupingMode: SubGroupingMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onGroupingModeChange: (mode: GroupingMode, subMode: SubGroupingMode) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onReset: () => void;
}

export function SortSheet({
  isOpen,
  onOpenChange,
  groupingMode,
  subGroupingMode,
  sortBy,
  sortOrder,
  onGroupingModeChange,
  onSortByChange,
  onSortOrderChange,
  onReset,
}: SortSheetProps) {
  const isMobile = useIsMobile();

  const handleApply = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  const groupingOptions = [
    { mode: 'month' as GroupingMode, subMode: 'none' as SubGroupingMode, label: 'Grupuj po miesiącach', icon: Calendar },
    { mode: 'quarter' as GroupingMode, subMode: 'none' as SubGroupingMode, label: 'Grupuj po kwartałach', icon: Calendar },
    { mode: 'quarter' as GroupingMode, subMode: 'month' as SubGroupingMode, label: 'Grupuj po kwartałach → miesiącach', icon: Calendar },
    { mode: 'year' as GroupingMode, subMode: 'none' as SubGroupingMode, label: 'Grupuj po latach', icon: Calendar },
    { mode: 'year' as GroupingMode, subMode: 'quarter' as SubGroupingMode, label: 'Grupuj po latach → kwartałach', icon: Calendar },
  ];

  const sortOptions = [
    { value: 'date' as SortBy, label: 'Sortuj po dacie', icon: Calendar },
    { value: 'amount' as SortBy, label: 'Sortuj po kwocie', icon: DollarSign },
    { value: 'number' as SortBy, label: 'Sortuj po numerze', icon: FileText },
    { value: 'customer' as SortBy, label: 'Sortuj po kliencie', icon: Users },
  ];

  const content = (
    <div className="space-y-6 p-4">
      {/* Grupowanie Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Grupowanie</h3>
        <div className="space-y-2">
          {groupingOptions.map((option) => {
            const Icon = option.icon;
            const isActive = groupingMode === option.mode && subGroupingMode === option.subMode;
            
            return (
              <Button
                key={`${option.mode}-${option.subMode}`}
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => onGroupingModeChange(option.mode, option.subMode)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-foreground">{option.label}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-auto">
                    Aktywne
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Sortowanie Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Sortowanie</h3>
        <div className="space-y-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isActive = sortBy === option.value;
            
            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => onSortByChange(option.value)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-foreground">{option.label}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-auto">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Kierunek sortowania Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Kierunek sortowania</h3>
        <div className="space-y-2">
          <Button
            variant={sortOrder === 'desc' ? "default" : "outline"}
            className="w-full justify-start gap-3 h-12"
            onClick={() => onSortOrderChange('desc')}
          >
            <ArrowUpDown className="h-4 w-4 rotate-180" />
            <span className="text-foreground">Malejąco (najnowsze/największe)</span>
            {sortOrder === 'desc' && (
              <Badge variant="secondary" className="ml-auto">
                Aktywne
              </Badge>
            )}
          </Button>
          
          <Button
            variant={sortOrder === 'asc' ? "default" : "outline"}
            className="w-full justify-start gap-3 h-12"
            onClick={() => onSortOrderChange('asc')}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="text-foreground">Rosnąco (najstarsze/najmniejsze)</span>
            {sortOrder === 'asc' && (
              <Badge variant="secondary" className="ml-auto">
                Aktywne
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <ArrowUpDown className="h-5 w-5" />
              Sortowanie i grupowanie
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1">
            {content}
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={handleReset}>
              Resetuj
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Zastosuj
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleContent className="border-b space-y-4">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
