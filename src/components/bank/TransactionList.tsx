import React from "react";
import { BankTransaction } from "@/types/bank";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Props {
  transactions: BankTransaction[];
}

const TransactionList: React.FC<Props> = ({ transactions }) => (
  <div className="divide-y">
    {transactions.length === 0 && <div className="text-sm text-muted-foreground">Brak transakcji</div>}
    {transactions.map((t) => (
      <div key={t.id} className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {t.type === "income" ? (
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">{t.description}</div>
            <div className="text-xs text-muted-foreground">{t.date}</div>
          </div>
        </div>
        <div className={`font-bold ${t.type === "income" ? "text-green-700" : "text-red-700"}`}>
          {t.amount.toLocaleString("pl-PL", { style: "currency", currency: t.currency })}
        </div>
      </div>
    ))}
  </div>
);

export default TransactionList; 