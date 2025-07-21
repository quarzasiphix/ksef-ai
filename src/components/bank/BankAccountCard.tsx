import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BankAccount } from "@/types/bank";
import { Banknote, X, Pencil } from "lucide-react";

interface Props {
  account: BankAccount;
  selected?: boolean;
  onSelect: () => void;
  onDisconnect: () => void;
  onEdit?: () => void;
}

const BankAccountCard: React.FC<Props> = ({ account, selected, onSelect, onDisconnect, onEdit }) => (
  <Card
    className={`p-4 cursor-pointer border-2 ${selected ? "border-blue-600" : "border-muted"}`}
    onClick={onSelect}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Banknote className="h-5 w-5 text-green-600" />
        <span className="font-semibold">{account.accountName}</span>
      </div>
      <div className="flex items-center gap-1">
        {onEdit && (
          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDisconnect(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="text-xs text-muted-foreground mt-1">{account.accountNumber}</div>
    <div className="mt-2 text-lg font-bold">{account.balance.toLocaleString("pl-PL", { style: "currency", currency: account.currency })}</div>
  </Card>
);

export default BankAccountCard; 