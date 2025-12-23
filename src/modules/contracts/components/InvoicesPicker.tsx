import React, { useState } from "react";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";

interface Props {
  selected: string[];
  onAdd: (id: string) => void;
  label?: string;
}

const InvoicesPicker: React.FC<Props> = ({ selected, onAdd, label = "Dodaj fakturę" }) => {
  const { invoices: { data: invoices } } = useGlobalData();
  const [invoiceId, setInvoiceId] = useState("");

  const available = invoices.filter((inv) => !selected.includes(inv.id));
  if (available.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={invoiceId} onValueChange={setInvoiceId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Wybierz fakturę" />
        </SelectTrigger>
        <SelectContent>
          {available.map((inv) => (
            <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!invoiceId} onClick={() => { onAdd(invoiceId); setInvoiceId(""); }}>
        {label}
      </Button>
    </div>
  );
};

export default InvoicesPicker; 