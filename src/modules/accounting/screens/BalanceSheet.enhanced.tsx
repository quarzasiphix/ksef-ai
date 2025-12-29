import React, { useEffect, useState } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { calculateBalanceSheet } from '@/modules/accounting/data/accountingRepository';
import type { BalanceSheetData } from '@/modules/accounting/accounting';
import { toast } from 'sonner';
import { format, addDays, subDays, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { useAuth } from '@/shared/hooks/useAuth';

interface BilansSnapshot {
  id: string;
  snapshot_date: string;
  status: 'draft' | 'approved' | 'locked';
  is_balanced: boolean;
  balance_difference: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  event_count: number;
  created_at: string;
  approved_at?: string;
}

interface BilansRowData {
  code: string;
  label: string;
  value: number;
  category: string;
  explanation?: string;
  contributingAccounts?: any[];
  eventCount?: number;
  isExpandable?: boolean;
  children?: BilansRowData[];
  level?: number;
}

interface DrillDownData {
  rowCode: string;
  rowLabel: string;
  value: number;
  events: any[];
  accounts: any[];
}

const BalanceSheet = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { user } = useAuth();
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<BilansSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  useEffect(() => {
    if (selectedProfileId) {
      calculateBalanceSheetAuto();
    }
  }, [selectedProfileId, selectedDate]);

  const calculateBalanceSheetAuto = async () => {
    if (!selectedProfileId) return;

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await calculateBalanceSheet(selectedProfileId, dateStr);
      setBalanceSheetData(data);
      
      // Check if balanced
      const difference = data.assets.total - (data.liabilities.total + data.equity.total);
      const isBalanced = Math.abs(difference) <= 0.01;
      
      // Create temporary snapshot object for display
      setCurrentSnapshot({
        id: 'temp',
        snapshot_date: dateStr,
        status: 'draft',
        is_balanced: isBalanced,
        balance_difference: difference,
        total_assets: data.assets.total,
        total_liabilities: data.liabilities.total,
        total_equity: data.equity.total,
        event_count: 0, // TODO: Get from API
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error calculating balance sheet:', error);
      toast.error('Błąd podczas obliczania bilansu');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSnapshot = async () => {
    if (!currentSnapshot || !user?.id) return;
    
    if (!currentSnapshot.is_balanced) {
      toast.error('Nie można zatwierdzić niezgodnego bilansu');
      return;
    }

    try {
      // TODO: Call API to create and approve snapshot
      // await approveBalansSnapshot(currentSnapshot.id, user.id);
      toast.success('Bilans zatwierdzony i zablokowany');
      calculateBalanceSheetAuto();
    } catch (error) {
      console.error('Error approving snapshot:', error);
      toast.error('Błąd podczas zatwierdzania bilansu');
    }
  };

  const navigateDate = (direction: 'prev' | 'next', unit: 'day' | 'month' | 'year') => {
    let newDate = selectedDate;
    
    if (unit === 'day') {
      newDate = direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    } else if (unit === 'month') {
      newDate = direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1);
    } else if (unit === 'year') {
      newDate = direction === 'prev' ? subYears(selectedDate, 1) : addYears(selectedDate, 1);
    }
    
    setSelectedDate(newDate);
  };

  const handleRowClick = (rowData: BilansRowData) => {
    // Open drill-down sheet with event details
    setDrillDownData({
      rowCode: rowData.code,
      rowLabel: rowData.label,
      value: rowData.value,
      events: [], // TODO: Fetch from API
      accounts: rowData.contributingAccounts || [],
    });
    setDrillDownOpen(true);
  };

  const toggleRowExpansion = (rowCode: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowCode)) {
      newExpanded.delete(rowCode);
    } else {
      newExpanded.add(rowCode);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount);
  };

  const getStatusBadge = () => {
    if (!currentSnapshot) return null;

    if (currentSnapshot.status === 'locked') {
      return (
        <Badge variant="secondary" className="bg-gray-500 text-white">
          <Lock className="h-3 w-3 mr-1" />
          Bilans zatwierdzony
        </Badge>
      );
    }

    if (currentSnapshot.is_balanced) {
      return (
        <Badge variant="secondary" className="bg-green-500 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Bilans zgodny
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-red-500 text-white">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Bilans niezgodny
      </Badge>
    );
  };

  const BilansRow = ({ 
    row, 
    onClick, 
    isSubRow = false 
  }: { 
    row: BilansRowData; 
    onClick?: () => void;
    isSubRow?: boolean;
  }) => {
    const isExpanded = expandedRows.has(row.code);
    const hasChildren = row.children && row.children.length > 0;

    return (
      <>
        <div
          className={cn(
            "flex justify-between items-center py-2 px-3 hover:bg-muted/50 cursor-pointer transition-colors rounded-md group",
            isSubRow && "pl-8 text-sm",
            !isSubRow && "font-semibold"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleRowExpansion(row.code);
            }
            onClick?.();
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpansion(row.code);
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            )}
            <span className="flex-1">{row.label}</span>
            {row.explanation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{row.explanation}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className={cn("font-mono", !isSubRow && "font-bold")}>
            {formatCurrency(row.value)}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-muted">
            {row.children!.map((child) => (
              <BilansRow
                key={child.code}
                row={child}
                onClick={() => handleRowClick(child)}
                isSubRow={true}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  if (selectedProfile?.entityType !== 'sp_zoo' && selectedProfile?.entityType !== 'sa') {
    return (
      <div className="space-y-6 pb-20 px-4 md:px-6">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bilans dostępny tylko dla Spółek</h2>
          <p className="text-muted-foreground">
            Ta funkcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
        </div>
      </div>
    );
  }

  // Build hierarchical row data
  const assetsRows: BilansRowData[] = balanceSheetData ? [
    {
      code: 'A.I',
      label: 'Aktywa obrotowe',
      value: balanceSheetData.assets.current.total,
      category: 'asset_current',
      isExpandable: true,
      children: [
        {
          code: 'A.I.1',
          label: 'Środki pieniężne',
          value: balanceSheetData.assets.current.cash,
          category: 'asset_current',
          explanation: 'Gotówka w kasie, środki na rachunkach bankowych',
        },
        {
          code: 'A.I.2',
          label: 'Należności',
          value: balanceSheetData.assets.current.accounts_receivable,
          category: 'asset_current',
          explanation: 'Należności z tytułu dostaw i usług, należności od kontrahentów',
        },
        {
          code: 'A.I.3',
          label: 'Zapasy',
          value: balanceSheetData.assets.current.inventory,
          category: 'asset_current',
          explanation: 'Materiały, towary, produkty gotowe',
        },
        {
          code: 'A.I.4',
          label: 'Inne',
          value: balanceSheetData.assets.current.other,
          category: 'asset_current',
        },
      ],
    },
    {
      code: 'A.II',
      label: 'Aktywa trwałe',
      value: balanceSheetData.assets.fixed.total,
      category: 'asset_fixed',
      isExpandable: true,
      children: [
        {
          code: 'A.II.1',
          label: 'Nieruchomości',
          value: balanceSheetData.assets.fixed.property,
          category: 'asset_fixed',
          explanation: 'Grunty, budynki, lokale',
        },
        {
          code: 'A.II.2',
          label: 'Urządzenia',
          value: balanceSheetData.assets.fixed.equipment,
          category: 'asset_fixed',
          explanation: 'Maszyny, urządzenia techniczne, środki transportu',
        },
        {
          code: 'A.II.3',
          label: 'Umorzenie',
          value: -balanceSheetData.assets.fixed.accumulated_depreciation,
          category: 'asset_fixed',
          explanation: 'Skumulowane odpisy amortyzacyjne',
        },
      ],
    },
  ] : [];

  const liabilitiesRows: BilansRowData[] = balanceSheetData ? [
    {
      code: 'P.I',
      label: 'Zobowiązania krótkoterminowe',
      value: balanceSheetData.liabilities.current.total,
      category: 'liability_current',
      isExpandable: true,
      children: [
        {
          code: 'P.I.1',
          label: 'Zobowiązania handlowe',
          value: balanceSheetData.liabilities.current.accounts_payable,
          category: 'liability_current',
          explanation: 'Zobowiązania wobec dostawców',
        },
        {
          code: 'P.I.2',
          label: 'Kredyty krótkoterminowe',
          value: balanceSheetData.liabilities.current.short_term_debt,
          category: 'liability_current',
        },
        {
          code: 'P.I.3',
          label: 'Inne',
          value: balanceSheetData.liabilities.current.other,
          category: 'liability_current',
        },
      ],
    },
    {
      code: 'P.II',
      label: 'Zobowiązania długoterminowe',
      value: balanceSheetData.liabilities.long_term.total,
      category: 'liability_long_term',
      isExpandable: true,
      children: [
        {
          code: 'P.II.1',
          label: 'Kredyty długoterminowe',
          value: balanceSheetData.liabilities.long_term.long_term_debt,
          category: 'liability_long_term',
        },
        {
          code: 'P.II.2',
          label: 'Inne',
          value: balanceSheetData.liabilities.long_term.other,
          category: 'liability_long_term',
        },
      ],
    },
    {
      code: 'P.III',
      label: 'Kapitał własny',
      value: balanceSheetData.equity.total,
      category: 'equity',
      isExpandable: true,
      children: [
        {
          code: 'P.III.1',
          label: 'Kapitał zakładowy',
          value: balanceSheetData.equity.share_capital,
          category: 'equity',
          explanation: 'Kapitał zakładowy wpisany do KRS',
        },
        {
          code: 'P.III.2',
          label: 'Zyski zatrzymane',
          value: balanceSheetData.equity.retained_earnings,
          category: 'equity',
          explanation: 'Niepodzielone zyski z lat poprzednich',
        },
        {
          code: 'P.III.3',
          label: 'Zysk roku bieżącego',
          value: balanceSheetData.equity.current_year_profit,
          category: 'equity',
          explanation: 'Wynik finansowy roku obrotowego',
        },
      ],
    },
  ] : [];

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bilans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zestawienie aktywów i pasywów wynikające z zamkniętych zdarzeń księgowych
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Validation & Status Bar */}
      {currentSnapshot && !currentSnapshot.is_balanced && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Bilans niezgodny
                </h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  Aktywa nie równają się Pasywom. Różnica: {formatCurrency(currentSnapshot.balance_difference)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-2">
                  Sprawdź zdarzenia księgowe i upewnij się, że wszystkie zapisy są prawidłowe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Navigation */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Bilans na dzień {format(selectedDate, 'dd MMMM yyyy', { locale: pl })}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {currentSnapshot?.event_count || 0} zdarzeń księgowych
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Day navigation */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('prev', 'day')}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">Dzień</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('next', 'day')}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Month navigation */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('prev', 'month')}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">Miesiąc</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('next', 'month')}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Year navigation */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('prev', 'year')}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs px-2">Rok</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDate('next', 'year')}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={calculateBalanceSheetAuto} disabled={loading} variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Odśwież
              </Button>

              {currentSnapshot && currentSnapshot.is_balanced && currentSnapshot.status === 'draft' && (
                <Button onClick={handleApproveSnapshot} size="sm">
                  <Lock className="mr-2 h-4 w-4" />
                  Zatwierdź bilans
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Balance Sheet Display */}
      {balanceSheetData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-950">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Aktywa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              {assetsRows.map((row) => (
                <BilansRow
                  key={row.code}
                  row={row}
                  onClick={() => handleRowClick(row)}
                />
              ))}

              <div className="border-t-2 pt-4 mt-4">
                <div className="flex justify-between font-bold text-lg px-3">
                  <span>SUMA AKTYWÓW</span>
                  <span className="font-mono text-blue-600">
                    {formatCurrency(balanceSheetData.assets.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-950">
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                Pasywa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              {liabilitiesRows.map((row) => (
                <BilansRow
                  key={row.code}
                  row={row}
                  onClick={() => handleRowClick(row)}
                />
              ))}

              <div className="border-t-2 pt-4 mt-4">
                <div className="flex justify-between font-bold text-lg px-3">
                  <span>SUMA PASYWÓW</span>
                  <span className="font-mono text-green-600">
                    {formatCurrency(balanceSheetData.liabilities.total + balanceSheetData.equity.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drill-down Sheet */}
      <Sheet open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drillDownData?.rowLabel}</SheetTitle>
            <SheetDescription>
              Kod: {drillDownData?.rowCode} • Wartość: {drillDownData && formatCurrency(drillDownData.value)}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Konta księgowe</h3>
              {drillDownData?.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak przypisanych kont</p>
              ) : (
                <div className="space-y-2">
                  {drillDownData?.accounts.map((account: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-md">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">Konto: {account.number}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Zdarzenia księgowe</h3>
              {drillDownData?.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak zdarzeń wpływających na tę pozycję
                </p>
              ) : (
                <div className="space-y-2">
                  {drillDownData?.events.map((event: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">{event.date}</p>
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BalanceSheet;
