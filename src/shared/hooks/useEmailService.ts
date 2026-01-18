/**
 * React hook for email service
 * Provides easy-to-use functions for sending emails with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  sendEmail,
  sendAdminEmail,
  sendInvoiceEmail,
  sendEmailToMultipleRecipients,
  sendInvoiceToClient,
  sendInvoiceCreatedNotification,
  sendInvoiceReminder,
  sendOverdueInvoiceNotification,
  type SendEmailParams,
  type SendAdminEmailParams,
  type SendInvoiceEmailParams,
  type EmailVariables,
} from '@/shared/services/emailService';

export interface UseEmailServiceReturn {
  sendEmail: (params: SendEmailParams) => Promise<boolean>;
  sendAdminEmail: (params: SendAdminEmailParams) => Promise<boolean>;
  sendInvoiceEmail: (params: SendInvoiceEmailParams) => Promise<boolean>;
  sendInvoiceToClient: (params: SendInvoiceEmailParams) => Promise<boolean>;
  sendInvoiceCreatedNotification: (invoiceId: string) => Promise<boolean>;
  sendInvoiceReminder: (params: { invoiceId: string; customMessage?: string }) => Promise<boolean>;
  sendOverdueInvoiceNotification: (invoiceId: string) => Promise<boolean>;
  sendEmailToMultipleRecipients: (params: {
    templateKey: string;
    recipients: string[];
    variables?: EmailVariables;
    invoiceId?: string;
    customMessage?: string;
  }) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useEmailService(): UseEmailServiceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(async <T extends any[]>(
    apiCall: (...args: T) => Promise<{ success: boolean; error?: string }>,
    successMessage?: string,
    ...args: T
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall(...args);
      
      if (result.success) {
        if (successMessage) {
          toast.success(successMessage);
        }
        return true;
      } else {
        const errorMessage = result.error || 'Failed to send email';
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Basic email sending
  const sendEmailHandler = useCallback(
    (params: SendEmailParams) => 
      handleApiCall(sendEmail, 'Email sent successfully', params),
    [handleApiCall]
  );

  // Admin email sending
  const sendAdminEmailHandler = useCallback(
    (params: SendAdminEmailParams) => 
      handleApiCall(sendAdminEmail, 'Admin email sent successfully', params),
    [handleApiCall]
  );

  // Invoice email sending
  const sendInvoiceEmailHandler = useCallback(
    (params: SendInvoiceEmailParams) => 
      handleApiCall(sendInvoiceEmail, 'Invoice email sent successfully', params),
    [handleApiCall]
  );

  // Send invoice to client (alias for clarity)
  const sendInvoiceToClientHandler = useCallback(
    (params: SendInvoiceEmailParams) => 
      handleApiCall(sendInvoiceToClient, 'Invoice sent to client successfully', params),
    [handleApiCall]
  );

  // Invoice created notification
  const sendInvoiceCreatedNotificationHandler = useCallback(
    (invoiceId: string) => 
      handleApiCall(
        sendInvoiceCreatedNotification, 
        'Invoice notification sent successfully', 
        invoiceId
      ),
    [handleApiCall]
  );

  // Invoice reminder
  const sendInvoiceReminderHandler = useCallback(
    (params: { invoiceId: string; customMessage?: string }) => 
      handleApiCall(
        sendInvoiceReminder, 
        'Invoice reminder sent successfully', 
        params
      ),
    [handleApiCall]
  );

  // Overdue invoice notification
  const sendOverdueInvoiceNotificationHandler = useCallback(
    (invoiceId: string) => 
      handleApiCall(
        sendOverdueInvoiceNotification, 
        'Overdue invoice notification sent successfully', 
        invoiceId
      ),
    [handleApiCall]
  );

  // Multiple recipients
  const sendEmailToMultipleRecipientsHandler = useCallback(
    (params: {
      templateKey: string;
      recipients: string[];
      variables?: EmailVariables;
      invoiceId?: string;
      customMessage?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      return sendEmailToMultipleRecipients(params)
        .then(result => {
          if (result.success) {
            toast.success(`Email sent to ${params.recipients.length} recipients successfully`);
            return true;
          } else {
            const errorMessage = result.errors.join(', ');
            setError(errorMessage);
            toast.error(`Failed to send some emails: ${errorMessage}`);
            return false;
          }
        })
        .catch(err => {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
          setError(errorMessage);
          toast.error(errorMessage);
          return false;
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    []
  );

  return {
    sendEmail: sendEmailHandler,
    sendAdminEmail: sendAdminEmailHandler,
    sendInvoiceEmail: sendInvoiceEmailHandler,
    sendInvoiceToClient: sendInvoiceToClientHandler,
    sendInvoiceCreatedNotification: sendInvoiceCreatedNotificationHandler,
    sendInvoiceReminder: sendInvoiceReminderHandler,
    sendOverdueInvoiceNotification: sendOverdueInvoiceNotificationHandler,
    sendEmailToMultipleRecipients: sendEmailToMultipleRecipientsHandler,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook specifically for invoice email operations
 */
export function useInvoiceEmailService() {
  const {
    sendInvoiceToClient,
    sendInvoiceCreatedNotification,
    sendInvoiceReminder,
    sendOverdueInvoiceNotification,
    isLoading,
    error,
    clearError,
  } = useEmailService();

  return {
    sendInvoiceToClient,
    sendInvoiceCreatedNotification,
    sendInvoiceReminder,
    sendOverdueInvoiceNotification,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook specifically for admin email operations
 */
export function useAdminEmailService() {
  const {
    sendAdminEmail,
    sendEmailToMultipleRecipients,
    isLoading,
    error,
    clearError,
  } = useEmailService();

  return {
    sendAdminEmail,
    sendEmailToMultipleRecipients,
    isLoading,
    error,
    clearError,
  };
}
