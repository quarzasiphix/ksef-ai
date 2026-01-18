/**
 * Enhanced Email Service
 * Provides unified interface for sending emails through various edge functions
 * Supports standardized invoice variables and multiple email types
 */

import { supabase } from '@/integrations/supabase/client';

export interface EmailVariables {
  [key: string]: any;
}

export interface SendEmailParams {
  templateKey: string; // Use template_key instead of templateName for consistency
  recipientEmail?: string; // Optional - defaults to current user's email
  variables?: EmailVariables;
  invoiceId?: string; // Optional - for standardized invoice variables
  customMessage?: string; // Optional - for invoice emails
}

export interface SendAdminEmailParams {
  templateKey: string;
  recipientEmail: string;
  variables?: EmailVariables;
  invoiceId?: string; // Optional - for standardized invoice variables
}

export interface SendInvoiceEmailParams {
  invoiceId: string;
  recipientEmail?: string; // Optional - uses customer email if not provided
  customMessage?: string; // Optional - personal message
}

/**
 * Send email using the client-side edge function (for authenticated users)
 */
export async function sendEmail({
  templateKey,
  recipientEmail,
  variables = {},
  invoiceId,
  customMessage,
}: SendEmailParams): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session for email sending:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    const userEmail = recipientEmail || session.user.email;

    if (!userEmail) {
      console.error('No recipient email available');
      return { success: false, error: 'No recipient email' };
    }

    // Determine which edge function to use based on template
    const isAdminTemplate = templateKey.startsWith('admin_');
    const isInvoiceTemplate = templateKey.includes('invoice');
    
    let edgeFunction = 'send-email'; // Default
    let requestBody: any = {
      templateKey,
      recipientEmail: userEmail,
      variables: {
        ...variables,
        email: userEmail,
      },
    };

    if (isInvoiceTemplate && invoiceId) {
      // Use client invoice email function for invoice templates
      edgeFunction = 'send-client-invoice-email';
      requestBody = {
        invoiceId,
        recipientEmail: userEmail,
        customMessage,
      };
    } else if (isAdminTemplate) {
      // Use admin email function for admin templates
      edgeFunction = 'send-admin-email';
      requestBody = {
        templateKey,
        recipientEmail: userEmail,
        variables: {
          ...variables,
          email: userEmail,
        },
        invoiceId, // Pass invoiceId if available for standardized variables
      };
    }

    // Call the appropriate edge function
    const { data, error } = await supabase.functions.invoke(edgeFunction, {
      body: requestBody,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email using admin edge function (for admin users)
 */
export async function sendAdminEmail({
  templateKey,
  recipientEmail,
  variables = {},
  invoiceId,
}: SendAdminEmailParams): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session for admin email sending:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    // Call the admin email edge function
    const { data, error } = await supabase.functions.invoke('send-admin-email', {
      body: {
        templateKey,
        recipientEmail,
        variables: {
          ...variables,
          email: recipientEmail,
        },
        invoiceId, // Optional for standardized variables
      },
    });

    if (error) {
      console.error('Error sending admin email:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending admin email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send invoice email to client using standardized variables
 */
export async function sendInvoiceEmail({
  invoiceId,
  recipientEmail,
  customMessage,
}: SendInvoiceEmailParams): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session for invoice email sending:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    // Call the client invoice email edge function
    const { data, error } = await supabase.functions.invoke('send-client-invoice-email', {
      body: {
        invoiceId,
        recipientEmail,
        customMessage,
      },
    });

    if (error) {
      console.error('Error sending invoice email:', error);
      return { success: false, error: error.message };
    }

    console.log('Invoice email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending invoice email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendEmailToMultipleRecipients({
  templateKey,
  recipients,
  variables = {},
  invoiceId,
  customMessage,
}: {
  templateKey: string;
  recipients: string[];
  variables?: EmailVariables;
  invoiceId?: string;
  customMessage?: string;
}): Promise<{ success: boolean; errors: string[]; results: any[] }> {
  const errors: string[] = [];
  const results: any[] = [];

  for (const recipientEmail of recipients) {
    const result = await sendEmail({
      templateKey,
      recipientEmail,
      variables,
      invoiceId,
      customMessage,
    });

    results.push(result);

    if (!result.success) {
      errors.push(`Failed to send to ${recipientEmail}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    results,
  };
}

/**
 * Get standardized invoice variables for an invoice
 */
export async function getInvoiceVariables(invoiceId: string): Promise<EmailVariables | null> {
  try {
    const { data, error } = await supabase.rpc('get_standardized_invoice_variables', {
      p_invoice_id: invoiceId,
    });

    if (error) {
      console.error('Error getting invoice variables:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error getting invoice variables:', error);
    return null;
  }
}

// ============================================================================
// INVOICE EMAIL FUNCTIONS (using standardized variables)
// ============================================================================

/**
 * Send invoice to client with standardized variables
 */
export async function sendInvoiceToClient(params: SendInvoiceEmailParams) {
  return sendInvoiceEmail(params);
}

/**
 * Send invoice notification to user (when invoice is created)
 */
export async function sendInvoiceCreatedNotification(invoiceId: string) {
  const variables = await getInvoiceVariables(invoiceId);
  if (!variables) {
    return { success: false, error: 'Failed to get invoice variables' };
  }

  return sendEmail({
    templateKey: 'invoice_generated',
    variables,
    invoiceId,
  });
}

/**
 * Send invoice reminder to client
 */
export async function sendInvoiceReminder({
  invoiceId,
  customMessage,
}: {
  invoiceId: string;
  customMessage?: string;
  }) {
  return sendInvoiceEmail({
    invoiceId,
    customMessage: customMessage || 'Przypomnienie o zbliżającym terminie płatności',
  });
}

/**
 * Send overdue invoice notification
 */
export async function sendOverdueInvoiceNotification(invoiceId: string) {
  const variables = await getInvoiceVariables(invoiceId);
  if (!variables) {
    return { success: false, error: 'Failed to get invoice variables' };
  }

  return sendEmail({
    templateKey: 'invoice_overdue',
    variables: {
      ...variables,
      days_overdue: variables.days_until_due ? Math.abs(variables.days_until_due) : 0,
    },
    invoiceId,
    customMessage: 'Twoja faktura jest przeterminowana. Prosimy o pilną zapłatę.',
  });
}

// ============================================================================
// ADMIN EMAIL FUNCTIONS
// ============================================================================

/**
 * Send welcome email to new admin user
 */
export async function sendAdminWelcomeEmail(recipientEmail: string, adminData: {
  name: string;
  role: string;
  loginUrl: string;
}) {
  return sendAdminEmail({
    templateKey: 'admin_welcome',
    recipientEmail,
    variables: {
      ...adminData,
      business_name: 'KsięgaI',
      support_email: 'support@ksiegai.pl',
    },
  });
}

/**
 * Send system notification to admins
 */
export async function sendAdminNotification({
  recipientEmails,
  subject,
  message,
  priority = 'normal',
}: {
  recipientEmails: string[];
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}) {
  const results = await Promise.all(
    recipientEmails.map(email => 
      sendAdminEmail({
        templateKey: 'admin_notification',
        recipientEmail: email,
        variables: {
          subject,
          message,
          priority,
          timestamp: new Date().toLocaleString('pl-PL'),
        },
      })
    )
  );

  const errors = results.filter(r => !r.success);
  return {
    success: errors.length === 0,
    errors: errors.map(e => e.error),
    sentCount: results.filter(r => r.success).length,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for email templates (Polish format)
 */
export function formatEmailDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format currency for email templates
 */
export function formatEmailCurrency(amount: number, currency = 'PLN'): string {
  return `${amount.toFixed(2).replace('.', ',')} ${currency}`;
}

/**
 * Generate app URL for email links
 */
export function getAppUrl(path: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.ksiegai.pl';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get template preview with variables
 */
export async function getTemplatePreview(
  templateKey: string, 
  variables: EmailVariables = {}
): Promise<{ subject: string; html: string } | null> {
  try {
    // This would call a preview edge function if available
    // For now, return null - this could be implemented later
    console.log('Template preview not yet implemented for:', templateKey);
    return null;
  } catch (error) {
    console.error('Error getting template preview:', error);
    return null;
  }
}

// ============================================================================
// EMAIL TEMPLATES CONSTANTS
// ============================================================================

export const EMAIL_TEMPLATES = {
  // Invoice templates
  INVOICE_TO_CLIENT: 'send_invoice_to_client',
  INVOICE_GENERATED: 'invoice_generated',
  INVOICE_OVERDUE: 'invoice_overdue',
  INVOICE_REMINDER: 'invoice_reminder',
  
  // Admin templates
  ADMIN_WELCOME: 'admin_welcome',
  ADMIN_NOTIFICATION: 'admin_notification',
  
  // User templates
  WELCOME_FIRMO: 'witaj_firmo',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  
  // Team templates
  TEAM_MEMBER_INVITE: 'team_member_invite',
  TEAM_MEMBER_ADDED: 'team_member_added',
  
  // Document templates
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_SHARED: 'document_shared',
  
  // Contract templates
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_EXPIRING: 'contract_expiring',
  
  // Notification templates
  INBOX_NOTIFICATION: 'inbox_notification',
  NEW_MESSAGE: 'new_message',
} as const;

export type EmailTemplateKey = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];
