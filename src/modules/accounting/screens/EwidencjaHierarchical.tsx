import React, { useState, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ChevronDown, ChevronRight, Download, Lock, CheckCircle } from 'lucide-react';
import { format, getQuarter, startOfQuarter, endOfQuarter } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Invoice } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/modules/invoices/data/invoiceRepository';
import { getRyczaltAccounts } from '@/modules/accounting/data/ryczaltRepository';

interface LedgerTotals {
  revenue: number;
  tax: number;
  count: number;
  taxByRate?: Record<string, number>;
}

interface InvoiceNode {
  type: 'invoice';
  data: Invoice;
  ryczaltRate: number;
  ryczaltTax: number;
}

interface MonthNode {
  type: 'month';
  year: number;
  month: number;
  monthName: string;
  totals: LedgerTotals;
  children: InvoiceNode[];
}

interface QuarterNode {
  type: 'quarter';
  year: number;
  quarter: number;
  quarterLabel: string;
  totals: LedgerTotals;
  status: 'current' | 'pending' | 'overdue' | 'closed';
  taxDueDate: string;
  children: MonthNode[];
}

interface YearNode {
  type: 'year';
  year: number;
  totals: LedgerTotals;
  children: QuarterNode[];
}

type LedgerNode = YearNode | QuarterNode | MonthNode | InvoiceNode;

const QUARTER_MONTHS: Record<number, string> = {
  1: 'styczeń–marzec',
  2: 'kwiecień–czerwiec',
  3: 'lipiec–wrzesień',
  4: 'październik–grudzień',
};

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const getRyczaltRateColor = (rate: number): string => {
  if (rate <= 5.5) return 'bg-green-100 text-green-800 border-green-300';
  if (rate <= 8.5) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-orange-100 text-orange-800 border-orange-300';
};

const getQuarterStatus = (year: number, quarter: number): 'current' | 'pending' | 'overdue' | 'closed' => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarter(now);
  
  if (year < currentYear || (year === currentYear && quarter < currentQuarter)) {
    return 'closed';
  }
  if (year === currentYear && quarter === currentQuarter) {
    return 'current';
  }
  return 'pending';
};

const getQuarterTaxDueDate = (year: number, quarter: number): string => {
  // Tax due date is 20th of the month following the quarter
  const dueMonth = quarter * 3 + 1; // Q1->4, Q2->7, Q3->10, Q4->1(next year)
  const dueYear = dueMonth > 12 ? year + 1 : year;
  const adjustedMonth = dueMonth > 12 ? 1 : dueMonth;
  
  return format(new Date(dueYear, adjustedMonth - 1, 20), 'd MMMM yyyy', { locale: pl });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const InvoiceRow: React.FC<{ node: InvoiceNode }> = ({ node }) => {
  const { data: invoice, ryczaltRate, ryczaltTax } = node;
  
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-4 flex-1">
        <span className="font-medium text-gray-900">{invoice.number}</span>
        <span className="text-gray-600">{invoice.customerName || 'Brak klienta'}</span>
        <span className="text-sm text-gray-500">
          {format(new Date(invoice.sellDate), 'd.MM.yyyy')}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <Badge className={`${getRyczaltRateColor(ryczaltRate)} border`}>
          {ryczaltRate}%
        </Badge>
        <Badge variant={invoice.isPaid ? 'default' : 'secondary'}>
          {invoice.isPaid ? 'ZAPŁACONA' : 'DO ZAPŁATY'}
        </Badge>
        <span className="font-semibold text-gray-900 min-w-[120px] text-right">
          {formatCurrency(invoice.totalGrossValue)}
        </span>
      </div>
    </div>
  );
};

const MonthSection: React.FC<{ node: MonthNode; depth: number }> = ({ node, depth }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="border-l-2 border-gray-200 ml-4">
      <div
        className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h4 className="text-lg font-semibold text-gray-800">{node.monthName} {node.year}</h4>
        </div>
        
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600">Przychód: </span>
            <span className="font-semibold text-gray-900">{formatCurrency(node.totals.revenue)}</span>
          </div>
          <div>
            <span className="text-gray-600">Podatek: </span>
            <span className="font-semibold text-gray-900">{formatCurrency(node.totals.tax)}</span>
          </div>
          <div>
            <span className="text-gray-600">Dokumenty: </span>
            <span className="font-semibold text-gray-900">{node.totals.count}</span>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="ml-4">
          {node.children.map((invoice, idx) => (
            <InvoiceRow key={invoice.data.id} node={invoice} />
          ))}
        </div>
      )}
    </div>
  );
};

