import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logEvent } from '@/modules/accounting/data/eventsRepository';
import type { EventType } from '@/shared/types/events';

interface LogEventOptions {
  decisionId?: string;
  entityReference?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  parentEventId?: string;
}

export function useEventLogging(businessProfileId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      eventType,
      entityType,
      entityId,
      actionSummary,
      options,
    }: {
      eventType: EventType;
      entityType: string;
      entityId: string;
      actionSummary: string;
      options?: LogEventOptions;
    }) => {
      return logEvent(
        businessProfileId,
        eventType,
        entityType,
        entityId,
        actionSummary,
        options
      );
    },
    onSuccess: () => {
      // Invalidate events query to refresh the event chain
      queryClient.invalidateQueries({ queryKey: ['company-events', businessProfileId] });
    },
    onError: (error) => {
      console.error('Failed to log event:', error);
      toast.error('Nie udało się zalogować zdarzenia');
    },
  });

  return {
    logEvent: mutation.mutate,
    logEventAsync: mutation.mutateAsync,
    isLogging: mutation.isPending,
  };
}

// Convenience hooks for specific event types
export function useLogInvoiceEvent(businessProfileId: string) {
  const { logEvent, logEventAsync, isLogging } = useEventLogging(businessProfileId);

  return {
    logInvoiceCreated: (invoiceId: string, invoiceNumber: string, decisionId?: string) =>
      logEvent({
        eventType: 'invoice_created',
        entityType: 'invoice',
        entityId: invoiceId,
        actionSummary: `Utworzono fakturę ${invoiceNumber}`,
        options: {
          entityReference: invoiceNumber,
          decisionId,
        },
      }),
    logInvoiceIssued: (invoiceId: string, invoiceNumber: string, decisionId?: string) =>
      logEvent({
        eventType: 'invoice_issued',
        entityType: 'invoice',
        entityId: invoiceId,
        actionSummary: `Wystawiono fakturę ${invoiceNumber}`,
        options: {
          entityReference: invoiceNumber,
          decisionId,
        },
      }),
    isLogging,
  };
}

export function useLogExpenseEvent(businessProfileId: string) {
  const { logEvent, isLogging } = useEventLogging(businessProfileId);

  return {
    logExpenseCreated: (expenseId: string, description: string, decisionId?: string) =>
      logEvent({
        eventType: 'expense_created',
        entityType: 'expense',
        entityId: expenseId,
        actionSummary: `Utworzono wydatek: ${description}`,
        options: {
          entityReference: description,
          decisionId,
        },
      }),
    logExpenseApproved: (expenseId: string, description: string) =>
      logEvent({
        eventType: 'expense_approved',
        entityType: 'expense',
        entityId: expenseId,
        actionSummary: `Zatwierdzono wydatek: ${description}`,
        options: {
          entityReference: description,
        },
      }),
    isLogging,
  };
}

export function useLogContractEvent(businessProfileId: string) {
  const { logEvent, isLogging } = useEventLogging(businessProfileId);

  return {
    logContractCreated: (contractId: string, contractNumber: string, decisionId?: string) =>
      logEvent({
        eventType: 'contract_created',
        entityType: 'contract',
        entityId: contractId,
        actionSummary: `Utworzono umowę ${contractNumber}`,
        options: {
          entityReference: contractNumber,
          decisionId,
        },
      }),
    logContractSigned: (contractId: string, contractNumber: string) =>
      logEvent({
        eventType: 'contract_signed',
        entityType: 'contract',
        entityId: contractId,
        actionSummary: `Podpisano umowę ${contractNumber}`,
        options: {
          entityReference: contractNumber,
        },
      }),
    isLogging,
  };
}

export function useLogEmployeeEvent(businessProfileId: string) {
  const { logEvent, isLogging } = useEventLogging(businessProfileId);

  return {
    logEmployeeHired: (employeeId: string, employeeName: string, decisionId?: string) =>
      logEvent({
        eventType: 'employee_hired',
        entityType: 'employee',
        entityId: employeeId,
        actionSummary: `Zatrudniono pracownika: ${employeeName}`,
        options: {
          entityReference: employeeName,
          decisionId,
        },
      }),
    logEmployeeTerminated: (employeeId: string, employeeName: string) =>
      logEvent({
        eventType: 'employee_terminated',
        entityType: 'employee',
        entityId: employeeId,
        actionSummary: `Zwolniono pracownika: ${employeeName}`,
        options: {
          entityReference: employeeName,
        },
      }),
    isLogging,
  };
}

export function useLogBankAccountEvent(businessProfileId: string) {
  const { logEvent, isLogging } = useEventLogging(businessProfileId);

  return {
    logBankAccountAdded: (accountId: string, accountNumber: string, decisionId?: string) =>
      logEvent({
        eventType: 'bank_account_added',
        entityType: 'bank_account',
        entityId: accountId,
        actionSummary: `Dodano konto bankowe: ${accountNumber}`,
        options: {
          entityReference: accountNumber,
          decisionId,
        },
      }),
    logBankAccountRemoved: (accountId: string, accountNumber: string) =>
      logEvent({
        eventType: 'bank_account_removed',
        entityType: 'bank_account',
        entityId: accountId,
        actionSummary: `Usunięto konto bankowe: ${accountNumber}`,
        options: {
          entityReference: accountNumber,
        },
      }),
    isLogging,
  };
}
