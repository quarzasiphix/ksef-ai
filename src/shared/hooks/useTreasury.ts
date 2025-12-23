// Treasury Hook - React integration for payment accounts and invoice payments

import { useState, useEffect, useCallback } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import {
  getUnifiedAccounts,
  getUnifiedAccount,
  payInvoice,
  getInvoicePaymentStatus,
  recordKasaKP,
  recordKasaKW,
  transferBetweenAccounts,
  correctAccountBalance,
  reverseTransaction,
  getTreasurySummary,
  getAccountMovements,
  type UnifiedAccount,
  type InvoicePaymentResult,
  type KasaTransactionResult,
  type TransferResult,
} from '@/shared/lib/treasury-service';
import type { DocumentPaymentStatus, TreasurySummary, AccountMovement } from '@/shared/types/treasury';

// =============================================================================
// PAYMENT ACCOUNTS HOOK
// =============================================================================

export function usePaymentAccounts(type?: 'BANK' | 'CASH') {
  const { selectedProfileId } = useBusinessProfile();
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const data = await getUnifiedAccounts(selectedProfileId, type);
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accounts'));
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { accounts, loading, error, refresh };
}

export function usePaymentAccount(accountId: string | null) {
  const [account, setAccount] = useState<UnifiedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setAccount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUnifiedAccount(accountId);
      setAccount(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load account'));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { account, loading, error, refresh };
}

// =============================================================================
// TREASURY SUMMARY HOOK
// =============================================================================

export function useTreasurySummary() {
  const { selectedProfileId } = useBusinessProfile();
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const data = await getTreasurySummary(selectedProfileId);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load summary'));
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}

// =============================================================================
// INVOICE PAYMENT HOOK
// =============================================================================

interface UseInvoicePaymentOptions {
  invoiceId: string;
  invoiceType: 'income' | 'expense';
  invoiceTotal: number;
}

export function useInvoicePayment(options: UseInvoicePaymentOptions) {
  const { selectedProfileId } = useBusinessProfile();
  const [status, setStatus] = useState<DocumentPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const data = await getInvoicePaymentStatus(
        selectedProfileId,
        options.invoiceId,
        options.invoiceType,
        options.invoiceTotal
      );
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load payment status'));
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, options.invoiceId, options.invoiceType, options.invoiceTotal]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const recordPayment = useCallback(async (
    paymentAccountId: string,
    amount: number,
    paymentDate: string,
    notes?: string
  ): Promise<InvoicePaymentResult> => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      const result = await payInvoice(
        selectedProfileId,
        options.invoiceId,
        options.invoiceType,
        paymentAccountId,
        amount,
        paymentDate,
        options.invoiceTotal,
        notes
      );
      await refreshStatus();
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId, options, refreshStatus]);

  return {
    status,
    loading,
    submitting,
    error,
    recordPayment,
    refreshStatus,
    isPaid: status?.status === 'paid',
    isPartiallyPaid: status?.status === 'partial',
    remaining: status?.remaining ?? options.invoiceTotal,
  };
}

// =============================================================================
// KASA (CASH REGISTER) HOOK
// =============================================================================

interface UseKasaOptions {
  cashAccountId: string;
}

export function useKasa(options: UseKasaOptions) {
  const { selectedProfileId } = useBusinessProfile();
  const { account, loading: accountLoading, refresh: refreshAccount } = usePaymentAccount(options.cashAccountId);
  const [submitting, setSubmitting] = useState(false);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);

  const refreshMovements = useCallback(async () => {
    if (!selectedProfileId || !options.cashAccountId) return;
    setMovementsLoading(true);
    try {
      const data = await getAccountMovements(selectedProfileId, {
        paymentAccountId: options.cashAccountId,
        limit: 50,
      });
      setMovements(data);
    } finally {
      setMovementsLoading(false);
    }
  }, [selectedProfileId, options.cashAccountId]);

  useEffect(() => {
    refreshMovements();
  }, [refreshMovements]);

  const recordKP = useCallback(async (
    amount: number,
    description: string,
    paymentDate: string,
    counterparty?: string,
    category?: string
  ): Promise<KasaTransactionResult> => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      const result = await recordKasaKP(
        selectedProfileId,
        options.cashAccountId,
        amount,
        description,
        paymentDate,
        counterparty,
        category
      );
      await Promise.all([refreshAccount(), refreshMovements()]);
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId, options.cashAccountId, refreshAccount, refreshMovements]);

  const recordKW = useCallback(async (
    amount: number,
    description: string,
    paymentDate: string,
    counterparty?: string,
    category?: string,
    isTaxDeductible: boolean = true
  ): Promise<KasaTransactionResult> => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      const result = await recordKasaKW(
        selectedProfileId,
        options.cashAccountId,
        amount,
        description,
        paymentDate,
        counterparty,
        category,
        isTaxDeductible
      );
      await Promise.all([refreshAccount(), refreshMovements()]);
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId, options.cashAccountId, refreshAccount, refreshMovements]);

  return {
    account,
    balance: account?.balance ?? 0,
    movements,
    loading: accountLoading || movementsLoading,
    submitting,
    recordKP,
    recordKW,
    refresh: async () => {
      await Promise.all([refreshAccount(), refreshMovements()]);
    },
  };
}

// =============================================================================
// TRANSFER HOOK
// =============================================================================

export function useTransfer() {
  const { selectedProfileId } = useBusinessProfile();
  const [submitting, setSubmitting] = useState(false);

  const transfer = useCallback(async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    transferDate: string,
    description?: string
  ): Promise<TransferResult> => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      return await transferBetweenAccounts(
        selectedProfileId,
        fromAccountId,
        toAccountId,
        amount,
        transferDate,
        description
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId]);

  return { transfer, submitting };
}

// =============================================================================
// CORRECTIONS HOOK
// =============================================================================

export function useCorrections() {
  const { selectedProfileId } = useBusinessProfile();
  const [submitting, setSubmitting] = useState(false);

  const adjustBalance = useCallback(async (
    accountId: string,
    direction: 'IN' | 'OUT',
    amount: number,
    reason: string
  ) => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      return await correctAccountBalance(selectedProfileId, accountId, direction, amount, reason);
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId]);

  const reverseMovement = useCallback(async (
    movementId: string,
    reason: string
  ) => {
    if (!selectedProfileId) throw new Error('No profile selected');
    setSubmitting(true);
    try {
      return await reverseTransaction(selectedProfileId, movementId, reason);
    } finally {
      setSubmitting(false);
    }
  }, [selectedProfileId]);

  return { adjustBalance, reverseMovement, submitting };
}
