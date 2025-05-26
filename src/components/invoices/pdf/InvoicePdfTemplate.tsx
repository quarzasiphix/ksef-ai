import toWords from 'numbers-to-words-pl';
import React from 'react';
import { Invoice, InvoiceType, BusinessProfile, Customer, PaymentMethod, PaymentMethodDb } from '@/types';
import { calculateItemValues, calculateInvoiceTotals, formatCurrency as formatCurrencyUtil, getPolishPaymentMethod, toPaymentMethodUi } from '@/lib/invoice-utils';

// Helper to check for transfer payment method robustly
function isTransfer(paymentMethod: string | PaymentMethod | PaymentMethodDb): boolean {
    const method = typeof paymentMethod === 'string' ? paymentMethod : toPaymentMethodUi(paymentMethod);
    return method === PaymentMethod.TRANSFER || method === 'przelew' || method === 'transfer';
}

const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN'
    }).format(value);
};

const formatPercent = (value: number) => {
    return `${value}%`;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

// Format amount in words with proper handling of grosze
const formatAmountInWords = (amount: number) => {
    const zlote = Math.floor(amount);
    const grosze = Math.round((amount - zlote) * 100);

    let result = toWords(zlote);

    // Handle złoty forms
    if (zlote === 1) {
        result += ' złoty';
    } else if (zlote % 10 >= 2 && zlote % 10 <= 4 && (zlote % 100 < 10 || zlote % 100 >= 20)) {
        result += ' złote';
    } else {
        result += ' złotych';
    }

    // Handle grosze
    if (grosze > 0) {
        if (grosze === 1) {
            result += ` ${toWords(grosze)} grosz`;
        } else if (grosze % 10 >= 2 && grosze % 10 <= 4 && (grosze % 100 < 10 || grosze % 100 >= 20)) {
            result += ` ${toWords(grosze)} grosze`;
        } else {
            result += ` ${toWords(grosze)} groszy`;
        }
    }

    return result;
};

export function formatPolishDate(date: Date | string | null | undefined) {
    if (!date) return "—";
    try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return "—";
    }
};

interface InvoicePdfTemplateProps {
    invoice: Invoice;
    businessProfile: BusinessProfile;
    customer: Customer;
}

const getInvoiceTypeTitle = (type: InvoiceType) => {
    switch (type) {
        case InvoiceType.SALES:
            return "Faktura VAT";
        case InvoiceType.RECEIPT:
            return "Rachunek";
        case InvoiceType.PROFORMA:
            return "Faktura proforma";
        case InvoiceType.CORRECTION:
            return "Faktura korygująca";
        default:
            return "Dokument";
    }
};

// Calculate scale based on screen width to maintain consistent size
const calculateScale = () => {
    if (typeof window === 'undefined') return 1;
    const screenWidth = window.innerWidth;
    // Base width is 794px (A4)
    const baseWidth = 794;
    // On mobile, we want to scale down more aggressively
    if (screenWidth <= 480) {
        return 0.4; // Fixed scale for mobile
    } else if (screenWidth <= 768) {
        return 0.6; // Fixed scale for tablets
    } else if (screenWidth <= 1024) {
        return 0.8; // Fixed scale for small laptops
    }
    return 1; // Default scale for larger screens
};

const SCALE = calculateScale();

const pdfStyles: Record<string, React.CSSProperties> = {
    container: {
        width: '100%',
        minHeight: '100%',
        margin: 0,
        padding: '40px 32px',
        fontFamily: 'Arial, sans-serif',
        color: '#1a1a1a',
        fontSize: '16px',
        boxSizing: 'border-box',
        backgroundColor: 'white',
        pageBreakInside: 'avoid',
        overflow: 'visible',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '40px',
        fontSize: '32px',
        fontWeight: 'bold'
    },
    section: {
        marginBottom: '32px',
        width: '100%'
    },
    title: {
        fontSize: '36px',
        fontWeight: 'bold',
        marginBottom: '24px',
        color: '#1a1a1a'
    },
    subtitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: '24px'
    },
    card: {
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '16px',
        width: '100%',
        minHeight: '180px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '20px',
        color: '#666',
        marginBottom: '12px'
    },
    value: {
        fontSize: '24px',
        color: '#1a1a1a',
        marginBottom: '16px'
    },
    th: {
        border: '1px solid #ddd',
        padding: '20px',
        background: '#f5f5f5',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 24 as number,
    },
    td: {
        border: '1px solid #ddd',
        padding: '20px',
        textAlign: 'center',
        fontSize: 24 as number,
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '16px',
        fontSize: '20px'
    },
    totals: {
        marginTop: '40px',
        fontSize: '24px',
        textAlign: 'right'
    },
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderRadius: '9999px',
        fontSize: '20px',
        fontWeight: 500,
        lineHeight: 1
    }
};

