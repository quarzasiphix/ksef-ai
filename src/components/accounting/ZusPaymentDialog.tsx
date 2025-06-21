import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { ZusPayment, ZusType } from "@/types/zus";

const ZUS_TYPES: ZusType[] = ["społeczne", "zdrowotne", "FP", "FGŚP", "inne"];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Generate a list of months for the last 2 years and next 1 year
function getMonthOptions() {
  const months: string[] = [];
  const now = new Date();
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

interface ZusPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ZusPayment, "id" | "createdAt" | "updatedAt" | "userId">) => void;
  initialValue?: Partial<ZusPayment>;
}

const ZusPaymentDialog: React.FC<ZusPaymentDialogProps> = ({ open, onClose, onSave, initialValue }) => {
  const [zusType, setZusType] = useState<ZusType>(initialValue?.zusType || "społeczne");
  const [amount, setAmount] = useState(initialValue?.amount?.toString() || "");
  const [isPaid, setIsPaid] = useState(initialValue?.isPaid || false);
  const [paidAt, setPaidAt] = useState(initialValue?.paidAt || "");
  const [month, setMonth] = useState(initialValue?.month || getCurrentMonth());
  const monthOptions = getMonthOptions();

  const handleSave = () => {
    if (!amount || isNaN(Number(amount))) return;
    onSave({
      zusType,
      amount: Number(amount),
      isPaid,
      paidAt: isPaid && paidAt ? paidAt : undefined,
      businessProfileId: initialValue?.businessProfileId,
      month,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edytuj płatność ZUS" : "Dodaj płatność ZUS"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-1">Miesiąc</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz miesiąc" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Typ ZUS</label>
            <Select value={zusType} onValueChange={v => setZusType(v as ZusType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz typ ZUS" />
              </SelectTrigger>
              <SelectContent>
                {ZUS_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kwota</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} step={0.01} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPaid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
            <label htmlFor="isPaid" className="text-sm">Opłacone</label>
            {isPaid && (
              <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="ml-2" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!amount || isNaN(Number(amount))}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ZusPaymentDialog; 