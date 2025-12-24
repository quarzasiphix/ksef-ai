/**
 * Invoice Export XML Generator
 * 
 * Generates XML from export structure using streaming for large datasets.
 */

import { create } from 'xmlbuilder2';
import {
  InvoiceExport,
  ExportInvoice,
  EXPORT_NAMESPACE,
  EXPORT_VERSION,
} from '../types/invoice-export';

/**
 * Generate XML from invoice export structure
 */
export function generateInvoiceExportXml(exportData: InvoiceExport): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('InvoiceExport', {
      'xmlns': EXPORT_NAMESPACE,
      'version': EXPORT_VERSION,
      'generatedAt': exportData['@generatedAt'],
    });
  
  // Source
  const source = root.ele('Source');
  source.ele('System').txt(exportData.Source.System);
  source.ele('BusinessProfileId').txt(exportData.Source.BusinessProfileId);
  source.ele('BusinessProfileName').txt(exportData.Source.BusinessProfileName);
  source.ele('ExportId').txt(exportData.Source.ExportId);
  source.ele('ExportMode').txt(exportData.Source.ExportMode);
  
  if (exportData.Source.PeriodFrom) {
    source.ele('PeriodFrom').txt(exportData.Source.PeriodFrom);
  }
  if (exportData.Source.PeriodTo) {
    source.ele('PeriodTo').txt(exportData.Source.PeriodTo);
  }
  
  // Invoices
  const invoices = root.ele('Invoices', { count: exportData.Invoices['@count'] });
  
  exportData.Invoices.Invoice.forEach(invoice => {
    addInvoiceElement(invoices, invoice);
  });
  
  return root.end({ 
    prettyPrint: true,
    headless: false,
  });
}

/**
 * Add invoice element to XML
 */
