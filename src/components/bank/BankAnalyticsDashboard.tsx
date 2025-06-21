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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

type Props = {
  transactions: BankTransaction[];
  filterType: 'all' | 'income' | 'expense';
  onFilterTypeChange: (type: 'all' | 'income' | 'expense') => void;
};

const BankAnalyticsDashboard: React.FC<Props> = ({ transactions, filterType, onFilterTypeChange }) => {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
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

  return (
    <div className="space-y-6">
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
      <Card>
        <CardHeader><CardTitle>Podsumowanie miesięczne</CardTitle></CardHeader>
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
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ left: 10, right: 10 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="income" fill="#82ca9d" name="Przychód" />
                <Bar dataKey="expense" fill="#ff8042" name="Wydatek" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Podział wg typu transakcji</CardTitle></CardHeader>
        <CardContent style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byType} dataKey="total" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                {byType.map((entry, idx) => <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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
                    <TableCell className="flex items-center gap-2"><ArrowDownCircle className="text-green-500 w-4 h-4" />{r.counterparty}</TableCell>
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
                    <TableCell className="flex items-center gap-2"><ArrowUpCircle className="text-red-500 w-4 h-4" />{r.counterparty}</TableCell>
                    <TableCell className="text-right">{r.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Powtarzające się płatności</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {recurring.map(r => <li key={r.counterparty}><span className="font-medium">{r.counterparty}</span>: <span className="text-muted-foreground">{r.count}x</span></li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Największe transakcje</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {largeTx.map(t => <li key={t.id}><span className="font-medium">{t.date}</span>: {t.description} <span className="font-bold">{t.amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}</span></li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankAnalyticsDashboard; 