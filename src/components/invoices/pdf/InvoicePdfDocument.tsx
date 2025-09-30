import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice, BusinessProfile, Customer, InvoiceType } from '@/types';
import { BankAccount } from '@/types/bank';
import { calculateInvoiceTotals, calculateItemValues, formatCurrency as formatCurrencyUtil, getPolishPaymentMethod, formatPolishDate } from '@/lib/invoice-utils';

interface InvoicePdfDocumentProps {
  invoice: Invoice;
  businessProfile?: BusinessProfile | null;
  customer?: Customer | null;
  bankAccounts?: BankAccount[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    alignItems: 'flex-start'
  },
  section: {
    marginBottom: 14
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6
  },
  sectionText: {
    marginBottom: 2
  },
  table: {
    display: 'table',
    width: 'auto',
    marginTop: 12
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableHeader: {
    backgroundColor: '#f3f4f6'
  },
  tableColIndex: {
    width: 28,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#d1d5db'
  },
  tableColName: {
    flexGrow: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#d1d5db'
  },
  tableColNumeric: {
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    alignItems: 'flex-end'
  },
  tableCell: {
    fontSize: 9
  },
  textRight: {
    textAlign: 'right'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12
  },
  textMuted: {
    color: '#6b7280'
  },
  paymentSection: {
    marginTop: 8
  },
  comments: {
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    padding: 8,
    borderRadius: 4
  }
});

export const InvoicePdfDocument: React.FC<InvoicePdfDocumentProps> = ({ invoice, businessProfile, customer, bankAccounts = [] }) => {
  const rawItems = invoice.items || [];
  const items = rawItems.map(calculateItemValues);
  const totals = calculateInvoiceTotals(rawItems);
  const currency = invoice.currency || 'PLN';
  const paymentMethodLabel = getPolishPaymentMethod(invoice.paymentMethod) || 'Nie określono';
  const selectedBank = bankAccounts.find(acc => acc.id === invoice.bankAccountId) || bankAccounts[0];
  const fakturaBezVAT = invoice.fakturaBezVAT || invoice.vat === false || invoice.type === InvoiceType.RECEIPT;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{fakturaBezVAT ? 'Faktura' : 'Faktura VAT'}</Text>
            <Text>Nr: {invoice.number}</Text>
          </View>
          <View>
            <Text>Data wystawienia: {formatPolishDate(invoice.issueDate)}</Text>
            <Text>Data sprzedaży: {formatPolishDate(invoice.sellDate)}</Text>
            <Text>Termin płatności: {formatPolishDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Sprzedawca</Text>
          {businessProfile ? (
            <>
              <Text style={styles.sectionText}>{businessProfile.name}</Text>
              {businessProfile.taxId && <Text style={styles.sectionText}>NIP: {businessProfile.taxId}</Text>}
              {businessProfile.address && (
                <Text style={styles.sectionText}>
                  {businessProfile.address}
                  {businessProfile.postalCode ? `, ${businessProfile.postalCode}` : ''}
                  {businessProfile.city ? ` ${businessProfile.city}` : ''}
                </Text>
              )}
              {businessProfile.email && <Text style={styles.sectionText}>Email: {businessProfile.email}</Text>}
              {businessProfile.phone && <Text style={styles.sectionText}>Tel: {businessProfile.phone}</Text>}
            </>
          ) : (
            <Text style={styles.textMuted}>Brak danych sprzedawcy</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Nabywca</Text>
          {customer ? (
            <>
              <Text style={styles.sectionText}>{customer.name}</Text>
              {customer.taxId && <Text style={styles.sectionText}>NIP: {customer.taxId}</Text>}
              {customer.address && (
                <Text style={styles.sectionText}>
                  {customer.address}
                  {customer.postalCode ? `, ${customer.postalCode}` : ''}
                  {customer.city ? ` ${customer.city}` : ''}
                </Text>
              )}
              {customer.email && <Text style={styles.sectionText}>Email: {customer.email}</Text>}
              {customer.phone && <Text style={styles.sectionText}>Tel: {customer.phone}</Text>}
            </>
          ) : (
            <Text style={styles.textMuted}>Brak danych nabywcy</Text>
          )}
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColIndex}><Text style={styles.tableCell}>Lp</Text></View>
            <View style={styles.tableColName}><Text style={styles.tableCell}>Nazwa towaru / usługi</Text></View>
            <View style={styles.tableColNumeric}><Text style={styles.tableCell}>Ilość</Text></View>
            <View style={styles.tableColNumeric}><Text style={styles.tableCell}>Cena netto</Text></View>
            <View style={styles.tableColNumeric}><Text style={styles.tableCell}>Wartość netto</Text></View>
            {!fakturaBezVAT && (
              <View style={styles.tableColNumeric}><Text style={styles.tableCell}>VAT</Text></View>
            )}
            <View style={styles.tableColNumeric}><Text style={styles.tableCell}>Wartość brutto</Text></View>
          </View>
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <View style={styles.tableColIndex}><Text style={styles.tableCell}>{index + 1}</Text></View>
              <View style={styles.tableColName}><Text style={styles.tableCell}>{item.name}</Text></View>
              <View style={styles.tableColNumeric}><Text style={styles.tableCell}>{item.quantity}</Text></View>
              <View style={styles.tableColNumeric}><Text style={[styles.tableCell, styles.textRight]}>{formatCurrencyUtil(item.unitPrice, currency)}</Text></View>
              <View style={styles.tableColNumeric}><Text style={[styles.tableCell, styles.textRight]}>{formatCurrencyUtil(item.totalNetValue || 0, currency)}</Text></View>
              {!fakturaBezVAT && (
                <View style={styles.tableColNumeric}><Text style={[styles.tableCell, styles.textRight]}>{item.vatRate === -1 ? 'zw' : `${item.vatRate}%`}</Text></View>
              )}
              <View style={styles.tableColNumeric}><Text style={[styles.tableCell, styles.textRight]}>{formatCurrencyUtil(item.totalGrossValue || 0, currency)}</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.title}>Podsumowanie</Text>
          {!fakturaBezVAT && (
            <View style={styles.summaryRow}>
              <Text>Razem netto:</Text>
              <Text>{formatCurrencyUtil(totals.totalNetValue || 0, currency)}</Text>
            </View>
          )}
          {!fakturaBezVAT && totals.totalVatValue > 0 && (
            <View style={styles.summaryRow}>
              <Text>VAT:</Text>
              <Text>{formatCurrencyUtil(totals.totalVatValue || 0, currency)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text>Razem brutto:</Text>
            <Text>{formatCurrencyUtil(totals.totalGrossValue || 0, currency)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Płatność</Text>
          <Text style={styles.sectionText}>Sposób płatności: {paymentMethodLabel}</Text>
          {selectedBank?.accountNumber && (
            <Text style={styles.sectionText}>Numer konta: {selectedBank.accountNumber}</Text>
          )}
        </View>

        {invoice.comments && (
          <View style={styles.section}>
            <Text style={styles.title}>Uwagi</Text>
            <View style={styles.comments}>
              <Text style={styles.sectionText}>{invoice.comments}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};
