import { BankTransaction } from "@/types/bank";

// Classify transaction type based on description/type
export function classifyTransactionType(tx: BankTransaction): string {
  const desc = tx.description.toLowerCase();
  if (desc.includes("blik")) return "BLIK";
  if (desc.includes("karta") || desc.includes("card") || desc.includes("visa") || desc.includes("mastercard")) return "Card";
  if (desc.includes("przelew") || desc.includes("transfer")) return "Transfer";
  if (desc.includes("gotówka") || desc.includes("cash")) return "Cash";
  if (desc.includes("opłata") || desc.includes("fee")) return "Fee";
  if (desc.includes("prowizja")) return "Commission";
  if (desc.includes("wynagrodzenie") || desc.includes("salary")) return "Salary";
  if (desc.includes("zwrot") || desc.includes("refund")) return "Refund";
  return "Other";
}

// Aggregate by counterparty (recipient/sender)
export function aggregateByCounterparty(transactions: BankTransaction[]) {
  const map: Record<string, { total: number; count: number }> = {};
  transactions.forEach((tx) => {
    const key = tx.description;
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += tx.amount;
    map[key].count += 1;
  });
  return Object.entries(map).map(([counterparty, data]) => ({ counterparty, ...data }));
}

// Aggregate by month
export function aggregateByMonth(transactions: BankTransaction[]) {
  const map: Record<string, { income: number; expense: number }> = {};
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7); // YYYY-MM
    if (!map[month]) map[month] = { income: 0, expense: 0 };
    if (tx.type === "income") map[month].income += tx.amount;
    else map[month].expense += tx.amount;
  });
  return Object.entries(map).map(([month, data]) => ({ month, ...data }));
}

// Aggregate by type
export function aggregateByType(transactions: BankTransaction[]) {
  const map: Record<string, { total: number; count: number }> = {};
  transactions.forEach((tx) => {
    const type = classifyTransactionType(tx);
    if (!map[type]) map[type] = { total: 0, count: 0 };
    map[type].total += tx.amount;
    map[type].count += 1;
  });
  return Object.entries(map).map(([type, data]) => ({ type, ...data }));
}

// Top recipients (income) and senders (expense)
export function getTopRecipients(transactions: BankTransaction[], topN = 5) {
  const incomeTx = transactions.filter((tx) => tx.type === "income");
  const agg = aggregateByCounterparty(incomeTx);
  return agg.sort((a, b) => b.total - a.total).slice(0, topN);
}
export function getTopSenders(transactions: BankTransaction[], topN = 5) {
  const expenseTx = transactions.filter((tx) => tx.type === "expense");
  const agg = aggregateByCounterparty(expenseTx);
  return agg.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, topN);
}

// Recurring payments (same description, multiple times)
export function getRecurringPayments(transactions: BankTransaction[], minCount = 3) {
  const agg = aggregateByCounterparty(transactions);
  return agg.filter((a) => a.count >= minCount);
}

// Large transactions (top N by absolute value)
export function getLargeTransactions(transactions: BankTransaction[], topN = 5) {
  return [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, topN);
}

// Filter by date range
export function filterByDate(transactions: BankTransaction[], from: string, to: string) {
  return transactions.filter((tx) => tx.date >= from && tx.date <= to);
}

// Sum for a period
export function sumForPeriod(transactions: BankTransaction[], from: string, to: string) {
  const filtered = filterByDate(transactions, from, to);
  return filtered.reduce((sum, tx) => sum + tx.amount, 0);
}

export function getAverageIncome(transactions: BankTransaction[]) {
  const incomeTx = transactions.filter((tx) => tx.type === "income");
  if (incomeTx.length === 0) return 0;
  return incomeTx.reduce((sum, tx) => sum + tx.amount, 0) / incomeTx.length;
}

export function getAverageExpense(transactions: BankTransaction[]) {
  const expenseTx = transactions.filter((tx) => tx.type === "expense");
  if (expenseTx.length === 0) return 0;
  return expenseTx.reduce((sum, tx) => sum + tx.amount, 0) / expenseTx.length;
} 