import React from "react";
import {
  aggregateByMonth,
  aggregateByType,
  getTopRecipients,
  getTopSenders,
  getRecurringPayments,
  getLargeTransactions,
  filterByDate,
  getAverageIncome,
  getAverageExpense,
} from "@/utils/analytics/bankAnalytics";
import { BankTransaction } from "@/types/bank";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { ArrowDownCircle, ArrowUpCircle, ZoomIn, ZoomOut, Calendar, ChevronDown, ChevronUp, Upload, Trash2, FileText, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { uploadBankLog, listBankLogs, deleteBankLog, getBankLogSignedUrl } from "@/integrations/supabase/repositories/bankLogRepository";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { parseBankCsv } from "@/utils/parseBankCsv";
import { parseBankXml } from "@/utils/parseBankXml";
import { saveBankTransactions } from "@/integrations/supabase/repositories/bankTransactionRepository";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

type Props = {
  transactions: BankTransaction[];
  filterType: 'all' | 'income' | 'expense';
  onFilterTypeChange: (type: 'all' | 'income' | 'expense') => void;
};

const BankAnalyticsDashboard: React.FC<Props> = ({ transactions, filterType, onFilterTypeChange }) => {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [showMonthlyDetail, setShowMonthlyDetail] = React.useState(false);
  const [chartZoomed, setChartZoomed] = React.useState(false);
  const [openSections, setOpenSections] = useState<{
    recipients: boolean;
    senders: boolean;
    recurring: boolean;
    large: boolean;
  }>({
    recipients: false,
    senders: false,
    recurring: false,
    large: false,
  });
  
  let filtered = from && to ? filterByDate(transactions, from, to) : transactions;
  if (filterType === "income") filtered = filtered.filter(t => t.type === "income");
  if (filterType === "expense") filtered = filtered.filter(t => t.type === "expense");
  
  const byMonth = aggregateByMonth(filtered);
  const byType = aggregateByType(filtered);
  const topRecipients = getTopRecipients(filtered, 5);
  const topSenders = getTopSenders(filtered, 5);
  const recurring = getRecurringPayments(filtered);
  const largeTx = getLargeTransactions(filtered);
  const avgIncome = getAverageIncome(filtered);
  const avgExpense = getAverageExpense(filtered);

  // Calculate unique months in filtered transactions
  const uniqueMonths = Array.from(new Set(filtered.map(tx => tx.date.slice(0, 7))));
  const monthsCount = uniqueMonths.length || 1;
  const totalIncome = filtered.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = filtered.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const avgMonthlyIncome = totalIncome / monthsCount;
  const avgMonthlyExpense = totalExpense / monthsCount;

  // Get transactions for selected month
  const selectedMonthTransactions = selectedMonth 
    ? filtered.filter(tx => tx.date.startsWith(selectedMonth))
    : [];

  // Enhanced type aggregation with better categorization
  const enhancedByType = byType.map(type => ({
    ...type,
    percentage: ((type.total / (totalIncome + Math.abs(totalExpense))) * 100).toFixed(1),
    avgAmount: (type.total / type.count).toFixed(2)
  }));

  // Get transaction types for selected month
  const selectedMonthByType = selectedMonth 
    ? aggregateByType(selectedMonthTransactions).map(type => ({
        ...type,
        percentage: ((type.total / (selectedMonthTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0) + 
                                   Math.abs(selectedMonthTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)))) * 100).toFixed(1),
        avgAmount: (type.total / type.count).toFixed(2)
      }))
    : enhancedByType;

  // Limit pie chart to top 8 categories to prevent overcrowding
  const pieChartData = selectedMonthByType
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 8);

  // Group remaining categories as "Inne"
  const remainingCategories = selectedMonthByType.slice(8);
  if (remainingCategories.length > 0) {
    const otherTotal = remainingCategories.reduce((sum, cat) => sum + cat.total, 0);
    const otherCount = remainingCategories.reduce((sum, cat) => sum + cat.count, 0);
    if (otherTotal !== 0) {
      pieChartData.push({
        type: "Inne",
        total: otherTotal,
        count: otherCount,
        percentage: ((otherTotal / (selectedMonthTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0) + 
                                   Math.abs(selectedMonthTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)))) * 100).toFixed(1),
        avgAmount: (otherTotal / otherCount).toFixed(2)
      });
    }
  }

  // Get data for the chart - either all months or zoomed to selected month
  const chartData = chartZoomed && selectedMonth ? 
    // When zoomed, show daily breakdown for the selected month
    (() => {
      const monthTransactions = filtered.filter(tx => {
        const txMonth = tx.date.substring(0, 7); // YYYY-MM format
        return txMonth === selectedMonth;
      });
      
      // Group by day
      const dailyData = monthTransactions.reduce((acc, tx) => {
        const day = tx.date.substring(8, 10); // DD format
        if (!acc[day]) {
          acc[day] = { day, income: 0, expense: 0 };
        }
        if (tx.type === 'income') {
          acc[day].income += tx.amount;
        } else {
          acc[day].expense += tx.amount;
        }
        return acc;
      }, {} as Record<string, { day: string; income: number; expense: number }>);
      
      return Object.values(dailyData).sort((a, b) => parseInt(a.day) - parseInt(b.day));
    })() :
    // Normal view - show monthly data
    byMonth;

  const handleMonthClick = (month: string) => {
    if (selectedMonth === month) {
      // If clicking the same month, toggle zoom
      setChartZoomed(!chartZoomed);
      if (chartZoomed) {
        // If we're unzooming, also clear the selection
        setSelectedMonth(null);
        setShowMonthlyDetail(false);
      }
    } else {
      // If clicking a different month, zoom to it
      setSelectedMonth(month);
      setChartZoomed(true);
      setShowMonthlyDetail(true);
    }
  };

  const resetZoom = () => {
    setSelectedMonth(null);
    setChartZoomed(false);
    setShowMonthlyDetail(false);
  };

  // Helper functions to get detailed transactions
  const getTransactionsForRecipient = (recipientName: string) => {
    return filtered.filter(tx => 
      tx.type === "income" && tx.description === recipientName
    );
  };

  const getTransactionsForSender = (senderName: string) => {
    return filtered.filter(tx => 
      tx.type === "expense" && tx.description === senderName
    );
  };

  const getTransactionsForRecurring = (counterpartyName: string) => {
    return filtered.filter(tx => tx.description === counterpartyName);
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p>Suma: {data.value.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</p>
          <p>Liczba transakcji: {data.payload.count}</p>
          <p>Średnia: {(data.value / data.payload.count).toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtry analizy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Typ transakcji</label>
              <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => onFilterTypeChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="income">Przychody</SelectItem>
                  <SelectItem value="expense">Wydatki</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Od daty</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Od daty"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Do daty</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Do daty"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.2))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Card>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="text-green-500 w-6 h-6" />
            <span className="text-lg font-medium">Średni przychód (na transakcję):</span>
            <span className="text-lg font-bold">{avgIncome.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="text-red-500 w-6 h-6" />
            <span className="text-lg font-medium">Średni wydatek (na transakcję):</span>
            <span className="text-lg font-bold">{avgExpense.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary with Clickable Bars */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {chartZoomed ? (
                <>
                  <span>Szczegóły dzienne</span>
                  <Badge variant="secondary">
                    {new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })}
                  </Badge>
                </>
              ) : (
                <>
                  <span>Podsumowanie miesięczne</span>
                  {selectedMonth && (
                    <Badge variant="secondary">
                      Wybrano: {new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })}
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {chartZoomed && (
                <Button variant="outline" size="sm" onClick={resetZoom}>
                  Powrót do miesięcznego
                </Button>
              )}
              {selectedMonth && !chartZoomed && (
                <Button variant="outline" size="sm" onClick={resetZoom}>
                  Wyczyść
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="text-green-500 w-5 h-5" />
              <span className="text-sm">Średni miesięczny przychód:</span>
              <span className="font-semibold">{avgMonthlyIncome.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="text-red-500 w-5 h-5" />
              <span className="text-sm">Średni miesięczny wydatek:</span>
              <span className="font-semibold">{avgMonthlyExpense.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
            </div>
          </div>
          <div style={{ height: 250 * zoomLevel }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ left: 10, right: 10 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    if (chartZoomed) {
                      // If already zoomed, clicking a day doesn't do anything
                      return;
                    }
                    // If not zoomed, clicking a month zooms to it
                    handleMonthClick(data.activePayload[0].payload.month);
                  }
                }}
                style={{ cursor: chartZoomed ? 'default' : 'pointer' }}
              >
                <XAxis 
                  dataKey={chartZoomed ? "day" : "month"} 
                  tickFormatter={chartZoomed ? 
                    (value) => `${value}.` : 
                    (value) => new Date(value + '-01').toLocaleDateString('pl-PL', { month: 'short' })
                  }
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">
                            {chartZoomed ? 
                              `${label}. ${new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}` :
                              new Date(label + '-01').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
                            }
                          </p>
                          <div className="space-y-1">
                            <p className="text-green-600">
                              Przychód: {data.income.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                            </p>
                            <p className="text-red-600">
                              Wydatek: {data.expense.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                            </p>
                            <p className="font-medium">
                              Saldo: {(data.income - data.expense).toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="income" fill="#82ca9d" name="Przychód" />
                <Bar dataKey="expense" fill="#ff8042" name="Wydatek" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>
            Podział wg typu transakcji
            {selectedMonth && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div style={{ height: 250 * zoomLevel }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieChartData} 
                    dataKey="total" 
                    nameKey="type" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ type, percentage }) => `${type} (${percentage}%)`}
                  >
                    {pieChartData.map((entry, idx) => (
                      <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Szczegóły typów transakcji:</h4>
              <div className="max-h-60 overflow-y-auto">
                {selectedMonthByType.map((type, idx) => (
                  <div key={type.type} className="flex items-center justify-between p-2 border rounded mb-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium">{type.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {type.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {type.count} transakcji • {type.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Month Detail */}
      {showMonthlyDetail && selectedMonth && selectedMonthTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Szczegóły {new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </div>
                  <div className="text-sm text-green-700">Przychody</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </div>
                  <div className="text-sm text-red-700">Wydatki</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedMonthTransactions.length}
                  </div>
                  <div className="text-sm text-blue-700">Transakcji</div>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Kwota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMonthTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'income' ? 'default' : 'destructive'}>
                            {tx.type === 'income' ? 'Przychód' : 'Wydatek'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Recipients and Senders */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <Collapsible open={openSections.recipients} onOpenChange={() => toggleSection('recipients')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  Top odbiorcy (przychód)
                  {openSections.recipients ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Odbiorca</TableHead>
                      <TableHead className="text-right">Suma</TableHead>
                      <TableHead className="text-right">Liczba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRecipients.map(r => (
                      <TableRow key={r.counterparty}>
                        <TableCell className="flex items-center gap-2">
                          <ArrowDownCircle className="text-green-500 w-4 h-4" />
                          {r.counterparty}
                        </TableCell>
                        <TableCell className="text-right">{r.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {openSections.recipients && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Szczegóły transakcji:</h4>
                    {topRecipients.map(recipient => (
                      <div key={recipient.counterparty} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{recipient.counterparty}</span>
                          <Badge variant="outline" className="text-xs">
                            {recipient.count} transakcji
                          </Badge>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {getTransactionsForRecipient(recipient.counterparty).map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-xs p-1 bg-muted/30 rounded">
                              <span>{tx.date}</span>
                              <span className="font-medium text-green-600">
                                {tx.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Card>
          <Collapsible open={openSections.senders} onOpenChange={() => toggleSection('senders')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  Top nadawcy (wydatek)
                  {openSections.senders ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nadawca</TableHead>
                      <TableHead className="text-right">Suma</TableHead>
                      <TableHead className="text-right">Liczba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSenders.map(r => (
                      <TableRow key={r.counterparty}>
                        <TableCell className="flex items-center gap-2">
                          <ArrowUpCircle className="text-red-500 w-4 h-4" />
                          {r.counterparty}
                        </TableCell>
                        <TableCell className="text-right">{r.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {openSections.senders && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Szczegóły transakcji:</h4>
                    {topSenders.map(sender => (
                      <div key={sender.counterparty} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{sender.counterparty}</span>
                          <Badge variant="outline" className="text-xs">
                            {sender.count} transakcji
                          </Badge>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {getTransactionsForSender(sender.counterparty).map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-xs p-1 bg-muted/30 rounded">
                              <span>{tx.date}</span>
                              <span className="font-medium text-red-600">
                                {tx.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Recurring and Large Transactions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <Collapsible open={openSections.recurring} onOpenChange={() => toggleSection('recurring')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  Powtarzające się płatności
                  {openSections.recurring ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {recurring.map(r => (
                    <div key={r.counterparty} className="flex justify-between items-center p-2 border rounded">
                      <span className="font-medium text-sm">{r.counterparty}</span>
                      <Badge variant="outline">{r.count}x</Badge>
                    </div>
                  ))}
                </div>
                
                {openSections.recurring && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Szczegóły powtarzających się płatności:</h4>
                    {recurring.map(recurringItem => (
                      <div key={recurringItem.counterparty} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{recurringItem.counterparty}</span>
                          <Badge variant="outline" className="text-xs">
                            {recurringItem.count} transakcji
                          </Badge>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {getTransactionsForRecurring(recurringItem.counterparty).map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-xs p-1 bg-muted/30 rounded">
                              <span>{tx.date}</span>
                              <span className={`font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Card>
          <Collapsible open={openSections.large} onOpenChange={() => toggleSection('large')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  Największe transakcje
                  {openSections.large ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {largeTx.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium text-sm">{t.date}</span>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                      <span className="font-bold">{t.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
                    </div>
                  ))}
                </div>
                
                {openSections.large && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Szczegóły największych transakcji:</h4>
                    {largeTx.map(largeTxItem => (
                      <div key={largeTxItem.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{largeTxItem.date}</span>
                          <Badge variant={largeTxItem.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {largeTxItem.type === 'income' ? 'Przychód' : 'Wydatek'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{largeTxItem.description}</div>
                        <div className="text-lg font-bold text-center">
                          <span className={largeTxItem.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {largeTxItem.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};

export default BankAnalyticsDashboard; 