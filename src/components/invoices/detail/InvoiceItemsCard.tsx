import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvoiceItem, InvoiceType } from "@/types";
import { formatCurrency } from "@/lib/invoice-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import "./invoiceDetail.css";

interface InvoiceItemsCardProps {
  items: InvoiceItem[];
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
}

export const InvoiceItemsCard: React.FC<InvoiceItemsCardProps> = ({
  items,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  type,
}) => {
  const isMobile = useIsMobile();
  const isReceipt = type === InvoiceType.RECEIPT;

  // Mobile view for invoice items
  const renderMobileItems = () => {
    return items.map((item, index) => (
      <Card key={item.id} className="mb-3">
        <CardContent className="p-3">
          <div 
            className="font-medium text-base mb-2" 
            style={{ overflowWrap: 'break-word' }}
          >
            {index + 1}. {item.name}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Ilość:</p>
              <p>{item.quantity} {item.unit}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Cena netto:</p>
              <p>{formatCurrency(item.unitPrice)}</p>
            </div>
            {!isReceipt && (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">VAT:</p>
                <p>{item.vatRate}%</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="netto-label">Wartość netto:</p>
              <p className="netto-value">{formatCurrency(item.totalNetValue || 0)}</p>
            </div>
            {!isReceipt && (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Kwota VAT:</p>
                <p>{formatCurrency(item.totalVatValue || 0)}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Wartość brutto:</p>
              <p className="font-medium">{formatCurrency(item.totalGrossValue || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  // Desktop view for invoice items
  const renderDesktopItems = () => {
    return (
      <div className="invoice-table-container overflow-x-auto">
        <table className="invoice-table w-full">
          <thead>
            <tr>
              <th>Lp.</th>
              <th>Nazwa</th>
              <th>Ilość</th>
              <th>Jednostka</th>
              <th>Cena netto</th>
              <th>Wartość netto</th>
              {!isReceipt && <th>Stawka VAT</th>}
              {!isReceipt && <th>Kwota VAT</th>}
              <th>Wartość brutto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td className="netto-value">{formatCurrency(item.totalNetValue || 0)}</td>
                {!isReceipt && <td>{item.vatRate}%</td>}
                {!isReceipt && <td>{formatCurrency(item.totalVatValue || 0)}</td>}
                <td>{formatCurrency(item.totalGrossValue || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={isReceipt ? 5 : 7} className="text-right">Razem:</td>
              <td>{formatCurrency(totalNetValue || 0)}</td>
              {!isReceipt && <td>{formatCurrency(totalVatValue || 0)}</td>}
              <td>{formatCurrency(totalGrossValue || 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // Mobile summary for totals
  const renderMobileSummary = () => {
    return (
      <div className="bg-muted p-3 rounded-md mt-4">
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Razem netto:</span>
          <span className="text-foreground">{formatCurrency(totalNetValue || 0)}</span>
        </div>
        {!isReceipt && (
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Razem VAT:</span>
            <span className="text-foreground">{formatCurrency(totalVatValue || 0)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span className="text-foreground">Razem brutto:</span>
          <span className="text-foreground">{formatCurrency(totalGrossValue || 0)}</span>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">Pozycje na dokumencie</CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? "px-3 py-2" : "px-0 py-2 sm:px-3"}>
        {isMobile ? (
          <>
            {renderMobileItems()}
            {renderMobileSummary()}
          </>
        ) : (
          renderDesktopItems()
        )}
      </CardContent>
    </Card>
  );
};
