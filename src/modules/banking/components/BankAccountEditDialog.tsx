import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";

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

  // Reset form when dialog opens/closes or initial data changes
  useEffect(() => {
    if (dialogOpen) {
      setBankName(initial?.bankName || "");
      setAccountNumber(initial?.accountNumber || "");
      setAccountName(initial?.accountName || "");
      setCurrency(initial?.currency || 'PLN');
      setType(initial?.type || "main");
      setIsDefault(initial?.isDefault || false);
    }
  }, [dialogOpen, initial]);

  const handleSave = () => {
    if (!bankName || !accountNumber) return;
    onSave({ bankName, accountNumber, accountName, currency, type, isDefault });
    if (!isControlled) {
      setOpen(false);
    }
  };

  const handleClose = () => {
    if (!isControlled) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj konto bankowe</DialogTitle>
          <DialogDescription>
            Wprowadź dane konta bankowego do zarządzania płatnościami.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="bankName">Nazwa banku</Label>
            <Input 
              id="bankName"
              value={bankName} 
              onChange={e => setBankName(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="accountNumber">Numer konta</Label>
            <Input 
              id="accountNumber"
              value={accountNumber} 
              onChange={e => setAccountNumber(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="accountName">Nazwa konta (opcjonalnie)</Label>
            <Input 
              id="accountName"
              value={accountName} 
              onChange={e => setAccountName(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="currency">Waluta</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PLN">PLN</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="type">Typ konta</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Główne</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
                <SelectItem value="tax">Podatkowe</SelectItem>
                <SelectItem value="other">Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="isDefault"
              checked={isDefault} 
              onCheckedChange={v => setIsDefault(!!v)} 
            />
            <Label htmlFor="isDefault">Ustaw jako domyślne</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Anuluj</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Zapisywanie..." : "Dodaj"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankAccountEditDialog; 