export const InvoicePdfTemplate: React.FC<InvoicePdfTemplateProps> = ({ invoice, businessProfile, customer }) => {
    const isReceipt = invoice.type === InvoiceType.RECEIPT;

    // Always recalculate items and totals
    const itemsWithValues = invoice.items.map(calculateItemValues);
    const { totalNetValue, totalVatValue, totalGrossValue } = calculateInvoiceTotals(invoice.items);

    // Format address with postal code and city
    const formatAddress = (address: string, postalCode: string, city: string) => {
        return `${address}, ${postalCode} ${city}`;
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            backgroundColor: 'white'
        }}>
            <div style={{ ...pdfStyles.container }}>
                {/* Header & Details Row */}
                <div style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '24px',
                    alignItems: 'center',
                    marginBottom: '24px',
                    padding: '12px 0',
                }}>
                    <div>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{getInvoiceTypeTitle(invoice.type)}</span>
                        <span style={{ color: '#888', fontWeight: 400, fontSize: '15px', marginLeft: 8 }}>#{invoice.number}</span>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#4B5563' }}>Data wystawienia</div>
                        <div style={{ fontSize: 15 }}>{formatPolishDate(invoice.issueDate)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#4B5563' }}>Termin płatności</div>
                        <div style={{ fontSize: 15 }}>{formatPolishDate(invoice.dueDate)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#4B5563' }}>Status płatności</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: invoice.isPaid ? '#16a34a' : '#b91c1c', borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>{invoice.isPaid ? 'Opłacona' : 'Oczekuje'}</div>
                    </div>
                </div>

                {/* Seller/Buyer - Two Column Layout, clean and compact */}
                <div style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px',
                }}>
                    {/* Seller */}
                    <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1f2937' }}>Sprzedawca</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>Nazwa:</span>
                            <span style={{ fontSize: 13, textAlign: 'right' }}>{businessProfile?.name || ''}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>NIP:</span>
                            <span style={{ fontSize: 13, textAlign: 'right' }}>{businessProfile?.taxId || ''}</span>
                        </div>
                        {businessProfile?.regon && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>REGON:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{businessProfile.regon}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>Adres:</span>
                            <span style={{ fontSize: 13, textAlign: 'right' }}>
                                {formatAddress(
                                    businessProfile?.address || '',
                                    businessProfile?.postalCode || '',
                                    businessProfile?.city || ''
                                )}
                            </span>
                        </div>
                        {businessProfile?.email && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Email:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{businessProfile.email}</span>
                            </div>
                        )}
                        {businessProfile?.phone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Tel:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{businessProfile.phone}</span>
                            </div>
                        )}
                    </div>
                    {/* Buyer */}
                    <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1f2937' }}>Nabywca</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>Nazwa:</span>
                            <span style={{ fontSize: 13, textAlign: 'right' }}>{customer?.name || ''}</span>
                        </div>
                        {customer?.taxId && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>NIP:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{customer.taxId}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>Adres:</span>
                            <span style={{ fontSize: 13, textAlign: 'right' }}>
                                {formatAddress(
                                    customer?.address || '',
                                    customer?.postalCode || '',
                                    customer?.city || ''
                                )}
                            </span>
                        </div>
                        {customer?.email && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Email:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{customer.email}</span>
                            </div>
                        )}
                        {customer?.phone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Tel:</span>
                                <span style={{ fontSize: 13, textAlign: 'right' }}>{customer.phone}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table - clean, professional */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
                    <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ textAlign: 'left', padding: 6, border: '1px solid #e5e7eb' }}>Lp</th>
                            <th style={{ textAlign: 'left', padding: 6, border: '1px solid #e5e7eb' }}>Nazwa towaru / usługi</th>
                            <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>Ilość</th>
                            <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>Cena netto</th>
                            <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>Wartość netto</th>
                            {isReceipt ? null : <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>VAT %</th>}
                            {isReceipt ? null : <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>Kwota VAT</th>}
                            <th style={{ textAlign: 'right', padding: 6, border: '1px solid #e5e7eb' }}>Wartość brutto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsWithValues.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ padding: 6, border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                                <td style={{ padding: 6, border: '1px solid #e5e7eb' }}>{item.name}</td>
                                <td style={{ padding: 6, border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrencyUtil(item.unitPrice)}</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrencyUtil(item.totalNetValue || 0)}</td>
                                {isReceipt ? null : <td style={{ padding: 6, border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.vatRate === -1 ? 'zw' : `${item.vatRate}%`}</td>}
                                {isReceipt ? null : <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrencyUtil(item.totalVatValue || 0)}</td>}
                                <td style={{ padding: '4px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrencyUtil(item.totalGrossValue || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <div style={{ minWidth: 300 }}>
                        {!isReceipt && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                                    <span>Razem netto:</span>
                                    <span>{formatCurrencyUtil(totalNetValue || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                                    <span>VAT:</span>
                                    <span>{formatCurrencyUtil(totalVatValue || 0)}</span>
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 6 }}>
                            <span>Razem brutto:</span>
                            <span>{formatCurrencyUtil(totalGrossValue || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Amount in Words Section at the bottom */}
                <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '2px solid #dee2e6', textAlign: 'left' }}>
                    <div style={{ fontSize: '20px', color: '#212529', marginBottom: '8px', fontWeight: 700 }}>
                        Do zapłaty: <span style={{ color: '#2c2930' }}>{formatCurrency(totalGrossValue)}</span>
                    </div>
                    <div style={{ fontSize: '15px', color: '#495057', fontStyle: 'italic' }}>
                        Słownie: {formatAmountInWords(totalGrossValue)}
                    </div>

                    {/* Payment Method and Bank Account */}
                    <div style={{ marginTop: '12px', fontSize: '15px', color: '#495057' }}>
                        Sposób płatności: <span style={{ fontWeight: 600 }}>{getPolishPaymentMethod(invoice.paymentMethod) || 'Nie określono'}</span>
                    </div>

                    {/* Debugging Logs Start */}
                    {(() => {
                        console.log("PDF Gen - Invoice Payment Method:", invoice.paymentMethod);
                        console.log("PDF Gen - Expected Payment Method for Transfer:", PaymentMethod.TRANSFER);
                        console.log("PDF Gen - Is Payment Method Transfer?:", toPaymentMethodUi(invoice.paymentMethod as PaymentMethodDb) === PaymentMethod.TRANSFER);
                        console.log("PDF Gen - Business Profile Bank Account:", businessProfile?.bankAccount);
                        console.log("PDF Gen - Full Business Profile:", businessProfile);
                        console.log("PDF Gen - Full Invoice Object:", invoice);
                        return null; // Ensure the expression evaluates to a valid ReactNode
                    })()}
                    {/* Debugging Logs End */}

                    {isTransfer(toPaymentMethodUi(invoice.paymentMethod as PaymentMethodDb)) && businessProfile?.bankAccount && (
                        <div style={{ marginTop: '4px', fontSize: '15px', color: '#495057' }}>
                            Numer konta: <span style={{ fontWeight: 600 }}>{businessProfile.bankAccount}</span>
                        </div>
                    )}
                </div>

                {/* Corrected Comments section */}
                {invoice.comments && (
                    <div style={{ marginTop: '16px', padding: '16px 16px', borderTop: '2px solid #dee2e6' }}>
                        <div style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', background: '#f9f9f9' }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#333' }}>Uwagi</div>
                            <div style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-wrap' }}>{invoice.comments}</div>
                        </div>
                    </div>
                )}

                {/* Display VAT Exemption Reason if applicable */}
                {invoice.vat === false && invoice.vatExemptionReason && (
                    <div style={{ marginTop: 5, fontSize: 10 }}>
                        <div style={{ fontWeight: 'bold' }}>Powód zwolnienia z VAT:</div>
                        <div style={{ fontSize: 10 }}>{invoice.vatExemptionReason}</div>
                    </div>
                )}

            </div>
        </div>
    );
}