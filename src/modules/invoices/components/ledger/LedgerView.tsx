import { useState, useMemo, useEffect } from 'react';
import { Invoice } from '@/shared/types';
import { groupInvoicesByPeriod, groupInvoicesByQuarter, groupInvoicesByYear, groupInvoicesByYearQuarterMonth, groupInvoicesByQuarterMonth, getAvailableYears, MonthGroup, QuarterGroup, YearOnlyGroup, GroupingMode, SubGroupingMode, calculateTaxForInvoices, AccountingPeriodInfo, formatTaxAmount, formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { PeriodNavigator } from './PeriodNavigator';
import { MonthGroupHeader } from './MonthGroupHeader';
import { MonthGroupHeaderMobile } from './MonthGroupHeaderMobile';
import { QuarterGroupHeader } from './QuarterGroupHeader';
import { YearGroupHeader } from './YearGroupHeader';
import { LedgerRow } from './LedgerRow';
import { LedgerRowMobile } from './LedgerRowMobile';
import { SortSheet } from './SortSheet';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ChevronDown, ChevronUp, Calendar, Calculator, BookOpen, ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface LedgerViewProps {
  invoices: Invoice[];
  isIncome?: boolean;
  sortBy?: 'date' | 'amount' | 'number' | 'customer';
  sortOrder?: 'asc' | 'desc';
  groupingMode?: 'month' | 'quarter' | 'year';
  subGroupingMode?: 'none' | 'month' | 'quarter';
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
  sortBy = 'date',
  sortOrder = 'desc',
  groupingMode = 'month',
  subGroupingMode = 'none',
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
  const [accountingInfo, setAccountingInfo] = useState<AccountingPeriodInfo | null>(null);
  const [showAccountingInfo, setShowAccountingInfo] = useState(false);
  const isMobile = useIsMobile();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  // Sort invoices based on current sort settings
  const sortInvoices = (invoices: Invoice[]): Invoice[] => {
    const sorted = [...invoices].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'amount': {
          const getAmount = (inv: Invoice) => {
            const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
            const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
            return inv.currency === 'PLN' || !inv.exchangeRate ? baseAmount : baseAmount * inv.exchangeRate;
          };
          comparison = getAmount(a) - getAmount(b);
          break;
        }
        case 'number':
          comparison = a.number.localeCompare(b.number, undefined, { numeric: true });
          break;
        case 'customer':
          comparison = (a.customerName || '').localeCompare(b.customerName || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  };

  // Apply sorting to all invoice groups
  const sortedInvoices = useMemo(() => sortInvoices(invoices), [invoices, sortBy, sortOrder]);

  const years = useMemo(() => getAvailableYears(sortedInvoices), [sortedInvoices]);
  
  const yearGroups = useMemo(() => {
    const groups = groupInvoicesByPeriod(sortedInvoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [sortedInvoices, selectedYear]);

  const quarterGroups = useMemo(() => {
    const groups = groupInvoicesByQuarter(sortedInvoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [sortedInvoices, selectedYear]);

  const yearOnlyGroups = useMemo(() => {
    const groups = groupInvoicesByYear(sortedInvoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [sortedInvoices, selectedYear]);

  const yearQuarterMonthGroups = useMemo(() => {
    const groups = groupInvoicesByYearQuarterMonth(sortedInvoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [sortedInvoices, selectedYear]);

  const quarterMonthGroups = useMemo(() => {
    const groups = groupInvoicesByQuarterMonth(sortedInvoices);
    if (selectedYear !== null) {
      return groups.filter(g => g.year === selectedYear);
    }
    return groups;
  }, [sortedInvoices, selectedYear]);

  // Calculate accounting info when invoices or business profile changes
  useEffect(() => {
    const calculateAccountingInfo = async () => {
      if (selectedProfileId && invoices.length > 0) {
        const info = await calculateTaxForInvoices(invoices, selectedProfileId);
        setAccountingInfo(info);
      } else {
        setAccountingInfo(null);
      }
    };
    
    calculateAccountingInfo();
  }, [invoices, selectedProfileId]);

  // Check if business is ryczalt JDG
  const isRyczaltJDG = selectedProfile?.tax_type === 'ryczalt' && selectedProfile?.entityType === 'dzialalnosc';

  // Get accounting info for a specific set of invoices
  const getAccountingInfoForInvoices = async (invoiceSet: Invoice[]): Promise<AccountingPeriodInfo> => {
    if (!selectedProfileId) {
      return {
        sum: 0,
        tax: 0,
        accountedCount: 0,
        totalCount: invoiceSet.length,
        isFullyAccounted: false
      };
    }
    return await calculateTaxForInvoices(invoiceSet, selectedProfileId);
  };

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
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // Check if this month exists in the data
        const monthExists = yearGroups.some(yg => 
          yg.months.some(m => m.key === monthKey)
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
    if (groupingMode === 'year' && subGroupingMode === 'quarter') {
      const keys: string[] = [];
      yearQuarterMonthGroups.forEach(yg => {
        keys.push(`year-${yg.year}`);
        yg.quarters.forEach(q => {
          keys.push(q.key);
          q.months.forEach(m => keys.push(m.key));
        });
      });
      return keys;
    } else if (groupingMode === 'quarter' && subGroupingMode === 'month') {
      const keys: string[] = [];
      quarterMonthGroups.forEach(q => {
        keys.push(q.key);
        q.months.forEach(m => keys.push(m.key));
      });
      return keys;
    } else if (groupingMode === 'month') {
      return yearGroups.flatMap(yg => yg.months.map(m => m.key));
    } else if (groupingMode === 'quarter') {
      return quarterGroups.flatMap(yg => yg.quarters.map(q => q.key));
    } else {
      return yearOnlyGroups.map(y => y.key);
    }
  }, [yearGroups, quarterGroups, yearOnlyGroups, yearQuarterMonthGroups, quarterMonthGroups, groupingMode, subGroupingMode]);

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
      {isRyczaltJDG && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAccountingInfo(!showAccountingInfo)}
          className="gap-2"
        >
          <Calculator className="h-4 w-4" />
          Info podatkowe
        </Button>
      )}

      {showAccountingInfo && isRyczaltJDG && accountingInfo && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Podsumowanie podatkowe</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-900">
                  {formatLedgerAmount(accountingInfo.sum)}{formatTaxAmount(accountingInfo.tax)}
                </div>
                <div className="text-sm text-blue-700">
                  {accountingInfo.accountedCount} z {accountingInfo.totalCount} faktur rozliczonych
                </div>
              </div>
            </div>
          </div>
        </Card>
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
            
            {groupingMode === 'quarter' && subGroupingMode === 'none' && quarterGroups.map(yearGroup => (
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
            
            {groupingMode === 'quarter' && subGroupingMode === 'month' && quarterMonthGroups.map(quarter => {
              const isQuarterExpanded = expandedMonths.has(quarter.key);
              const RowComponent = isMobile ? LedgerRowMobile : LedgerRow;
              const HeaderComponent = isMobile ? MonthGroupHeaderMobile : MonthGroupHeader;
              
              return (
                <div key={quarter.key}>
                  <QuarterGroupHeader
                    label={quarter.label}
                    sum={quarter.sum}
                    isExpanded={isQuarterExpanded}
                    onToggle={() => toggleMonth(quarter.key)}
                    invoiceCount={quarter.months.reduce((sum, m) => sum + m.invoices.length, 0)}
                  />
                  
                  {isQuarterExpanded && (
                    <div className="ml-4">
                      {quarter.months.map(month => {
                        const isMonthExpanded = expandedMonths.has(month.key);
                        
                        return (
                          <div key={month.key}>
                            <HeaderComponent
                              label={month.label}
                              sum={month.sum}
                              isExpanded={isMonthExpanded}
                              onToggle={() => toggleMonth(month.key)}
                              invoiceCount={month.invoices.length}
                            />
                            
                            {isMonthExpanded && (
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
                  )}
                </div>
              );
            })}
            
            {groupingMode === 'year' && subGroupingMode === 'none' && yearOnlyGroups.map(yearGroup => {
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
            
            {groupingMode === 'year' && subGroupingMode === 'quarter' && yearQuarterMonthGroups.map(yearGroup => {
              const yearKey = `year-${yearGroup.year}`;
              const isYearExpanded = expandedMonths.has(yearKey);
              const RowComponent = isMobile ? LedgerRowMobile : LedgerRow;
              const HeaderComponent = isMobile ? MonthGroupHeaderMobile : MonthGroupHeader;
              
              return (
                <div key={yearGroup.year}>
                  <YearGroupHeader
                    label={`${yearGroup.year}`}
                    sum={yearGroup.sum}
                    isExpanded={isYearExpanded}
                    onToggle={() => toggleMonth(yearKey)}
                    invoiceCount={yearGroup.quarters.reduce((sum, q) => sum + q.months.reduce((s, m) => s + m.invoices.length, 0), 0)}
                  />
                  
                  {isYearExpanded && (
                    <div className="ml-4">
                      {yearGroup.quarters.map(quarter => {
                        const isQuarterExpanded = expandedMonths.has(quarter.key);
                        
                        return (
                          <div key={quarter.key}>
                            <QuarterGroupHeader
                              label={quarter.label}
                              sum={quarter.sum}
                              isExpanded={isQuarterExpanded}
                              onToggle={() => toggleMonth(quarter.key)}
                              invoiceCount={quarter.months.reduce((sum, m) => sum + m.invoices.length, 0)}
                            />
                            
                            {isQuarterExpanded && (
                              <div className="ml-4">
                                {quarter.months.map(month => {
                                  const isMonthExpanded = expandedMonths.has(month.key);
                                  
                                  return (
                                    <div key={month.key}>
                                      <HeaderComponent
                                        label={month.label}
                                        sum={month.sum}
                                        isExpanded={isMonthExpanded}
                                        onToggle={() => toggleMonth(month.key)}
                                        invoiceCount={month.invoices.length}
                                      />
                                      
                                      {isMonthExpanded && (
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
                            )}
                          </div>
                        );
                      })}
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
