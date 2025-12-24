import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, FileText, CheckCircle, Clock, Download, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from "date-fns";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AnalyticsState, KpiMetrics } from "../analytics/types/analytics";
import { fetchKpiMetrics, fetchTimeSeries, fetchStatusFunnel, fetchAgingBuckets, fetchPaymentMethodBreakdown, fetchComplianceHealth, fetchTopCustomers, fetchActionRequiredInvoices } from "../analytics/data/analytics-queries";
import { formatCurrency, calculateCollectionRate, calculateHealthScore, getHealthColor, transformTimeSeriesForChart, transformStatusFunnelForChart, transformAgingBucketsForChart, transformPaymentMethodForChart, exportToCSV, getPeriodLabel } from "../analytics/lib/analytics-metrics";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const Analytics = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const isMobile = useIsMobile();

  // Analytics state
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'custom'>('month');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [mode, setMode] = useState<'simple' | 'accounting'>('simple');
  
  // Collapsible sections for mobile
  const [showOperationalCharts, setShowOperationalCharts] = useState(true);
  const [showCustomers, setShowCustomers] = useState(true);
  const [showActions, setShowActions] = useState(true);

  // Calculate date range based on period type
  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodType === 'month') {
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    }
    if (periodType === 'quarter') {
      return {
        from: format(startOfQuarter(now), 'yyyy-MM-dd'),
        to: format(endOfQuarter(now), 'yyyy-MM-dd'),
      };
    }
    return {
      from: format(subMonths(now, 1), 'yyyy-MM-dd'),
      to: format(now, 'yyyy-MM-dd'),
    };
  }, [periodType]);

  const analyticsState: AnalyticsState = {
    businessProfileId: selectedProfileId || '',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    periodType,
    groupBy,
    mode,
    baseCurrency: 'PLN',
    showMultiCurrency: false,
    filters: {},
  };

  // Fetch analytics data
  const { data: kpiMetrics, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['analytics-kpi', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchKpiMetrics(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: timeSeries, isLoading: isLoadingTimeSeries } = useQuery({
    queryKey: ['analytics-timeseries', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo, analyticsState.groupBy],
    queryFn: () => fetchTimeSeries(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: statusFunnel } = useQuery({
    queryKey: ['analytics-funnel', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchStatusFunnel(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: agingBuckets } = useQuery({
    queryKey: ['analytics-aging', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchAgingBuckets(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['analytics-payment', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchPaymentMethodBreakdown(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: complianceHealth } = useQuery({
    queryKey: ['analytics-compliance', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchComplianceHealth(analyticsState),
    enabled: !!selectedProfileId,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['analytics-customers', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchTopCustomers(analyticsState, 5),
    enabled: !!selectedProfileId,
  });

  const { data: actionRequired } = useQuery({
    queryKey: ['analytics-actions', analyticsState.businessProfileId, analyticsState.dateFrom, analyticsState.dateTo],
    queryFn: () => fetchActionRequiredInvoices(analyticsState),
    enabled: !!selectedProfileId,
  });

  const isVatActive = selectedProfile?.is_vat_exempt === false;
  const collectionRate = kpiMetrics ? calculateCollectionRate(kpiMetrics) : 0;
  const healthScore = kpiMetrics ? calculateHealthScore(kpiMetrics) : 100;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!selectedProfileId) {
    return (
      <div className="space-y-6 pb-20 px-4 md:px-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Wybierz profil firmy, aby wyświetlić analizy</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 px-3 sm:px-4 md:px-6 w-full max-w-full">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Analizy księgowe</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {getPeriodLabel(dateRange.from, dateRange.to, periodType)}
          </p>
        </div>
      </div>

      {/* Layer A: Global Controls */}
      <Card>
        <CardContent className="py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Okres:</span>
              <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Bieżący miesiąc</SelectItem>
                  <SelectItem value="quarter">Bieżący kwartał</SelectItem>
                  <SelectItem value="custom">Ostatnie 30 dni</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Grupowanie:</span>
              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dzień</SelectItem>
                  <SelectItem value="week">Tydzień</SelectItem>
                  <SelectItem value="month">Miesiąc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isMobile && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Tryb:</span>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Uproszczony</SelectItem>
                    <SelectItem value="accounting">Księgowy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full sm:w-auto sm:ml-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filtry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Layer B: KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Przychód brutto</p>
                <p className="text-sm sm:text-base md:text-lg font-bold truncate">{formatCurrency(kpiMetrics?.grossRevenue || 0)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 opacity-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {isVatActive && (
          <Card>
            <CardContent className="py-3 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">VAT zebrany</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold truncate">{formatCurrency(kpiMetrics?.vatCollected || 0)}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Opłacone</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 truncate">{formatCurrency(kpiMetrics?.paidAmount || 0)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{collectionRate.toFixed(0)}% ściągalność</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Nieopłacone</p>
                <p className="text-sm sm:text-base md:text-lg font-bold truncate">{formatCurrency(kpiMetrics?.unpaidAmount || 0)}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 opacity-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Zaległe</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 truncate">{formatCurrency(kpiMetrics?.overdueAmount || 0)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpiMetrics?.overdueInvoiceCount || 0} faktur</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 opacity-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Zdrowie</p>
                <p className={cn("text-sm sm:text-base md:text-lg font-bold truncate", getHealthColor(healthScore))}>{healthScore.toFixed(0)}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpiMetrics?.blockedFromAccounting || 0} zablok.</p>
              </div>
              <TrendingUp className={cn("h-6 w-6 sm:h-8 sm:w-8 opacity-20 flex-shrink-0", getHealthColor(healthScore))} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layer C: Money Flow - Primary Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Przepływ pieniędzy</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoadingTimeSeries ? (
            <div className="h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <BarChart data={transformTimeSeriesForChart(timeSeries || [])}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ fontSize: isMobile ? 12 : 14 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
                  iconSize={isMobile ? 10 : 14}
                />
                <Bar dataKey="Wystawione" fill="#0088FE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Opłacone" fill="#00C49F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Zaległe" fill="#FF8042" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Layer D: Operational Charts */}
      <Collapsible open={showOperationalCharts} onOpenChange={setShowOperationalCharts}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Wykresy operacyjne</CardTitle>
                {showOperationalCharts ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Status Funnel */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Lejek statusów</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                      <BarChart data={transformStatusFunnelForChart(statusFunnel || [])} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis 
                          dataKey="stage" 
                          type="category" 
                          width={isMobile ? 80 : 120}
                          tick={{ fontSize: isMobile ? 9 : 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{ fontSize: isMobile ? 12 : 14 }}
                        />
                        <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Aging Buckets */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Wiekowanie należności</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                      <BarChart data={transformAgingBucketsForChart(agingBuckets || [])}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis 
                          dataKey="bucket" 
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 50 : 30}
                        />
                        <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{ fontSize: isMobile ? 12 : 14 }}
                        />
                        <Bar dataKey="value" fill="#FF8042" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Metody płatności</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                      <PieChart>
                        <Pie
                          data={transformPaymentMethodForChart(paymentMethods || [])}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={isMobile ? 60 : 80}
                          label={!isMobile}
                          labelLine={!isMobile}
                        >
                          {(paymentMethods || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{ fontSize: isMobile ? 12 : 14 }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
                          iconSize={isMobile ? 10 : 14}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Compliance Health */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Zgodność i eksport</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm">Gotowe do KSeF</span>
                        <span className="text-sm sm:text-base font-medium">{complianceHealth?.readyForKsef || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-green-600">Wysłane do KSeF</span>
                        <span className="text-sm sm:text-base font-medium text-green-600">{complianceHealth?.ksefSubmitted || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-red-600">Błędy KSeF</span>
                        <span className="text-sm sm:text-base font-medium text-red-600">{complianceHealth?.ksefErrors || 0}</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm">Możliwe do eksportu</span>
                        <span className="text-sm sm:text-base font-medium">{complianceHealth?.exportableToAccounting || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-green-600">Zaksięgowane</span>
                        <span className="text-sm sm:text-base font-medium text-green-600">{complianceHealth?.exportedBooked || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-orange-600">Zablokowane</span>
                        <span className="text-sm sm:text-base font-medium text-orange-600">{complianceHealth?.blockedFromExport || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Top Customers */}
      <Collapsible open={showCustomers} onOpenChange={setShowCustomers}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg">Top 5 klientów</CardTitle>
                  {showCustomers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    topCustomers && exportToCSV(topCustomers, 'top-customers');
                  }}
                  className="flex-shrink-0"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2 sm:space-y-3">
                {(topCustomers || []).map((customer, idx) => (
                  <div key={customer.customerId} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground flex-shrink-0">#{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium truncate">{customer.customerName}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{customer.invoiceCount} faktur</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm sm:text-base font-medium whitespace-nowrap">{formatCurrency(customer.totalGross)}</p>
                      {customer.overdueGross > 0 && (
                        <p className="text-[10px] sm:text-xs text-red-600 whitespace-nowrap">Zaległe: {formatCurrency(customer.overdueGross)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Required */}
      {actionRequired && actionRequired.length > 0 && (
        <Collapsible open={showActions} onOpenChange={setShowActions}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                    Wymagają uwagi ({actionRequired.length})
                  </CardTitle>
                  {showActions ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-1 sm:space-y-2">
                  {actionRequired.slice(0, 10).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium truncate">{invoice.number}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{invoice.customerName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs sm:text-sm font-medium whitespace-nowrap">{formatCurrency(invoice.totalGross)}</p>
                        <p className="text-[10px] sm:text-xs text-orange-600 whitespace-nowrap">{invoice.actionReason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default Analytics;
