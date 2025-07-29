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
import { ArrowDownCircle, ArrowUpCircle, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const handleMonthClick = (month: string) => {
    setSelectedMonth(selectedMonth === month ? null : month);
    setShowMonthlyDetail(true);
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
          <CardTitle>Podsumowanie miesięczne</CardTitle>
          {selectedMonth && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Wybrano: {new Date(selectedMonth + '-01').toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setSelectedMonth(null)}>
                Wyczyść
              </Button>
            </div>
          )}
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
                data={byMonth} 
                margin={{ left: 10, right: 10 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handleMonthClick(data.activePayload[0].payload.month);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
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
          <CardTitle>Podział wg typu transakcji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div style={{ height: 250 * zoomLevel }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={enhancedByType} 
                    dataKey="total" 
                    nameKey="type" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ type, percentage }) => `${type} (${percentage}%)`}
                  >
                    {enhancedByType.map((entry, idx) => (
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
              {enhancedByType.map((type, idx) => (
                <div key={type.type} className="flex items-center justify-between p-2 border rounded">
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
          <CardHeader><CardTitle>Top odbiorcy (przychód)</CardTitle></CardHeader>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top nadawcy (wydatek)</CardTitle></CardHeader>
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
          </CardContent>
        </Card>
      </div>

      {/* Recurring and Large Transactions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Powtarzające się płatności</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {recurring.map(r => (
                <li key={r.counterparty} className="flex justify-between items-center">
                  <span className="font-medium">{r.counterparty}</span>
                  <Badge variant="outline">{r.count}x</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Największe transakcje</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {largeTx.map(t => (
                <li key={t.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{t.date}</span>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>
                  <span className="font-bold">{t.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankAnalyticsDashboard; 