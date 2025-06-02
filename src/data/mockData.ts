
import { BusinessProfile, Customer, Product, Invoice, InvoiceType, PaymentMethodDb, InvoiceItem } from "@/types";
import { generateKsefXml } from "@/integrations/ksef/ksefGenerator";

// Mock Business Profiles
export const mockBusinessProfiles: BusinessProfile[] = [
  {
    id: "1",
    user_id: "user-123",
    name: "ACME Sp. z o.o.",
    taxId: "1234567890",
    address: "ul. Przykładowa 123",
    postalCode: "00-001",
    city: "Warszawa",
    country: "Polska",
    regon: "123456789",
    bankAccount: "12 3456 7890 1234 5678 9012 3456",
    email: "kontakt@acme.pl",
    phone: "+48 123 456 789",
    isDefault: true,
    tax_type: "skala",
    monthlySocialSecurity: 1500,
    monthlyHealthInsurance: 400
  },
];

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: "1",
    user_id: "user-123",
    name: "Jan Kowalski",
    taxId: "9876543210",
    address: "ul. Testowa 456",
    postalCode: "02-001",
    city: "Kraków",
    country: "Polska",
    email: "jan.kowalski@email.com",
    phone: "+48 987 654 321"
  },
  {
    id: "2", 
    user_id: "user-123",
    name: "Anna Nowak",
    address: "ul. Nowa 789",
    postalCode: "03-001",
    city: "Gdańsk",
    country: "Polska",
    email: "anna.nowak@email.com"
  }
];

// Mock Products  
export const mockProducts: Product[] = [
  {
    id: "1",
    user_id: "user-123",
    name: "Konsultacje IT",
    unitPrice: 200,
    vatRate: 23,
    unit: "godz.",
    description: "Konsultacje informatyczne"
  },
  {
    id: "2",
    user_id: "user-123", 
    name: "Projekt strony internetowej",
    unitPrice: 5000,
    vatRate: 23,
    unit: "szt.",
    description: "Projekt i wykonanie strony internetowej"
  },
  {
    id: "3",
    user_id: "user-123",
    name: "Hosting roczny",
    unitPrice: 300,
    vatRate: 23,
    unit: "szt.",
    description: "Hosting strony internetowej na rok"
  }
];

// Mock Invoice Items
const mockInvoiceItems1: InvoiceItem[] = [
  {
    id: "item-1",
    productId: "1",
    name: "Konsultacje IT",
    description: "Konsultacje informatyczne",
    quantity: 10,
    unitPrice: 200,
    vatRate: 23,
    unit: "godz.",
    totalNetValue: 2000,
    totalVatValue: 460,
    totalGrossValue: 2460
  },
  {
    id: "item-2",
    productId: "2", 
    name: "Projekt strony internetowej",
    description: "Projekt i wykonanie strony internetowej",
    quantity: 1,
    unitPrice: 5000,
    vatRate: 23,
    unit: "szt.",
    totalNetValue: 5000,
    totalVatValue: 1150,
    totalGrossValue: 6150
  }
];

const mockInvoiceItems2: InvoiceItem[] = [
  {
    id: "item-3",
    productId: "3",
    name: "Hosting roczny", 
    description: "Hosting strony internetowej na rok",
    quantity: 1,
    unitPrice: 300,
    vatRate: 23,
    unit: "szt.",
    totalNetValue: 300,
    totalVatValue: 69,
    totalGrossValue: 369
  }
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: "1",
    user_id: "user-123",
    number: "FV/2024/001",
    type: InvoiceType.SALES,
    transactionType: "income",
    issueDate: "2024-01-15",
    dueDate: "2024-01-29",
    sellDate: "2024-01-15",
    date: "2024-01-15",
    businessProfileId: "1",
    customerId: "1",
    items: mockInvoiceItems1,
    paymentMethod: PaymentMethodDb.TRANSFER,
    isPaid: false,
    paid: false,
    status: "sent",
    totalNetValue: 7000,
    totalGrossValue: 8610,
    totalVatValue: 1610,
    totalAmount: 8610,
    ksef: {
      status: 'pending',
      referenceNumber: null
    },
    seller: {
      id: "1",
      name: "ACME Sp. z o.o.",
      taxId: "1234567890",
      address: "ul. Przykładowa 123",
      city: "Warszawa",
      postalCode: "00-001"
    },
    buyer: {
      id: "1", 
      name: "Jan Kowalski",
      taxId: "9876543210",
      address: "ul. Testowa 456",
      city: "Kraków",
      postalCode: "02-001"
    },
    businessName: "ACME Sp. z o.o.",
    customerName: "Jan Kowalski"
  },
  {
    id: "2",
    user_id: "user-123", 
    number: "FV/2024/002",
    type: InvoiceType.SALES,
    transactionType: "income",
    issueDate: "2024-01-20",
    dueDate: "2024-02-03", 
    sellDate: "2024-01-20",
    date: "2024-01-20",
    businessProfileId: "1",
    customerId: "2",
    items: mockInvoiceItems2,
    paymentMethod: PaymentMethodDb.TRANSFER,
    isPaid: true,
    paid: true,
    status: "paid",
    totalNetValue: 300,
    totalGrossValue: 369,
    totalVatValue: 69,
    totalAmount: 369,
    ksef: {
      status: 'sent',
      referenceNumber: 'KSeF-2024-001-123456'
    },
    seller: {
      id: "1",
      name: "ACME Sp. z o.o.",
      taxId: "1234567890", 
      address: "ul. Przykładowa 123",
      city: "Warszawa",
      postalCode: "00-001"
    },
    buyer: {
      id: "2",
      name: "Anna Nowak",
      taxId: "",
      address: "ul. Nowa 789", 
      city: "Gdańsk",
      postalCode: "03-001"
    },
    businessName: "ACME Sp. z o.o.",
    customerName: "Anna Nowak"
  }
];
