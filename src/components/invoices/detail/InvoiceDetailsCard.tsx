import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPolishDate, getPolishPaymentMethod } from "@/lib/invoice-utils";
import { InvoiceType, VatExemptionReason } from "@/types";

export interface InvoiceDetailsCardProps {
  paymentMethod: string; // Added payment method prop
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
  bankAccount?: string; // Added bank account prop
  vat: boolean; // Add vat prop
  vatExemptionReason?: VatExemptionReason; // Add vatExemptionReason prop
}

export const InvoiceDetailsCard: React.FC<InvoiceDetailsCardProps> = ({
  number,
  issueDate,
  dueDate,
  sellDate,
  paymentMethod,
  isPaid,
  ksef,
  comments,
  type,
  bankAccount,
  vat, // Destructure vat prop
  vatExemptionReason, // Destructure vatExemptionReason
}) => {
  const isReceipt = type === InvoiceType.RECEIPT;
  
  console.log('InvoiceDetailsCard - Received VAT prop:', vat);

  return (
    <Card>
      <CardHeader className="py-2.5 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base md:text-lg">Szczegóły dokumentu</CardTitle>
      </CardHeader>
      {/* Changed grid-cols-2 to sm:grid-cols-2 md:grid-cols-4 for wider screens */}
      {/* Retain 2 columns for small screens, expand to 4 for medium and larger */}
      <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-1 px-3 py-2 text-xs sm:gap-x-2.5 sm:gap-y-1.5 md:text-sm">
        <div>
          <p className="font-medium text-muted-foreground">Numer dokumentu</p>
          <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{number}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Data wystawienia</p>
          <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{formatPolishDate(issueDate)}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Termin płatności</p>
          <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{formatPolishDate(dueDate)}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Metoda płatności</p>
          <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{getPolishPaymentMethod(paymentMethod)}</p>
          {(paymentMethod === 'przelew' || paymentMethod === 'transfer') && bankAccount && (
            <p className="font-medium text-muted-foreground mt-1">Numer konta: <span className="font-semibold">{bankAccount}</span></p>
          )}
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Data sprzedaży</p>
          <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{formatPolishDate(sellDate)}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Status płatności</p>
          <span 
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium ${
              isPaid
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isPaid ? "Zapłacono" : "Oczekuje"}
          </span>
        </div>
        {/* Display VAT Status */}
        {!isReceipt && (
           <div>
             <p className="font-medium text-muted-foreground">Status VAT</p>
             <span
               className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium ${
                 vat
                   ? "bg-green-100 text-green-800" // Assuming green for taxable
                   : "bg-gray-100 text-gray-800" // Assuming gray for exempt
               }`}
             >
               {vat ? "Opodatkowana" : "Zwolniona z VAT"}
             </span>
           </div>
         )}
        {!isReceipt && (
          <div>
            <p className="font-medium text-muted-foreground">Status KSeF</p>
            <span 
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium ${
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
        {ksef?.referenceNumber && !isReceipt && (
          <div className="col-span-2 md:col-span-2">
            <p className="font-medium text-muted-foreground">Nr referencyjny KSeF</p>
            <p className="font-semibold" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{ksef.referenceNumber}</p>
          </div>
        )}
        <div className="col-span-2 md:col-span-4">
          <p className="font-medium text-muted-foreground">Uwagi</p>
          <p className="text-[11px] sm:text-xs" style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>{comments || "Brak uwag"}</p>
        </div>
      </CardContent>
    </Card>
  );
};
