
import { BusinessProfile, Customer, Invoice, InvoiceType, PaymentMethod, Product } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Mock business profiles
export const mockBusinessProfiles: BusinessProfile[] = [
  {
    id: "bp1",
    name: "Moja Firma Sp. z o.o.",
    taxId: "1234567890",
    address: "ul. Warszawska 10",
    postalCode: "00-001",
    city: "Warszawa",
    regon: "123456789",
    bankAccount: "PL12 1234 5678 9012 3456 7890 1234",
    email: "kontakt@mojafirma.pl",
    phone: "+48 123 456 789",
    isDefault: true,
  },
  {
    id: "bp2",
    name: "Jan Kowalski Consulting",
    taxId: "0987654321",
    address: "ul. Krakowska 15",
    postalCode: "30-001",
    city: "Kraków",
    email: "jan@consulting.pl",
    phone: "+48 987 654 321",
    isDefault: false,
  },
];

// Mock customers
export const mockCustomers: Customer[] = [
  {
    id: "c1",
    name: "ABC Sp. z o.o.",
    taxId: "5678901234",
    address: "ul. Wrocławska 5",
    postalCode: "50-001",
    city: "Wrocław",
    email: "kontakt@abc.pl",
    phone: "+48 567 890 123",
  },
  {
    id: "c2",
    name: "XYZ S.A.",
    taxId: "6789012345",
    address: "ul. Gdańska 20",
    postalCode: "80-001",
    city: "Gdańsk",
    email: "biuro@xyz.pl",
    phone: "+48 678 901 234",
  },
];

// Mock products
export const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Konsultacja IT",
    unitPrice: 150,
    vatRate: 23,
    unit: "godz.",
  },
  {
    id: "p2",
    name: "Strona internetowa",
    unitPrice: 3000,
    vatRate: 23,
    unit: "szt.",
  },
  {
    id: "p3",
    name: "Szkolenie",
    unitPrice: 800,
    vatRate: 23,
    unit: "szt.",
  },
];

// Mock invoices
export const mockInvoices: Invoice[] = [
  {
    id: "i1",
    number: "FV/2023/05/001",
    type: InvoiceType.SALES,
    issueDate: "2023-05-15",
    dueDate: "2023-06-15",
    sellDate: "2023-05-15",
    businessProfileId: "bp1",
    customerId: "c1",
    items: [
      {
        id: "ii1",
        productId: "p1",
        name: "Konsultacja IT",
        quantity: 10,
        unitPrice: 150,
        vatRate: 23,
        unit: "godz.",
        totalNetValue: 1500,
        totalVatValue: 345,
        totalGrossValue: 1845,
      },
      {
        id: "ii2",
        productId: "p2",
        name: "Strona internetowa",
        quantity: 1,
        unitPrice: 3000,
        vatRate: 23,
        unit: "szt.",
        totalNetValue: 3000,
        totalVatValue: 690,
        totalGrossValue: 3690,
      },
    ],
    paymentMethod: PaymentMethod.TRANSFER,
    isPaid: true,
    totalNetValue: 4500,
    totalVatValue: 1035,
    totalGrossValue: 5535,
    ksef: {
      status: "sent",
      referenceNumber: "KS123456789",
    },
  },
  {
    id: "i2",
    number: "FV/2023/06/001",
    type: InvoiceType.SALES,
    issueDate: "2023-06-10",
    dueDate: "2023-07-10",
    sellDate: "2023-06-10",
    businessProfileId: "bp1",
    customerId: "c2",
    items: [
      {
        id: "ii3",
        productId: "p3",
        name: "Szkolenie",
        quantity: 2,
        unitPrice: 800,
        vatRate: 23,
        unit: "szt.",
        totalNetValue: 1600,
        totalVatValue: 368,
        totalGrossValue: 1968,
      },
    ],
    paymentMethod: PaymentMethod.TRANSFER,
    isPaid: false,
    totalNetValue: 1600,
    totalVatValue: 368,
    totalGrossValue: 1968,
    ksef: {
      status: "pending",
    },
  },
];

// Helper function to get a business profile by ID
export const getBusinessProfileById = (id: string): BusinessProfile | undefined => {
  return mockBusinessProfiles.find((profile) => profile.id === id);
};

// Helper function to get a customer by ID
export const getCustomerById = (id: string): Customer | undefined => {
  return mockCustomers.find((customer) => customer.id === id);
};

// Helper function to get a product by ID
export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find((product) => product.id === id);
};

// Helper function to get an invoice by ID
export const getInvoiceById = (id: string): Invoice | undefined => {
  return mockInvoices.find((invoice) => invoice.id === id);
};

// Helper function to get monthly invoice summaries for analytics
export const getMonthlyInvoiceSummaries = () => {
  const summaries = mockInvoices.reduce((acc, invoice) => {
    const month = invoice.issueDate.substring(0, 7); // Extract YYYY-MM
    
    if (!acc[month]) {
      acc[month] = {
        month,
        count: 0,
        totalNetValue: 0,
        totalGrossValue: 0,
        totalVatValue: 0,
      };
    }
    
    acc[month].count += 1;
    acc[month].totalNetValue += invoice.totalNetValue || 0;
    acc[month].totalGrossValue += invoice.totalGrossValue || 0;
    acc[month].totalVatValue += invoice.totalVatValue || 0;
    
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(summaries);
};
