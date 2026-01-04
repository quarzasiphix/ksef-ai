import React, { useState } from 'react';
import { X, Link2, FileText, Calculator, Shield, CheckCircle, XCircle, AlertCircle, Sparkles, RefreshCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AccountPicker } from './AccountPicker';

interface EventDetailDrawerProps {
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EventDetail {
  event: any;
  readiness: {
    event_id: string;
    debit_account: string;
    credit_account: string;
    is_closed: boolean;
    verified: boolean;
    event_hash: string;
    bank_transaction_id: string;
    ksef_reference_number: string;
    decision_id: string;
    period_year: number | null;
    period_month: number | null;
    period_locked: boolean;
    missing_accounts: boolean;
    missing_required_links: boolean;
    missing_required_proof: boolean;
    can_close: boolean;
    can_verify: boolean;
    blocker_reasons: string[];
  };
  linked_entity: any;
  linked_operation: any;
  linked_decision: any;
}

export function EventDetailDrawer({ eventId, isOpen, onClose }: EventDetailDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local state for posting mode
  const [isManualMode, setIsManualMode] = useState(false);
  const [debitAccount, setDebitAccount] = useState<string | null>(null);
  const [creditAccount, setCreditAccount] = useState<string | null>(null);

  // Fetch event detail
  const { data: eventDetail, isLoading } = useQuery<EventDetail>({
    queryKey: ['event-detail', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase.rpc('get_event_detail_for_drawer', {
        p_event_id: eventId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId && isOpen,
    onSuccess: (data) => {
      // Initialize local state from event readiness
      if (data) {
        setDebitAccount(data.readiness.debit_account);
        setCreditAccount(data.readiness.credit_account);
      }
    },
  });
  
  // Fetch posting rule suggestion
  const { data: postingRule } = useQuery({
    queryKey: ['posting-rule', eventDetail?.event.business_profile_id, eventDetail?.event.entity_type, eventDetail?.event.metadata],
    queryFn: async () => {
      if (!eventDetail) return null;

      const metadata = eventDetail.event.metadata || {};
      const documentType =
        metadata.document_type ||
        eventDetail.event.entity_type ||
        eventDetail.event.event_type ||
        'sales_invoice';
      const transactionType =
        metadata.transaction_type ||
        (eventDetail.event.direction === 'incoming'
          ? 'income'
          : eventDetail.event.direction === 'outgoing'
            ? 'expense'
            : null);
      const paymentMethod = metadata.payment_method || metadata.cash_channel || null;
      const vatScheme =
        metadata.vat_scheme ||
        (metadata.vat_status === 'no_vat'
          ? 'no_vat'
          : metadata.vat_status === 'vat'
            ? 'vat'
            : null);
      const vatRate = metadata.vat_rate ?? null;

      const { data, error } = await supabase.rpc('find_posting_rule', {
        p_business_profile_id: eventDetail.event.business_profile_id,
        p_document_type: documentType,
        p_transaction_type: transactionType,
        p_payment_method: paymentMethod,
        p_vat_scheme: vatScheme,
        p_vat_rate: vatRate,
      });
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!eventDetail && !eventDetail.readiness.is_closed,
  });

  // Set event accounts mutation
  const setAccountsMutation = useMutation({
    mutationFn: async ({ debit, credit }: { debit: string; credit: string }) => {
      const { data, error } = await supabase.rpc('set_event_accounts', {
        p_event_id: eventId,
        p_debit_account_code: debit,
        p_credit_account_code: credit,
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events-posting-readiness'] });
    },
  });
  
  // Toggle manual mode
  const handleToggleManualMode = () => {
    setIsManualMode(!isManualMode);
  };
  
  // Close event mutation
  const closeEventMutation = useMutation({
    mutationFn: async () => {
      // Auto mode: use posting rule
      if (!isManualMode && postingRule) {
        const { data, error } = await supabase.rpc('close_accounting_event', {
          p_event_id: eventId,
          p_actor_id: user?.id,
          p_actor_name: user?.email || 'Unknown',
          p_posting_rule_id: postingRule.rule_id,
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        return data;
      }
      
      // Manual mode: use selected accounts
      if (!debitAccount || !creditAccount) {
        throw new Error('Both debit and credit accounts must be selected');
      }
      
      const { data, error } = await supabase.rpc('close_accounting_event', {
        p_event_id: eventId,
        p_actor_id: user?.id,
        p_actor_name: user?.email || 'Unknown',
        p_debit_account_code: debitAccount,
        p_credit_account_code: creditAccount,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-posting-readiness'] });
    },
  });

  // Verify event mutation
  const verifyEventMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('verify_event_integrity', {
        p_event_id: eventId,
        p_actor_id: user?.id,
        p_actor_name: user?.email || 'Unknown',
        p_verification_method: 'manual',
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl">
        <div className="flex h-full flex-col overflow-hidden rounded-l-3xl border border-slate-800 bg-[#030712] text-slate-50 shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/5 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/30 px-8 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Event detail drawer</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{eventDetail?.event?.action_summary || 'Szczegóły zdarzenia'}</h2>
                {eventDetail?.event?.event_number && (
                  <p className="mt-1 font-mono text-xs text-slate-400">{eventDetail.event.event_number}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCcw className="h-5 w-5 animate-spin text-primary" />
                  Ładowanie...
                </div>
              </div>
            ) : eventDetail ? (
              <div className="space-y-8 px-8 py-6">
                {/* Section 1: Context */}
                <Section
                  icon={FileText}
                  title="Kontekst"
                  badge={
                    eventDetail.readiness.is_closed ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Zamknięte</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Otwarte</Badge>
                    )
                  }
                >
                  <div className="grid grid-cols-2 gap-5 text-sm">
                    <InfoRow label="Typ" value={eventDetail.event.event_type} />
                    <InfoRow label="Status" value={eventDetail.event.status} />
                    <InfoRow 
                      label="Data wystąpienia" 
                      value={format(new Date(eventDetail.event.occurred_at), 'dd MMM yyyy HH:mm', { locale: pl })} 
                    />
                    <InfoRow 
                      label="Okres" 
                      value={eventDetail.readiness.period_year && eventDetail.readiness.period_month
                        ? `${eventDetail.readiness.period_month}/${eventDetail.readiness.period_year}`
                        : 'Nie przypisano'
                      } 
                    />
                    <InfoRow label="Aktor" value={eventDetail.event.actor_name || 'System'} />
                    <InfoRow 
                      label="Kwota" 
                      value={formatCurrency(eventDetail.event.amount, eventDetail.event.currency)} 
                    />
                  </div>
                </Section>

                <Separator className="border-white/5" />

                {/* Section 2: Chain (Links) */}
                <Section
                  icon={Link2}
                  title="Powiązania"
                  badge={
                    eventDetail.readiness.missing_required_links ? (
                      <Badge variant="destructive">Brakuje wymaganych</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Kompletne</Badge>
                    )
                  }
                >
                  <div className="space-y-4">
                    {/* Linked Entity */}
                    {eventDetail.linked_entity ? (
                      <LinkedItem
                        type={eventDetail.linked_entity.type}
                        label={eventDetail.linked_entity.type === 'invoice' ? 'Faktura' : 'Wydatek'}
                        value={eventDetail.linked_entity.number || eventDetail.linked_entity.description}
                        id={eventDetail.linked_entity.id}
                      />
                    ) : (
                      <div className="text-sm text-gray-500">Brak powiązanej faktury/wydatku</div>
                    )}

                    {/* Linked Operation */}
                    {eventDetail.linked_operation ? (
                      <LinkedItem
                        type="operation"
                        label="Operacja"
                        value={eventDetail.linked_operation.job_number}
                        id={eventDetail.linked_operation.id}
                      />
                    ) : null}

                    {/* Linked Decision */}
                    {eventDetail.linked_decision ? (
                      <LinkedItem
                        type="decision"
                        label="Decyzja"
                        value={eventDetail.linked_decision.decision_number}
                        id={eventDetail.linked_decision.id}
                      />
                    ) : null}
                  </div>

                  {/* Link action button */}
                  <Button variant="secondary" size="sm" className="mt-4 w-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
                    <Link2 className="mr-2 h-4 w-4" />
                    Powiąż z...
                  </Button>
                </Section>

                <Separator className="border-white/5" />

                {/* Section 2b: Change details */}
                {eventDetail.event?.changes && Object.keys(eventDetail.event.changes).length > 0 && (
                  <>
                    <Section
                      icon={Sparkles}
                      title="Szczegóły zmian"
                      badge={
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300">
                          {Object.keys(eventDetail.event.changes).length} pól
                        </Badge>
                      }
                    >
                      <ChangesList changes={eventDetail.event.changes} />
                    </Section>
                    <Separator className="border-white/5" />
                  </>
                )}

                {/* Section 3: Accounting (Wn/Ma) */}
                <Section
                  icon={Calculator}
                  title="Księgowanie"
                  badge={
                    eventDetail.readiness.is_closed ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Zaksięgowane</Badge>
                    ) : postingRule ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Automatyczne</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Ręczne</Badge>
                    )
                  }
                >
                  <div className="space-y-3">
                    {!eventDetail.readiness.is_closed ? (
                      <>
                        {/* Auto-posting mode */}
                        {!isManualMode && postingRule ? (
                          <div className="space-y-3">
                            {/* Rule header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium text-slate-300">
                                  Automatyczne księgowanie
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToggleManualMode}
                                className="text-xs text-slate-400 hover:text-slate-200"
                              >
                                Tryb ręczny
                              </Button>
                            </div>

                            {/* Rule name */}
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                              <div className="text-xs text-slate-400 mb-1">Reguła:</div>
                              <div className="text-sm font-medium text-white">{postingRule.rule_name}</div>
                            </div>

                            {/* Account preview */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-slate-400">Zapisy księgowe:</div>
                              {postingRule.lines && JSON.parse(postingRule.lines).map((line: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <Badge variant="outline" className={line.side === 'debit' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}>
                                    {line.side === 'debit' ? 'Wn' : 'Ma'}
                                  </Badge>
                                  <span className="font-mono text-xs text-slate-400">{line.account_code}</span>
                                  <span className="text-slate-300">{line.account_name}</span>
                                  <span className="ml-auto text-xs text-slate-500">{line.amount_type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Manual mode - show account pickers */
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-300">Tryb ręczny</span>
                              {postingRule && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleToggleManualMode}
                                  className="text-xs text-slate-400 hover:text-slate-200"
                                >
                                  Tryb automatyczny
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <AccountPicker
                                businessProfileId={eventDetail.event.business_profile_id}
                                value={debitAccount}
                                onChange={(code) => {
                                  setDebitAccount(code);
                                  if (code && creditAccount) {
                                    setAccountsMutation.mutate({ debit: code, credit: creditAccount });
                                  }
                                }}
                                label="Wn (Debet)"
                                placeholder="Wybierz konto Wn..."
                              />
                              <AccountPicker
                                businessProfileId={eventDetail.event.business_profile_id}
                                value={creditAccount}
                                onChange={(code) => {
                                  setCreditAccount(code);
                                  if (debitAccount && code) {
                                    setAccountsMutation.mutate({ debit: debitAccount, credit: code });
                                  }
                                }}
                                label="Ma (Kredyt)"
                                placeholder="Wybierz konto Ma..."
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Closed - show posted accounts */
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-400 mb-2">Zaksięgowano:</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-500">Wn (Debet)</div>
                            <div className="mt-1 text-sm font-mono">
                              {eventDetail.readiness.debit_account || (
                                <span className="text-red-600">Nie przypisano</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">Ma (Kredyt)</div>
                            <div className="mt-1 text-sm font-mono">
                              {eventDetail.readiness.credit_account || (
                                <span className="text-red-600">Nie przypisano</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount display */}
                    <div className="rounded-lg border border-white/5 bg-white/5 p-4 text-sm">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Kwota księgowania:</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(eventDetail.event.amount, eventDetail.event.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Section>

                <Separator className="border-white/5" />

                {/* Section 4: Proof */}
                <Section
                  icon={Shield}
                  title="Dowody"
                  badge={
                    eventDetail.readiness.verified ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Zweryfikowane</Badge>
                    ) : eventDetail.readiness.missing_required_proof ? (
                      <Badge variant="destructive">Brakuje wymaganych</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Niezweryfikowane</Badge>
                    )
                  }
                >
                  <div className="space-y-3">
                    <ProofIndicator
                      label="Hash zdarzenia"
                      present={!!eventDetail.readiness.event_hash}
                      value={eventDetail.readiness.event_hash}
                    />
                    <ProofIndicator
                      label="Transakcja bankowa"
                      present={!!eventDetail.readiness.bank_transaction_id}
                      value={eventDetail.readiness.bank_transaction_id}
                    />
                    <ProofIndicator
                      label="Referencja KSeF"
                      present={!!eventDetail.readiness.ksef_reference_number}
                      value={eventDetail.readiness.ksef_reference_number}
                    />
                    <ProofIndicator
                      label="Decyzja"
                      present={!!eventDetail.readiness.decision_id}
                      value={eventDetail.readiness.decision_id}
                    />
                  </div>

                  {/* Add proof button */}
                  {!eventDetail.readiness.is_closed && (
                    <Button variant="secondary" size="sm" className="mt-4 w-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
                    <Shield className="mr-2 h-4 w-4" />
                    Dodaj dowód
                  </Button>
                )}
                </Section>

                <Separator className="border-white/5" />

                {/* Blockers (if any) */}
                {eventDetail.readiness.blocker_reasons.length > 0 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-1 h-5 w-5 text-red-400" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-100">Blokery zamknięcia</h4>
                        <ul className="mt-2 space-y-1 text-sm text-red-200">
                          {eventDetail.readiness.blocker_reasons.map((reason, idx) => (
                            <li key={idx}>• {translateBlockerReason(reason)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-gray-500">Nie znaleziono zdarzenia</div>
              </div>
            )}
          </div>

          {/* Section 5: Actions (Footer) */}
          {eventDetail && (
            <div className="border-t border-white/5 bg-slate-950/80 px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-slate-400">
                  {eventDetail.readiness.period_locked && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-amber-300">
                      ⚠ Okres zablokowany
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Verify button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!eventDetail.readiness.can_verify || verifyEventMutation.isPending}
                    onClick={() => verifyEventMutation.mutate()}
                    title={
                      !eventDetail.readiness.can_verify
                        ? eventDetail.readiness.verified
                          ? 'Już zweryfikowane'
                          : !eventDetail.readiness.is_closed
                          ? 'Najpierw zamknij zdarzenie'
                          : 'Brak hash do weryfikacji'
                        : 'Zweryfikuj integralność'
                    }
                    className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Zweryfikuj
                  </Button>

                  {/* Close button */}
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!eventDetail.readiness.can_close || closeEventMutation.isPending}
                    onClick={() => closeEventMutation.mutate()}
                    title={
                      !eventDetail.readiness.can_close
                        ? eventDetail.readiness.blocker_reasons.length > 0
                          ? `Blokery: ${eventDetail.readiness.blocker_reasons.join(', ')}`
                          : eventDetail.readiness.is_closed
                          ? 'Już zamknięte'
                          : 'Nie można zamknąć'
                        : 'Zamknij zdarzenie'
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Zamknij
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper components

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, badge, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string | number;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value ?? '—'}</div>
    </div>
  );
}

interface LinkedItemProps {
  type: string;
  label: string;
  value: string;
  id: string;
}

function LinkedItem({ type, label, value, id }: LinkedItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-1 text-sm font-medium text-white">{value}</div>
      </div>
      <Button variant="ghost" size="sm" className="text-primary hover:bg-white/10">
        Otwórz
      </Button>
    </div>
  );
}

interface ProofIndicatorProps {
  label: string;
  present: boolean;
  value?: string;
}

function ProofIndicator({ label, present, value }: ProofIndicatorProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {present ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-400" />
            {value && (
              <span className="font-mono text-xs text-slate-400">
                {value.substring(0, 8)}...
              </span>
            )}
          </>
        ) : (
          <XCircle className="h-4 w-4 text-slate-600" />
        )}
      </div>
    </div>
  );
}

interface ChangesListProps {
  changes: Record<string, unknown>;
}

function ChangesList({ changes }: ChangesListProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/40">
      <dl className="divide-y divide-white/5">
        {Object.entries(changes).map(([key, value]) => (
          <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {formatChangeLabel(key)}
            </dt>
            <dd className="font-medium text-white">{formatChangeValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatChangeLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'number') {
    return new Intl.NumberFormat('pl-PL', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Tak' : 'Nie';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function translateBlockerReason(reason: string): string {
  const translations: Record<string, string> = {
    missing_debit_account: 'Brak konta Wn (debet)',
    missing_credit_account: 'Brak konta Ma (kredyt)',
    missing_entity_link: 'Brak powiązania z fakturą/wydatkiem',
    missing_operation_link: 'Brak powiązania z operacją',
    missing_ksef_proof: 'Brak referencji KSeF (wymagane dla kwot >15k)',
    missing_bank_proof: 'Brak powiązania z transakcją bankową',
    period_locked: 'Okres zablokowany',
  };
  return translations[reason] || reason;
}
