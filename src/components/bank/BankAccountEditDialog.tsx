import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export const BankAccountEditDialog = ({
  onSave,
  trigger,
  initial,
  loading = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  onSave: (data: any) => void;
  trigger?: React.ReactNode;
  initial?: any;
  loading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const dialogOpen = isControlled ? controlledOpen : open;
  const setDialogOpen = isControlled ? controlledOnOpenChange : setOpen;
  const [bankName, setBankName] = useState(initial?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber || "");
  const [accountName, setAccountName] = useState(initial?.accountName || "");
  const [currency, setCurrency] = useState(initial?.currency || 'PLN');
  const [type, setType] = useState(initial?.type || "main");
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);

  const handleSave = () => {
    if (!bankName || !accountNumber) return;
    onSave({ bankName, accountNumber, accountName, currency, type, isDefault });
    setOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj konto bankowe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Nazwa banku</Label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} />
          </div>
          <div>
            <Label>Numer konta</Label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          </div>
          <div>
            <Label>Nazwa konta (opcjonalnie)</Label>
            <Input value={accountName} onChange={e => setAccountName(e.target.value)} />
          </div>
          <div>
            <Label>Waluta</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PLN">PLN</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Typ konta</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Główne</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
                <SelectItem value="tax">Podatkowe</SelectItem>
                <SelectItem value="other">Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isDefault} onCheckedChange={v => setIsDefault(!!v)} />
            <Label>Ustaw jako domyślne</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Zapisywanie..." : "Dodaj"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankAccountEditDialog; 