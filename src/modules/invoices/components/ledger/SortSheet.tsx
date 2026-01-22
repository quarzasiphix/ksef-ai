import React from 'react';
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

  const getGroupingClasses = (baseClasses: string, isSubGrouping: boolean) =>
    cn(
      baseClasses,
      isSubGrouping && 'border border-dashed border-primary/40 bg-primary/5 text-primary'
    );

  const renderStackedContent = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Grupowanie</h3>
        <div className="space-y-2">
          {groupingOptions.map((option) => {
            const Icon = option.icon;
            const isActive = groupingMode === option.mode && subGroupingMode === option.subMode;
            const isSubGrouping = option.subMode !== 'none';

            return (
              <Button
                key={`${option.mode}-${option.subMode}`}
                variant={isActive ? "default" : "outline"}
                className={getGroupingClasses('w-full justify-start gap-3 h-12', isSubGrouping)}
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

  const renderDesktopContent = () => (
    <div className="px-6 py-4">
      <div className="hidden lg:flex flex-wrap gap-8 items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Grupowanie</h3>
          <div className="flex flex-wrap gap-2">
            {groupingOptions.map((option) => {
              const Icon = option.icon;
              const isActive = groupingMode === option.mode && subGroupingMode === option.subMode;
              const isSubGrouping = option.subMode !== 'none';

              return (
                <Button
                  key={`${option.mode}-${option.subMode}`}
                  variant={isActive ? "default" : "outline"}
                  className={getGroupingClasses('gap-2 h-10 px-3', isSubGrouping)}
                  onClick={() => onGroupingModeChange(option.mode, option.subMode)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-foreground text-sm">{option.label}</span>
                  {isActive && (
                    <Badge variant="secondary" className="ml-1">
                      Aktywne
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Sortowanie</h3>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = sortBy === option.value;

              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  className="gap-2 h-10 px-3"
                  onClick={() => onSortByChange(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-foreground text-sm">{option.label}</span>
                  {isActive && (
                    <Badge variant="secondary" className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Kierunek sortowania</h3>
          <div className="flex gap-2">
            <Button
              variant={sortOrder === 'desc' ? "default" : "outline"}
              className="gap-2 h-10 px-3"
              onClick={() => onSortOrderChange('desc')}
            >
              <ArrowUpDown className="h-4 w-4 rotate-180" />
              <span className="text-foreground text-sm">Malejąco</span>
              {sortOrder === 'desc' && (
                <Badge variant="secondary" className="ml-1">
                  Aktywne
                </Badge>
              )}
            </Button>

            <Button
              variant={sortOrder === 'asc' ? "default" : "outline"}
              className="gap-2 h-10 px-3"
              onClick={() => onSortOrderChange('asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-foreground text-sm">Rosnąco</span>
              {sortOrder === 'asc' && (
                <Badge variant="secondary" className="ml-1">
                  Aktywne
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            Resetuj
          </Button>
        </div>
      </div>

      <div className="lg:hidden space-y-6 mt-6">
        {renderStackedContent()}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Resetuj
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Zastosuj
          </Button>
        </div>
      </div>
    </div>
  );

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

          <div className="flex-1 overflow-y-auto py-4">
            {renderStackedContent()}
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      key="sort-panel"
      className={cn(
        'transition-all duration-200',
        isOpen ? 'border-b bg-background' : 'pointer-events-none opacity-0'
      )}
    >
      {renderDesktopContent()}
    </div>
  );
}
