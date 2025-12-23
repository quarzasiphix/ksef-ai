import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Bank, BankAccount } from "@/modules/banking/bank";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (account: BankAccount) => void;
}

const banks = Object.values(Bank);

const ConnectBankDialog: React.FC<Props> = ({ open, onOpenChange, onConnect }) => {
  const [selected, setSelected] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!selected) return toast.error("Wybierz bank");
    setLoading(true);
    setTimeout(() => {
      const mockAccount: BankAccount = {
        id: Math.random().toString(36).slice(2),
        bank: selected,
        accountNumber: "12 1234 5678 9012 3456 7890 1234",
        accountName: `Konto w ${selected}`,
        balance: 10000 + Math.random() * 5000,
        currency: "PLN",
        connectedAt: new Date().toISOString(),
      };
      onConnect(mockAccount);
      setLoading(false);
      onOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Połącz z bankiem</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {banks.map((b) => (
            <Button
              key={b}
              variant={selected === b ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelected(b)}
              disabled={loading}
            >
              {b}
            </Button>
          ))}
        </div>
        <Button className="w-full mt-2" onClick={handleConnect} disabled={loading}>
          {loading ? "Łączenie..." : "Połącz"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectBankDialog; 