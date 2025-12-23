import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { InvoiceItem, InvoiceType } from "@/shared/types";
import { calculateItemValues, formatCurrency } from "@/shared/lib/invoice-utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
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

export interface InvoiceItemsCardProps {
  items: InvoiceItem[];
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
  currency?: string;
  fakturaBezVAT?: boolean;
}

export const InvoiceItemsCard: React.FC<InvoiceItemsCardProps> = ({
  items = [],
  totalNetValue = 0,
  totalVatValue = 0,
  totalGrossValue = 0,
  type = InvoiceType.SALES,
  currency = 'PLN',
  fakturaBezVAT = false,
}) => {
  // Process and validate invoice items
  const safeItems = React.useMemo<ProcessedInvoiceItem[]>(() => {
    // Ensure items is an array
    if (!Array.isArray(items)) {
      if (items && typeof items === 'object' && !Array.isArray(items)) {
        // If it's an object but not an array, try to convert it to an array
        return [items].filter(Boolean).map(processSingleItem);
      }
      return [];
    }

    if (items.length === 0) {
      console.log('Items array is empty');
      return [];
    }

    console.log('Processing items:', items);
    return items.filter(Boolean).map(processSingleItem);
    
    // Helper function to process a single item
    function processSingleItem(item: any): ProcessedInvoiceItem {
      try {
        console.log('Processing item:', item);
        
        // Skip invalid items
        if (!item || typeof item !== 'object') {
          console.warn('Skipping invalid item (not an object):', item);
          return createDefaultItem();
        }
    
        // Handle VAT rate conversion
        let vatRate: number;
        if (typeof item.vatRate === 'number') {
          vatRate = item.vatRate;
        } else if (typeof item.vatRate === 'string') {
          vatRate = parseFloat(item.vatRate) || 0;
        } else {
          vatRate = Number(item.vatRate) || 0;
        }
        
        // If VAT rate is -1 (zw), set it to 0 for calculations
        const isVatExempt = vatRate === -1;
        const calculationVatRate = isVatExempt ? 0 : vatRate;
        
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const name = item.name || item.description || 'Produkt bez nazwy';
        
        // Process each item to ensure it has all required fields
        const processedItem: ProcessedInvoiceItem = {
          id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          description: item.description || name, // Ensure description is set
          quantity: quantity,
          unitPrice: unitPrice,
          vatRate: vatRate, // Keep original vatRate for display
          unit: item.unit || 'szt.',
          productId: item.productId,
          totalNetValue: 0,
          totalVatValue: 0,
          totalGrossValue: 0,
          ...item // Spread to preserve any additional properties
        };
    
        console.log('Processed item before calculation:', processedItem);
    
        try {
          // Calculate values using the utility function
          const calculated = calculateItemValues({
            ...processedItem,
            vatRate: calculationVatRate // Use 0 for VAT-exempt items
          });
    
          // Update the processed item with calculated values
          return {
            ...processedItem,
            totalNetValue: calculated.totalNetValue,
            totalVatValue: calculated.totalVatValue,
            totalGrossValue: calculated.totalGrossValue
          };
          
        } catch (calcError) {
          console.error('Error in calculateItemValues:', calcError);
          // Fallback calculation if the utility function fails
          const netValue = quantity * unitPrice;
          // For VAT-exempt items, totalVatValue should be 0
          const vatValue = isVatExempt ? 0 : netValue * (calculationVatRate / 100);
          
          return {
            ...processedItem,
            totalNetValue: netValue,
            totalVatValue: vatValue,
            totalGrossValue: netValue + vatValue
          };
        }
      } catch (error) {
        console.error('Error processing invoice item:', error, 'Item:', item);
        return createDefaultItem();
      }
    }
    
    function createDefaultItem(): ProcessedInvoiceItem {
      return {
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Nieprawidłowa pozycja',
        description: 'Nieprawidłowa pozycja',
        quantity: 0,
        unitPrice: 0,
        vatRate: 0,
        unit: 'szt.',
        totalNetValue: 0,
        totalVatValue: 0,
        totalGrossValue: 0
      };
    }
  }, [items]);
  
  // Debug logging removed for production
  // console.log('Rendering InvoiceItemsCard - items:', items ? items.length : 'not an array');
  
  const isMobile = useIsMobile();
  const isReceipt = type === InvoiceType.RECEIPT;
  const shouldHideVat = isReceipt || fakturaBezVAT;
  
  console.log('Rendering InvoiceItemsCard - isMobile:', isMobile, 'isReceipt:', isReceipt);
  
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
    console.log('Rendering mobile items. Safe items count:', safeItems.length);
    if (safeItems.length === 0) {
      console.log('No safe items to render. Raw items:', items);
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
            style={{ overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
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
              <p>{formatCurrency(item.unitPrice, currency)}</p>
            </div>
            {!shouldHideVat && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.vatRate === VAT_EXEMPT ? 'zw.' : `${item.vatRate}%`}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="netto-label">Wartość netto:</p>
              <p className="netto-value">{formatCurrency(item.totalNetValue || 0, currency)}</p>
            </div>
            {!shouldHideVat && (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Kwota VAT:</p>
                <p>{formatCurrency(item.totalVatValue || 0, currency)}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Wartość brutto:</p>
              <p className="font-medium">{formatCurrency(item.totalGrossValue || 0, currency)}</p>
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
        <table className="w-full text-sm border-collapse">
          <colgroup>
            <col className="w-12" />
            <col className="w-1/4" />
            <col className="w-16" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-20" />
            {!shouldHideVat && <col className="w-16" />}
            {!shouldHideVat && <col className="w-20" />}
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-medium border-b w-12">Lp.</th>
              <th className="px-3 py-2 text-left text-xs font-medium border-b w-1/4">Nazwa</th>
              <th className="px-3 py-2 text-right text-xs font-medium border-b w-16">Ilość</th>
              <th className="px-3 py-2 text-right text-xs font-medium border-b">Jednostka</th>
              <th className="px-3 py-2 text-right text-xs font-medium border-b">Cena netto</th>
              <th className="px-3 py-2 text-right text-xs font-medium border-b">Wartość netto</th>
              {!shouldHideVat && <th className="px-3 py-2 text-center text-xs font-medium border-b">Stawka VAT</th>}
              {!shouldHideVat && <th className="px-3 py-2 text-right text-xs font-medium border-b">Kwota VAT</th>}
              <th className="px-3 py-2 text-right text-xs font-medium border-b">Wartość brutto</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((item, index) => (
              <tr key={item.id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2" style={{ whiteSpace: 'pre-wrap' }}>{item.name}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{item.unit}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.totalNetValue || 0, currency)}</td>
                {!shouldHideVat && <td className="px-3 py-2 text-center">{item.vatRate === -1 ? 'zw' : `${item.vatRate}%`}</td>}
                {!shouldHideVat && <td className="px-3 py-2 text-right">{formatCurrency(item.totalVatValue || 0, currency)}</td>}
                <td className="px-3 py-2 text-right">{formatCurrency(item.totalGrossValue || 0, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2">
              <td colSpan={shouldHideVat ? 4 : 5} className="px-3 py-2 text-right">Razem:</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totalNetValue || 0, currency)}</td>
              {!shouldHideVat && <td></td>}
              {!shouldHideVat && <td className="px-3 py-2 text-right">{formatCurrency(safeItems.reduce((sum, item) => sum + (item.vatRate === -1 ? 0 : item.totalVatValue || 0), 0), currency)}</td>}
              <td className="px-3 py-2 text-right">{formatCurrency(safeItems.reduce((sum, item) => sum + (item.vatRate === -1 ? item.totalNetValue : item.totalGrossValue || 0), 0), currency)}</td>
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
          <span className="text-foreground">{formatCurrency(totalNetValue || 0, currency)}</span>
        </div>
        {!shouldHideVat && (
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Razem VAT:</span>
            <span className="text-foreground">{formatCurrency(totalVatValue || 0, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span className="text-foreground">Razem brutto:</span>
          <span className="text-foreground">{formatCurrency(totalGrossValue || 0, currency)}</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {isMobile ? renderMobileItems() : renderDesktopItems()}

      {isMobile && renderMobileSummary()}

      {!isMobile && (
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wartość netto:</span>
              <span>{formatCurrency(totalNetValue, currency)}</span>
            </div>
            {!shouldHideVat && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kwota VAT:</span>
                <span>{formatCurrency(totalVatValue, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Wartość brutto:</span>
              <span>{formatCurrency(totalGrossValue, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoizedInvoiceItemsCard = React.memo(InvoiceItemsCard);

export default MemoizedInvoiceItemsCard;