const QuarterSection: React.FC<{ node: QuarterNode; depth: number }> = ({ node, depth }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const statusConfig = {
    current: { label: 'BIEŻĄCY', color: 'bg-green-100 text-green-800 border-green-300' },
    pending: { label: 'DO ROZLICZENIA', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    overdue: { label: 'PO TERMINIE', color: 'bg-red-100 text-red-800 border-red-300' },
    closed: { label: 'ZAMKNIĘTY', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  };
  
  const config = statusConfig[node.status];
  
  return (
    <div className="border-l-4 border-blue-300 ml-2 mb-4">
      <div
        className="flex items-center justify-between py-4 px-6 bg-blue-50 hover:bg-blue-100 cursor-pointer rounded-r-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {isExpanded ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Q{node.quarter} {node.year} <span className="text-base font-normal text-gray-600">({node.quarterLabel})</span>
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <Badge className={`${config.color} border`}>
                {config.label}
              </Badge>
              <span className="text-gray-600">
                Termin podatku: <span className="font-medium">{node.taxDueDate}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-sm text-gray-600">Przychód</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(node.totals.revenue)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Podatek</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(node.totals.tax)}</div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Eksport
            </Button>
            {node.status === 'current' && (
              <Button variant="outline" size="sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Zapłacono
              </Button>
            )}
            {node.status === 'closed' && (
              <Button variant="outline" size="sm" disabled>
                <Lock className="w-4 h-4 mr-1" />
                Zamknięty
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-2">
          {node.children.map((month) => (
            <MonthSection key={`${month.year}-${month.month}`} node={month} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const YearSection: React.FC<{ node: YearNode }> = ({ node }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between py-6 px-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-shadow sticky top-0 z-10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {isExpanded ? <ChevronDown className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}
          <h2 className="text-3xl font-bold">{node.year}</h2>
        </div>
        
        <div className="flex items-center gap-12">
          <div className="text-right">
            <div className="text-sm opacity-90">Przychód</div>
            <div className="text-2xl font-bold">{formatCurrency(node.totals.revenue)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Podatek ryczałt</div>
            <div className="text-2xl font-bold">{formatCurrency(node.totals.tax)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Dokumenty</div>
            <div className="text-2xl font-bold">{node.totals.count}</div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {node.children.map((quarter) => (
            <QuarterSection key={`${quarter.year}-Q${quarter.quarter}`} node={quarter} depth={1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const EwidencjaHierarchical: React.FC = () => {
  const { user } = useAuth();
  
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: () => getInvoices(user!.id),
    enabled: !!user?.id,
  });
  
  const { data: ryczaltAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['ryczalt-accounts', user?.id],
    queryFn: () => getRyczaltAccounts(),
    enabled: !!user?.id,
  });
  
  const hierarchicalData = useMemo(() => {
    if (!invoices.length) return [];
    
    // Filter income invoices only
    const incomeInvoices = invoices.filter(inv => inv.transactionType === 'income');
    
    // Build hierarchy
    const yearMap = new Map<number, YearNode>();
    
    incomeInvoices.forEach((invoice) => {
      const saleDate = new Date(invoice.sellDate);
      const year = saleDate.getFullYear();
      const quarter = getQuarter(saleDate);
      const month = saleDate.getMonth() + 1;
      
      // Find ryczalt account and rate
      const ryczaltAccount = ryczaltAccounts.find(acc => acc.id === invoice.ryczalt_account_id);
      const ryczaltRate = ryczaltAccount?.category_rate ? parseFloat(ryczaltAccount.category_rate) : 0;
      const ryczaltTax = invoice.totalGrossValue * (ryczaltRate / 100);
      
      // Get or create year
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          type: 'year',
          year,
          totals: { revenue: 0, tax: 0, count: 0, taxByRate: {} },
          children: [],
        });
      }
      const yearNode = yearMap.get(year)!;
      
      // Get or create quarter
      let quarterNode = yearNode.children.find(q => q.quarter === quarter);
      if (!quarterNode) {
        quarterNode = {
          type: 'quarter',
          year,
          quarter,
          quarterLabel: QUARTER_MONTHS[quarter],
          totals: { revenue: 0, tax: 0, count: 0, taxByRate: {} },
          status: getQuarterStatus(year, quarter),
          taxDueDate: getQuarterTaxDueDate(year, quarter),
          children: [],
        };
        yearNode.children.push(quarterNode);
      }
      
      // Get or create month
      let monthNode = quarterNode.children.find(m => m.month === month);
      if (!monthNode) {
        monthNode = {
          type: 'month',
          year,
          month,
          monthName: MONTH_NAMES[month - 1],
          totals: { revenue: 0, tax: 0, count: 0 },
          children: [],
        };
        quarterNode.children.push(monthNode);
      }
      
      // Add invoice
      const invoiceNode: InvoiceNode = {
        type: 'invoice',
        data: invoice,
        ryczaltRate,
        ryczaltTax,
      };
      monthNode.children.push(invoiceNode);
      
      // Update totals
      monthNode.totals.revenue += invoice.totalGrossValue;
      monthNode.totals.tax += ryczaltTax;
      monthNode.totals.count += 1;
      
      quarterNode.totals.revenue += invoice.totalGrossValue;
      quarterNode.totals.tax += ryczaltTax;
      quarterNode.totals.count += 1;
      
      yearNode.totals.revenue += invoice.totalGrossValue;
      yearNode.totals.tax += ryczaltTax;
      yearNode.totals.count += 1;
    });
    
    // Sort quarters and months
    yearMap.forEach(yearNode => {
      yearNode.children.sort((a, b) => b.quarter - a.quarter);
      yearNode.children.forEach(quarterNode => {
        quarterNode.children.sort((a, b) => b.month - a.month);
      });
    });
    
    // Convert to array and sort by year descending
    return Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
  }, [invoices, ryczaltAccounts]);
  
  if (invoicesLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Ładowanie ewidencji...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ewidencja Przychodów - Widok Hierarchiczny</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Przychody pogrupowane według lat, kwartałów i miesięcy z automatycznym wyliczeniem podatku ryczałtowego
          </p>
        </CardHeader>
        <CardContent>
          {hierarchicalData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Brak faktur do wyświetlenia
            </div>
          ) : (
            <div className="space-y-6">
              {hierarchicalData.map((yearNode) => (
                <YearSection key={yearNode.year} node={yearNode} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
