export type ZusType = 'społeczne' | 'zdrowotne' | 'FP' | 'FGŚP' | 'inne';

export interface ZusPayment {
  id: string;
  userId: string;
  businessProfileId?: string;
  month: string; // 'YYYY-MM'
  zusType: ZusType;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
} 