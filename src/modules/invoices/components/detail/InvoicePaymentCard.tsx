
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { InvoiceType } from "@/shared/types";

interface InvoicePaymentCardProps {
  paymentMethod: string;
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
  currency?: string;
}

export const InvoicePaymentCard: React.FC<InvoicePaymentCardProps> = ({
  paymentMethod,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  type,
  currency = 'PLN',
}) => {
  const isReceipt = type === InvoiceType.RECEIPT;
  
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base md:text-lg">Płatność</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4 px-4 py-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Metoda płatności</p>
          <p className="font-medium">
            {paymentMethod === "transfer" ? "Przelew" : 
             paymentMethod === "cash" ? "Gotówka" : 
             paymentMethod === "card" ? "Karta" : "Inna"}
          </p>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Wartość netto:</p>
            <p>{formatCurrency(totalNetValue || 0, currency)}</p>
          </div>
          {!isReceipt && (
            <div className="flex items-center justify-between text-sm mt-1">
              <p className="text-muted-foreground">Kwota VAT:</p>
              <p>{formatCurrency(totalVatValue || 0, currency)}</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-2 text-base font-bold">
            <p>Do zapłaty:</p>
            <p>{formatCurrency(totalGrossValue || 0, currency)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
