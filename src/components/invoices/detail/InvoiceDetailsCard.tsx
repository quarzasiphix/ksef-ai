
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPolishDate } from "@/lib/invoice-utils";
import { InvoiceType } from "@/types";

interface InvoiceDetailsCardProps {
  number: string;
  issueDate: string;
  dueDate: string;
  sellDate: string;
  isPaid: boolean;
  ksef?: {
    status: 'pending' | 'sent' | 'error' | 'none';
    referenceNumber?: string;
  };
  comments?: string;
  type: InvoiceType;
}

export const InvoiceDetailsCard: React.FC<InvoiceDetailsCardProps> = ({
  number,
  issueDate,
  dueDate,
  sellDate,
  isPaid,
  ksef,
  comments,
  type,
}) => {
  const isReceipt = type === InvoiceType.RECEIPT;
  
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base md:text-lg">Szczegóły dokumentu</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 md:gap-3 text-sm px-4 py-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Numer dokumentu</p>
          <p className="font-medium">{number}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Data wystawienia</p>
          <p className="font-medium">{formatPolishDate(issueDate)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Termin płatności</p>
          <p className="font-medium">{formatPolishDate(dueDate)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Data sprzedaży</p>
          <p className="font-medium">{formatPolishDate(sellDate)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Status płatności</p>
          <span 
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              isPaid
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isPaid ? "Zapłacono" : "Oczekuje"}
          </span>
        </div>
        {!isReceipt && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Status KSeF</p>
            <span 
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                ksef?.status === "sent"
                  ? "bg-green-100 text-green-800"
                  : ksef?.status === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {ksef?.status === "sent"
                ? "Wysłano"
                : ksef?.status === "pending"
                ? "Oczekuje"
                : "Brak"}
            </span>
          </div>
        )}
        {!isReceipt && ksef?.referenceNumber && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Nr referencyjny KSeF</p>
            <p className="font-medium">{ksef.referenceNumber}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-xs font-medium text-muted-foreground">Uwagi</p>
          <p className="text-sm">{comments || "Brak uwag"}</p>
        </div>
      </CardContent>
    </Card>
  );
};
