import { useState, useMemo, useEffect } from 'react';
import { Invoice } from '@/shared/types';
import { groupInvoicesByPeriod, groupInvoicesByQuarter, groupInvoicesByYear, getAvailableYears, MonthGroup, QuarterGroup, YearOnlyGroup, GroupingMode } from '@/shared/lib/ledger-utils';
import { PeriodNavigator } from './PeriodNavigator';
import { MonthGroupHeader } from './MonthGroupHeader';
import { MonthGroupHeaderMobile } from './MonthGroupHeaderMobile';
import { QuarterGroupHeader } from './QuarterGroupHeader';
import { YearGroupHeader } from './YearGroupHeader';
import { LedgerRow } from './LedgerRow';
import { LedgerRowMobile } from './LedgerRowMobile';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface LedgerViewProps {
  invoices: Invoice[];
  isIncome?: boolean;
  onView?: (id: string) => void;
  onPreview?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePaid?: (id: string, invoice: Invoice) => void;
}

export function LedgerView({
  invoices,
  isIncome = true,
  onView,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onShare,
  onDuplicate,
  onTogglePaid,
}: LedgerViewProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('month');
  const isMobile = useIsMobile();

  const years = useMemo(() => getAvailableYears(invoices), [invoices]);
  
  const yearGroups = useMemo(() => {
    const groups = groupInvoicesByPeriod(invoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [invoices, selectedYear]);

  const quarterGroups = useMemo(() => {
    const groups = groupInvoicesByQuarter(invoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [invoices, selectedYear]);

  const yearOnlyGroups = useMemo(() => {
    const groups = groupInvoicesByYear(invoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [invoices, selectedYear]);

  // Auto-expand last 3 months by default
  useEffect(() => {
    if (yearGroups.length > 0 && expandedMonths.size === 0) {
      const lastThreeMonths = new Set<string>();
      const currentDate = new Date();
      
      // Get the last 3 months including current month
      for (let i = 0; i < 3; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // getMonth() is 0-indexed
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        // Check if this month exists in our data
        const monthExists = yearGroups.some(group => 
          group.year === year && group.months.some(month => month.key === monthKey)
        );
        
        if (monthExists) {
          lastThreeMonths.add(monthKey);
        }
      }
      
      if (lastThreeMonths.size > 0) {
        setExpandedMonths(lastThreeMonths);
      }
    }
  }, [yearGroups, expandedMonths.size]);

  const allMonthKeys = useMemo(() => {
    if (groupingMode === 'month') {
      return yearGroups.flatMap(yg => yg.months.map(m => m.key));
    } else if (groupingMode === 'quarter') {
      return quarterGroups.flatMap(yg => yg.quarters.map(q => q.key));
    } else {
      return yearOnlyGroups.map(y => y.key);
    }
  }, [yearGroups, quarterGroups, yearOnlyGroups, groupingMode]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMonths(new Set(allMonthKeys));
  };

  const collapseAll = () => {
    setExpandedMonths(new Set());
  };

  const hasExpandedMonths = expandedMonths.size > 0;

  return (
    <div className="space-y-4">
      {!isMobile && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PeriodNavigator
              years={years}
              selectedYear={selectedYear}
              onYearSelect={setSelectedYear}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Grupuj: {groupingMode === 'month' ? 'Miesiąc' : groupingMode === 'quarter' ? 'Kwartał' : 'Rok'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setGroupingMode('month')}>
                  Grupuj po miesiącach
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupingMode('quarter')}>
                  Grupuj po kwartałach
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupingMode('year')}>
                  Grupuj po latach
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={hasExpandedMonths ? collapseAll : expandAll}
            className="gap-2"
          >
            {hasExpandedMonths ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Zwiń wszystko
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Rozwiń wszystko
              </>
            )}
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Brak dokumentów do wyświetlenia
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groupingMode === 'month' && yearGroups.map(yearGroup => (
              <div key={yearGroup.year}>
                {yearGroup.months.map(month => {
                  const isExpanded = expandedMonths.has(month.key);
                  const HeaderComponent = isMobile ? MonthGroupHeaderMobile : MonthGroupHeader;
                  const RowComponent = isMobile ? LedgerRowMobile : LedgerRow;
                  
                  return (
                    <div key={month.key}>
                      <HeaderComponent
                        label={month.label}
                        sum={month.sum}
                        isExpanded={isExpanded}
                        onToggle={() => toggleMonth(month.key)}
                        invoiceCount={month.invoices.length}
                      />
                      
                      {isExpanded && (
                        <div className={isMobile ? '' : 'bg-muted/20'}>
                          {month.invoices.map(invoice => (
                            <RowComponent
                              key={invoice.id}
                              invoice={invoice}
                              isIncome={isIncome}
                              onView={onView}
                              onPreview={onPreview}
                              onDownload={onDownload}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onShare={onShare}
                              onDuplicate={onDuplicate}
                              onTogglePaid={onTogglePaid}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {groupingMode === 'quarter' && quarterGroups.map(yearGroup => (
              <div key={yearGroup.year}>
                {yearGroup.quarters.map(quarter => {
                  const isExpanded = expandedMonths.has(quarter.key);
                  const RowComponent = isMobile ? LedgerRowMobile : LedgerRow;
                  
                  return (
                    <div key={quarter.key}>
                      <QuarterGroupHeader
                        label={quarter.label}
                        sum={quarter.sum}
                        isExpanded={isExpanded}
                        onToggle={() => toggleMonth(quarter.key)}
                        invoiceCount={quarter.invoices.length}
                      />
                      
                      {isExpanded && (
                        <div className={isMobile ? '' : 'bg-muted/20'}>
                          {quarter.invoices.map(invoice => (
                            <RowComponent
                              key={invoice.id}
                              invoice={invoice}
                              isIncome={isIncome}
                              onView={onView}
                              onPreview={onPreview}
                              onDownload={onDownload}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onShare={onShare}
                              onDuplicate={onDuplicate}
                              onTogglePaid={onTogglePaid}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {groupingMode === 'year' && yearOnlyGroups.map(yearGroup => {
              const isExpanded = expandedMonths.has(yearGroup.key);
              const RowComponent = isMobile ? LedgerRowMobile : LedgerRow;
              
              return (
                <div key={yearGroup.key}>
                  <YearGroupHeader
                    label={yearGroup.label}
                    sum={yearGroup.sum}
                    isExpanded={isExpanded}
                    onToggle={() => toggleMonth(yearGroup.key)}
                    invoiceCount={yearGroup.invoices.length}
                  />
                  
                  {isExpanded && (
                    <div className={isMobile ? '' : 'bg-muted/20'}>
                      {yearGroup.invoices.map(invoice => (
                        <RowComponent
                          key={invoice.id}
                          invoice={invoice}
                          isIncome={isIncome}
                          onView={onView}
                          onPreview={onPreview}
                          onDownload={onDownload}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onShare={onShare}
                          onDuplicate={onDuplicate}
                          onTogglePaid={onTogglePaid}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
