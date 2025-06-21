import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Bank, BankAccount, BankTransaction } from "@/types/bank";
import ConnectBankDialog from "./ConnectBankDialog";
import BankAccountCard from "./BankAccountCard";
import TransactionList from "./TransactionList";
import ImportBankStatementDialog from "./ImportBankStatementDialog";
import BankAnalyticsDashboard from "./BankAnalyticsDashboard";

// Mock data for demonstration
const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: "1",
    bank: Bank.MBANK,
    accountNumber: "12 1140 2004 0000 3002 0135 1234",
    accountName: "Konto firmowe mBank",
    balance: 12345.67,
    currency: "PLN",
    connectedAt: new Date().toISOString(),
  },
];
const MOCK_TRANSACTIONS: BankTransaction[] = [
  {
    id: "t1",
    accountId: "1",
    date: "2024-07-01",
    description: "Wpłata od klienta XYZ",
    amount: 2500,
    currency: "PLN",
    type: "income",
    counterparty: "XYZ Sp. z o.o.",
    category: "Przychód",
  },
  {
    id: "t2",
    accountId: "1",
    date: "2024-07-02",
    description: "Opłata za serwer",
    amount: -200,
    currency: "PLN",
    type: "expense",
    counterparty: "OVH Polska",
    category: "Koszty stałe",
  },
];

const BankAccountsSection: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(accounts[0] || null);
  const [showDialog, setShowDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>(MOCK_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const handleConnectBank = (account: BankAccount) => {
    setAccounts((prev) => [...prev, account]);
    setSelectedAccount(account);
    toast.success("Połączono z bankiem!");
    console.log("Connected bank account:", account);
  };

  const handleDisconnect = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccount(null);
    toast("Odłączono konto bankowe");
    console.log("Disconnected account:", id);
  };

  const handleImport = (txs: BankTransaction[]) => {
    setTransactions((prev) => [...prev, ...txs]);
    toast.success(`Dodano ${txs.length} transakcji`);
  };

  const selectedTransactions = selectedAccount ? transactions.filter((t) => t.accountId === selectedAccount.id) : [];
  const filteredTransactions = filterType === 'all' ? selectedTransactions : selectedTransactions.filter(t => t.type === filterType);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Konta bankowe</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowDialog(true)}>Połącz bank</Button>
          {selectedAccount && (
            <Button variant="outline" onClick={() => setShowImport(true)}>
              Importuj wyciąg (CSV)
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map((acc) => (
          <BankAccountCard
            key={acc.id}
            account={acc}
            selected={selectedAccount?.id === acc.id}
            onSelect={() => setSelectedAccount(acc)}
            onDisconnect={() => handleDisconnect(acc.id)}
          />
        ))}
      </div>
      {/* Show analytics dashboard for selected account if there are any transactions */}
      {selectedAccount && selectedTransactions.length > 0 && (
        <BankAnalyticsDashboard
          transactions={selectedTransactions}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
        />
      )}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Transakcje – {selectedAccount.accountName}</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={filteredTransactions} />
          </CardContent>
        </Card>
      )}
      <ConnectBankDialog open={showDialog} onOpenChange={setShowDialog} onConnect={handleConnectBank} />
      {selectedAccount && (
        <ImportBankStatementDialog
          open={showImport}
          onOpenChange={setShowImport}
          accountId={selectedAccount.id}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default BankAccountsSection; 