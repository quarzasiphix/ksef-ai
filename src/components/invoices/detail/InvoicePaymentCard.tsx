
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/invoice-utils";
import { InvoiceType } from "@/types";

interface InvoicePaymentCardProps {
  paymentMethod: string;
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
}

export const InvoicePaymentCard: React.FC<InvoicePaymentCardProps> = ({
  paymentMethod,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  type,
}) => {
  const isReceipt = type === InvoiceType.RECEIPT;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Płatność</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Metoda płatności</p>
          <p className="font-medium">
            {paymentMethod === "transfer" ? "Przelew" : 
             paymentMethod === "cash" ? "Gotówka" : 
             paymentMethod === "card" ? "Karta" : "Inna"}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Wartość netto:</p>
            <p className="font-medium">{formatCurrency(totalNetValue || 0)}</p>
          </div>
          {!isReceipt && (
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-medium text-muted-foreground">Kwota VAT:</p>
              <p className="font-medium">{formatCurrency(totalVatValue || 0)}</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-2 text-base md:text-lg font-bold">
            <p>Do zapłaty:</p>
            <p>{formatCurrency(totalGrossValue || 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
