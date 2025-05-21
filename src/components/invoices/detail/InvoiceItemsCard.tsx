import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceItem, InvoiceType } from "@/types";
import { calculateItemValues, formatCurrency } from "@/lib/invoice-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import "./invoiceDetail.css";

// Define valid VAT rates as numbers to avoid VatType enum issues
const VALID_VAT_RATES = [0, 5, 8, 23, -1] as const;
const VAT_EXEMPT = -1;

// Create a new type that ensures all required fields are present and properly typed
type ProcessedInvoiceItem = {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // Always use number type
  unit: string;
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  [key: string]: any; // Allow additional properties
};

// Helper function to safely convert vatRate to number
const toNumberVatRate = (rate: unknown): number => {
  if (typeof rate === 'number') return rate;
  const num = Number(rate);
  return isNaN(num) ? 23 : num; // Default to 23% if invalid
};

interface InvoiceItemsCardProps {
  items: InvoiceItem[];
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
}

export const InvoiceItemsCard: React.FC<InvoiceItemsCardProps> = ({
  items = [],
  totalNetValue = 0,
  totalVatValue = 0,
  totalGrossValue = 0,
  type = InvoiceType.SALES,
}) => {
  // Process and validate invoice items
  const safeItems = React.useMemo<ProcessedInvoiceItem[]>(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Raw items received in InvoiceItemsCard:', items);
    }

    // Ensure items is an array
    if (!Array.isArray(items)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Items is not an array:', items);
      }
      return [];
    }

    // Process each item to ensure all required fields are present and properly calculated
    return items.reduce<ProcessedInvoiceItem[]>((acc, item) => {
      try {
        // Skip invalid items
        if (!item || typeof item !== 'object') {
          console.warn('Skipping invalid item (not an object):', item);
          return acc;
        }

        const vatRate = toNumberVatRate(item.vatRate);

        // Process each item to ensure it has all required fields
        const processedItem: ProcessedInvoiceItem = {
          id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || 'Produkt bez nazwy',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          vatRate: vatRate,
          unit: item.unit || 'szt.',
          productId: item.productId,
          totalNetValue: 0,
          totalVatValue: 0,
          totalGrossValue: 0,
          ...item // Spread to preserve any additional properties
        };

        // Calculate values using the utility function
        const calculated = calculateItemValues({
          ...processedItem,
          description: processedItem.name // Add required description field
        });

        // Update the processed item with calculated values
        processedItem.totalNetValue = calculated.totalNetValue;
        processedItem.totalVatValue = calculated.totalVatValue;
        processedItem.totalGrossValue = calculated.totalGrossValue;

        return [...acc, calculated as ProcessedInvoiceItem];
      } catch (error) {
        console.error('Error processing invoice item:', error, 'Item:', item);
        return acc;
      }
    }, []);
  }, [items]);
  
  const isMobile = useIsMobile();
  const isReceipt = type === InvoiceType.RECEIPT;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Items in InvoiceItemsCard:', {
      rawItems: items,
      safeItems,
      type,
      isReceipt,
      hasItems: items && items.length > 0,
      hasSafeItems: safeItems.length > 0
    });
  }

  // Mobile view for invoice items
  const renderMobileItems = () => {
    if (safeItems.length === 0) {
      return (
        <div className="text-muted-foreground text-center py-4">
          <p>Brak pozycji do wyświetlenia</p>
        </div>
      );
    }
    
    return safeItems.map((item, index) => (
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
                <span className="text-xs text-muted-foreground">
                  {item.vatRate === VAT_EXEMPT ? 'zw.' : `${item.vatRate}%`}
                </span>
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
    if (!safeItems || safeItems.length === 0) {
      return (
        <div className="text-muted-foreground text-center py-4">
          <p>Brak pozycji na fakturze</p>
        </div>
      );
    }
    
    return (
      <div className="w-full">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-12" />
            <col className="min-w-[200px]" />
            <col className="w-24 text-right" />
            <col className="w-24 text-right" />
            <col className="w-28 text-right" />
            <col className="w-28 text-right" />
            {!isReceipt && <col className="w-24 text-center" />}
            {!isReceipt && <col className="w-28 text-right" />}
            <col className="w-32 text-right" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Lp.</th>
              <th className="text-left">Nazwa</th>
              <th className="text-right">Ilość</th>
              <th className="text-right">Jednostka</th>
              <th className="text-right">Cena netto</th>
              <th className="text-right">Wartość netto</th>
              {!isReceipt && <th className="text-center">Stawka VAT</th>}
              {!isReceipt && <th className="text-right">Kwota VAT</th>}
              <th className="text-right">Wartość brutto</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{item.unit}</td>
                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right">{formatCurrency(item.totalNetValue || 0)}</td>
                {!isReceipt && <td className="text-center">{item.vatRate === -1 ? 'zw' : `${item.vatRate}%`}</td>}
                {!isReceipt && <td className="text-right">{formatCurrency(item.totalVatValue || 0)}</td>}
                <td className="text-right">{formatCurrency(item.totalGrossValue || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t">
              <td colSpan={isReceipt ? 4 : 5} className="text-right pr-4">Razem:</td>
              <td className="text-right pr-2">{formatCurrency(totalNetValue || 0)}</td>
              {!isReceipt && <td></td>}
              {!isReceipt && <td className="text-right pr-2">{formatCurrency(totalVatValue || 0)}</td>}
              <td className="text-right pr-2">{formatCurrency(totalGrossValue || 0)}</td>
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
    <div className="w-full">
      {isMobile ? (
        <div>
          {renderMobileItems()}
          {safeItems.length > 0 && renderMobileSummary()}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          {renderDesktopItems()}
        </div>
      )}
    </div>
  );
};
