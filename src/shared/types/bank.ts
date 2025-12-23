export enum Bank {
  MBANK = "mBank",
  PKO_BP = "PKO BP",
  SANTANDER = "Santander",
  ING = "ING Bank Śląski",
  BNP_PARIBAS = "BNP Paribas",
  PEKAO = "Pekao SA",
  ALIOR = "Alior Bank",
  MILLENNIUM = "Bank Millennium",
  CREDIT_AGRICOLE = "Credit Agricole",
  GETIN = "Getin Bank",
  BOŚ = "BOŚ Bank",
  CITI_HANDLOWY = "Citi Handlowy",
  NEST = "Nest Bank",
  OTHER = "Inny bank"
}

export interface BankAccount {
  id: string;
  businessProfileId: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  currency: string;
  type?: 'main' | 'vat' | 'tax' | 'other';
  balance: number;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  counterparty?: string;
  category?: string;
} 