function addInvoiceElement(parent: any, invoice: ExportInvoice): void {
  const inv = parent.ele('Invoice', {
    id: invoice['@id'],
    number: invoice['@number'],
    type: invoice['@type'],
    transactionType: invoice['@transactionType'],
  });
  
  // Dates
  const dates = inv.ele('Dates', {
    issue: invoice.Dates['@issue'],
    sell: invoice.Dates['@sell'],
    due: invoice.Dates['@due'],
  });
  if (invoice.Dates['@created']) dates.att('created', invoice.Dates['@created']);
  if (invoice.Dates['@updated']) dates.att('updated', invoice.Dates['@updated']);
  
  // Status
  inv.ele('Status', {
    lifecycle: invoice.Status['@lifecycle'],
    payment: invoice.Status['@payment'],
    isPaid: invoice.Status['@isPaid'],
    ksef: invoice.Status['@ksef'],
    isOverdue: invoice.Status['@isOverdue'] || false,
  });
  
  // Parties
  const parties = inv.ele('Parties');
  addPartyElement(parties.ele('Seller'), invoice.Parties.Seller);
  addPartyElement(parties.ele('Buyer'), invoice.Parties.Buyer);
  
  // Payment
  const payment = inv.ele('Payment', {
    method: invoice.Payment['@method'],
    methodType: invoice.Payment['@methodType'],
    currency: invoice.Payment['@currency'],
  });
  if (invoice.Payment['@exchangeRate']) {
    payment.att('exchangeRate', invoice.Payment['@exchangeRate']);
  }
  if (invoice.Payment.BankAccountId) {
    payment.ele('BankAccountId').txt(invoice.Payment.BankAccountId);
  }
  if (invoice.Payment.BankAccountNumber) {
    payment.ele('BankAccountNumber').txt(invoice.Payment.BankAccountNumber);
  }
  if (invoice.Payment.PaidAt) {
    payment.ele('PaidAt').txt(invoice.Payment.PaidAt);
  }
  if (invoice.Payment.PaymentReceivedAt) {
    payment.ele('PaymentReceivedAt').txt(invoice.Payment.PaymentReceivedAt);
  }
  
  // Totals
  const totals = inv.ele('Totals', { currency: invoice.Totals['@currency'] });
  totals.ele('Net').txt(invoice.Totals.Net);
  totals.ele('Vat').txt(invoice.Totals.Vat);
  totals.ele('Gross').txt(invoice.Totals.Gross);
  
  // VAT Info
  const vatInfo = inv.ele('VatInfo', { enabled: invoice.VatInfo['@enabled'] });
  if (invoice.VatInfo['@exemptionReason']) {
    vatInfo.att('exemptionReason', invoice.VatInfo['@exemptionReason']);
  }
  if (invoice.VatInfo['@exemptionReasonCode']) {
    vatInfo.att('exemptionReasonCode', invoice.VatInfo['@exemptionReasonCode']);
  }
  
  // Items
  const items = inv.ele('Items', { count: invoice.Items['@count'] });
  invoice.Items.Item.forEach(item => {
    const itemEl = items.ele('Item', {
      id: item['@id'],
      name: item['@name'],
      unit: item['@unit'],
      quantity: item['@quantity'],
    });
    
    if (item['@productId']) {
      itemEl.att('productId', item['@productId']);
    }
    
    if (item.Description) {
      itemEl.ele('Description').txt(item.Description);
    }
    
    itemEl.ele('UnitPrice').txt(item.UnitPrice);
    itemEl.ele('VatRate').txt(item.VatRate);
    
    if (item.VatExempt) {
      itemEl.ele('VatExempt').txt('true');
    }
    
    const lineTotals = itemEl.ele('LineTotals');
    lineTotals.ele('Net').txt(item.LineTotals.Net);
    lineTotals.ele('Vat').txt(item.LineTotals.Vat);
    lineTotals.ele('Gross').txt(item.LineTotals.Gross);
  });
  
  // Notes
  if (invoice.Notes) {
    inv.ele('Notes').txt(invoice.Notes);
  }
  
  // External integrations
  if (invoice.External) {
    const external = inv.ele('External');
    
    if (invoice.External.KSeF) {
      const ksef = external.ele('KSeF');
      if (invoice.External.KSeF['@reference']) {
        ksef.att('reference', invoice.External.KSeF['@reference']);
      }
      if (invoice.External.KSeF['@upo']) {
        ksef.att('upo', invoice.External.KSeF['@upo']);
      }
      if (invoice.External.KSeF['@submittedAt']) {
        ksef.att('submittedAt', invoice.External.KSeF['@submittedAt']);
      }
    }
    
    if (invoice.External.ERP) {
      const erp = external.ele('ERP');
      if (invoice.External.ERP['@provider']) {
        erp.att('provider', invoice.External.ERP['@provider']);
      }
      if (invoice.External.ERP['@entityId']) {
        erp.att('entityId', invoice.External.ERP['@entityId']);
      }
      if (invoice.External.ERP['@syncedAt']) {
        erp.att('syncedAt', invoice.External.ERP['@syncedAt']);
      }
      if (invoice.External.ERP['@status']) {
        erp.att('status', invoice.External.ERP['@status']);
      }
    }
    
    if (invoice.External.Stripe) {
      const stripe = external.ele('Stripe');
      if (invoice.External.Stripe['@checkoutSessionId']) {
        stripe.att('checkoutSessionId', invoice.External.Stripe['@checkoutSessionId']);
      }
      if (invoice.External.Stripe['@paymentIntentId']) {
        stripe.att('paymentIntentId', invoice.External.Stripe['@paymentIntentId']);
      }
    }
    
    if (invoice.External.Contract) {
      const contract = external.ele('Contract');
      if (invoice.External.Contract['@contractId']) {
        contract.att('contractId', invoice.External.Contract['@contractId']);
      }
      if (invoice.External.Contract['@contractNumber']) {
        contract.att('contractNumber', invoice.External.Contract['@contractNumber']);
      }
    }
  }
  
  // Audit (forensic mode)
  if (invoice.Audit) {
    const audit = inv.ele('Audit');
    audit.ele('CreatedBy').txt(invoice.Audit.CreatedBy);
    
    if (invoice.Audit.UpdatedBy) {
      audit.ele('UpdatedBy').txt(invoice.Audit.UpdatedBy);
    }
    if (invoice.Audit.LastEventId) {
      audit.ele('LastEventId').txt(invoice.Audit.LastEventId);
    }
    if (invoice.Audit.DecisionId) {
      audit.ele('DecisionId').txt(invoice.Audit.DecisionId);
    }
    if (invoice.Audit.DecisionReference) {
      audit.ele('DecisionReference').txt(invoice.Audit.DecisionReference);
    }
    if (invoice.Audit.SourceInvoiceId) {
      audit.ele('SourceInvoiceId').txt(invoice.Audit.SourceInvoiceId);
    }
    if (invoice.Audit.LinkedAccountingEntries) {
      const entries = audit.ele('LinkedAccountingEntries');
      invoice.Audit.LinkedAccountingEntries.forEach(entryId => {
        entries.ele('EntryId').txt(entryId);
      });
    }
  }
}

/**
 * Add party element to XML
 */
function addPartyElement(parent: any, party: any): void {
  if (party['@id']) {
    parent.att('id', party['@id']);
  }
  
  parent.ele('Name').txt(party.Name);
  
  if (party.NIP) {
    parent.ele('NIP').txt(party.NIP);
  }
  if (party.REGON) {
    parent.ele('REGON').txt(party.REGON);
  }
  
  if (party.Address) {
    const addr = parent.ele('Address');
    if (party.Address.Street) addr.ele('Street').txt(party.Address.Street);
    if (party.Address.BuildingNumber) addr.ele('BuildingNumber').txt(party.Address.BuildingNumber);
    if (party.Address.ApartmentNumber) addr.ele('ApartmentNumber').txt(party.Address.ApartmentNumber);
    if (party.Address.PostalCode) addr.ele('PostalCode').txt(party.Address.PostalCode);
    if (party.Address.City) addr.ele('City').txt(party.Address.City);
    if (party.Address.Country) addr.ele('Country').txt(party.Address.Country);
  }
  
  if (party.Contact) {
    const contact = parent.ele('Contact');
    if (party.Contact.Email) contact.ele('Email').txt(party.Contact.Email);
    if (party.Contact.Phone) contact.ele('Phone').txt(party.Contact.Phone);
  }
}
