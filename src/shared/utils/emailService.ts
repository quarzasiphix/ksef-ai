/**
 * Email Service Utility
 * Sends transactional emails for user actions via Supabase Edge Function
 */

import { supabase } from '@/integrations/supabase/client';

export interface EmailVariables {
  [key: string]: any;
}

export interface SendEmailParams {
  templateName: string;
  recipientEmail?: string; // Optional - defaults to current user's email
  variables?: EmailVariables;
}

/**
 * Send transactional email using the send-email edge function
 */
export async function sendTransactionalEmail({
  templateName,
  recipientEmail,
  variables = {},
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No active session for email sending:', sessionError);
      return { success: false, error: 'User not authenticated' };
    }

    const userId = session.user.id;
    const userEmail = recipientEmail || session.user.email;

    if (!userEmail) {
      console.error('No recipient email available');
      return { success: false, error: 'No recipient email' };
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        templateName,
        userId,
        variables: {
          ...variables,
          email: userEmail,
        },
      },
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email to multiple recipients (e.g., invoice sender + receiver)
 */
export async function sendEmailToMultipleRecipients({
  templateName,
  recipients,
  variables = {},
}: {
  templateName: string;
  recipients: string[];
  variables?: EmailVariables;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const recipientEmail of recipients) {
    const result = await sendTransactionalEmail({
      templateName,
      recipientEmail,
      variables,
    });

    if (!result.success) {
      errors.push(`Failed to send to ${recipientEmail}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

// ============================================================================
// INVOICE EMAIL TEMPLATES
// ============================================================================

export async function sendInvoiceCreatedEmail(invoiceData: {
  invoice_number: string;
  client_name: string;
  total_amount: string;
  issue_date: string;
  due_date: string;
  invoice_url: string;
  download_pdf_url: string;
  items?: Array<{
    name: string;
    quantity: string;
    unit_price: string;
    total: string;
  }>;
}) {
  return sendTransactionalEmail({
    templateName: 'invoice_generated',
    variables: {
      ...invoiceData,
      business_name: 'KsięgaI', // TODO: Get from company settings
      currency: 'PLN',
      settings_url: `${window.location.origin}/settings`,
      support_url: `${window.location.origin}/support`,
    },
  });
}

export async function sendInvoiceReceivedEmail(
  recipientEmail: string,
  invoiceData: {
    invoice_number: string;
    sender_name: string;
    total_amount: string;
    issue_date: string;
    due_date: string;
    invoice_url: string;
    download_pdf_url: string;
  }
) {
  return sendTransactionalEmail({
    templateName: 'invoice_received',
    recipientEmail,
    variables: {
      ...invoiceData,
      view_invoice_url: invoiceData.invoice_url,
    },
  });
}

// ============================================================================
// TEAM & COLLABORATION EMAIL TEMPLATES
// ============================================================================

export async function sendTeamMemberInviteEmail(
  recipientEmail: string,
  inviteData: {
    inviter_name: string;
    company_name: string;
    role: string;
    invite_url: string;
  }
) {
  return sendTransactionalEmail({
    templateName: 'team_member_invite',
    recipientEmail,
    variables: inviteData,
  });
}

export async function sendTeamMemberAddedEmail(memberData: {
  member_name: string;
  role: string;
  added_by: string;
  company_name: string;
}) {
  return sendTransactionalEmail({
    templateName: 'team_member_added',
    variables: memberData,
  });
}

// ============================================================================
// DOCUMENT EMAIL TEMPLATES
// ============================================================================

export async function sendDocumentUploadedEmail(documentData: {
  document_name: string;
  document_type: string;
  uploaded_by: string;
  document_url: string;
  category?: string;
}) {
  return sendTransactionalEmail({
    templateName: 'document_uploaded',
    variables: documentData,
  });
}

export async function sendDocumentSharedEmail(
  recipientEmail: string,
  shareData: {
    document_name: string;
    shared_by: string;
    document_url: string;
    message?: string;
  }
) {
  return sendTransactionalEmail({
    templateName: 'document_shared',
    recipientEmail,
    variables: shareData,
  });
}

// ============================================================================
// CONTRACT EMAIL TEMPLATES
// ============================================================================

export async function sendContractCreatedEmail(contractData: {
  contract_number: string;
  contract_type: string;
  counterparty_name: string;
  start_date: string;
  end_date?: string;
  contract_url: string;
}) {
  return sendTransactionalEmail({
    templateName: 'contract_created',
    variables: contractData,
  });
}

export async function sendContractExpiringEmail(contractData: {
  contract_number: string;
  contract_type: string;
  counterparty_name: string;
  expiry_date: string;
  days_until_expiry: number;
  contract_url: string;
}) {
  return sendTransactionalEmail({
    templateName: 'contract_expiring',
    variables: contractData,
  });
}

// ============================================================================
// INBOX & NOTIFICATION EMAIL TEMPLATES
// ============================================================================

export async function sendInboxNotificationEmail(inboxData: {
  sender_name: string;
  subject: string;
  preview: string;
  inbox_url: string;
  message_count?: number;
}) {
  return sendTransactionalEmail({
    templateName: 'inbox_notification',
    variables: {
      ...inboxData,
      view_inbox_url: inboxData.inbox_url,
    },
  });
}

export async function sendNewMessageEmail(
  recipientEmail: string,
  messageData: {
    sender_name: string;
    message_preview: string;
    conversation_url: string;
  }
) {
  return sendTransactionalEmail({
    templateName: 'new_message',
    recipientEmail,
    variables: messageData,
  });
}

// ============================================================================
// EMPLOYEE EMAIL TEMPLATES
// ============================================================================

export async function sendEmployeeAddedEmail(employeeData: {
  employee_name: string;
  position: string;
  department?: string;
  start_date: string;
  added_by: string;
}) {
  return sendTransactionalEmail({
    templateName: 'employee_added',
    variables: employeeData,
  });
}

// ============================================================================
// ONBOARDING EMAIL TEMPLATES
// ============================================================================

export async function sendOnboardingWelcomeEmail(welcomeData: {
  user_name: string;
  business_name: string;
  app_url?: string;
  premium_url?: string;
  support_url?: string;
  help_url?: string;
  settings_url?: string;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.ksiegai.pl';
  
  return sendTransactionalEmail({
    templateName: 'witaj_firmo',
    variables: {
      ...welcomeData,
      app_url: welcomeData.app_url || baseUrl,
      premium_url: welcomeData.premium_url || `${baseUrl}/premium`,
      support_url: welcomeData.support_url || `${baseUrl}/support`,
      help_url: welcomeData.help_url || `${baseUrl}/help`,
      settings_url: welcomeData.settings_url || `${baseUrl}/settings`,
      year: new Date().getFullYear(),
    },
  });
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
  const baseUrl = window.location.origin;
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
