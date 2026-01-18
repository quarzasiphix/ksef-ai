/**
 * Email service types and interfaces
 */

export interface EmailVariables {
  [key: string]: any;
}

export interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  category: string;
  description: string;
  subject_pl: string;
  subject_en?: string;
  subject_de?: string;
  body_html_pl: string;
  body_html_en?: string;
  body_html_de?: string;
  variables: string[];
  invoice_variables?: {
    use_standardized?: boolean;
    additional_variables?: string[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface EmailSendBatchResult {
  success: boolean;
  errors: string[];
  results: EmailSendResult[];
  sentCount?: number;
}

export interface StandardizedInvoiceVariables {
  // Basic invoice info
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  issue_date: string;
  due_date: string;
  payment_date?: string;
  created_at: string;
  status: string;
  
  // Financial data
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  
  // Formatted amounts
  total_amount_formatted: string;
  subtotal_amount_formatted: string;
  tax_amount_formatted: string;
  remaining_amount_formatted: string;
  
  // Customer information
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_tax_id?: string;
  customer_address?: string;
  customer_city?: string;
  customer_postal_code?: string;
  customer_country: string;
  customer_phone?: string;
  
  // Business profile (issuer) information
  business_id: string;
  business_name: string;
  business_email: string;
  business_phone?: string;
  business_tax_id?: string;
  business_address?: string;
  business_city?: string;
  business_postal_code?: string;
  business_country: string;
  business_bank_account?: string;
  
  // Invoice items
  items: InvoiceItem[];
  items_count: number;
  
  // Calculated fields
  is_paid: boolean;
  is_overdue: boolean;
  days_until_due?: number;
  
  // Additional fields
  notes?: string;
  description?: string;
  payment_terms?: string;
  invoice_url?: string;
  download_pdf_url?: string;
  payment_url?: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  total_price: number;
  total_price_formatted: string;
}

export interface EmailServiceConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  n8nWebhookUrl?: string;
}

export interface EmailPreview {
  subject: string;
  html: string;
  variables: EmailVariables;
}

export interface EmailTestResult {
  success: boolean;
  error?: string;
  preview?: EmailPreview;
  sentAt?: string;
}

// Email template categories
export type EmailTemplateCategory = 
  | 'auth'
  | 'invoicing'
  | 'notifications'
  | 'marketing'
  | 'system'
  | 'team'
  | 'documents'
  | 'contracts';

// Email priority levels
export type EmailPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

// Email status
export type EmailStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

// Email log entry
export interface EmailLog {
  id: string;
  template_key: string;
  recipient_email: string;
  user_id: string;
  workspace_id?: string;
  invoice_id?: string;
  status: EmailStatus;
  sent_at: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

// Email service error types
export class EmailServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EmailServiceError';
  }
}

// Common email error codes
export const EMAIL_ERROR_CODES = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  EDGE_FUNCTION_ERROR: 'EDGE_FUNCTION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type EmailErrorCode = typeof EMAIL_ERROR_CODES[keyof typeof EMAIL_ERROR_CODES];
