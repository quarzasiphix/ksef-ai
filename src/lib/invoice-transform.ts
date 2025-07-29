import { Invoice } from "@/types";
import { toPaymentMethodUi } from "./invoice-utils";

export const transformInvoiceForForm = (invoiceData: Invoice | null) => {
  if (!invoiceData) return null;
  
  // Convert payment method to UI format
  const paymentMethod = toPaymentMethodUi(invoiceData.paymentMethod as any);
  
  // Create a new object with the transformed data
  const formData = {
    ...invoiceData,
    // Ensure all required fields have proper values
    number: invoiceData.number || '',
    issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    sellDate: invoiceData.sellDate || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
    paymentMethod,
    customerId: invoiceData.customerId || '',
    businessProfileId: invoiceData.businessProfileId || '',
    transactionType: invoiceData.transactionType,
    type: invoiceData.type,
    vat: invoiceData.vat ?? true,
    vatExemptionReason: invoiceData.vatExemptionReason || null,
    currency: invoiceData.currency || 'PLN',
    exchangeRate: Number(invoiceData.exchangeRate) || 1,
    exchangeRateDate: invoiceData.exchangeRateDate || new Date().toISOString().split('T')[0],
    exchangeRateSource: invoiceData.exchangeRateSource || 'NBP',
    totalNetValue: Number(invoiceData.totalNetValue) || 0,
    totalVatValue: Number(invoiceData.totalVatValue) || 0,
    totalGrossValue: Number(invoiceData.totalGrossValue) || 0,
    isPaid: invoiceData.isPaid || false,
    status: invoiceData.status || 'draft',
    comments: invoiceData.comments || '',
    // Ensure items is always an array with proper values
    items: (invoiceData.items || []).map(item => ({
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      vatRate: item.vatRate || 0,
      unit: item.unit || 'szt.',
      totalNetValue: Number(item.totalNetValue) || 0,
      totalVatValue: Number(item.totalVatValue) || 0,
      totalGrossValue: Number(item.totalGrossValue) || 0,
    })),
  };
  
  return formData;
};
