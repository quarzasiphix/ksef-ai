import React, { useState } from 'react';
import { X, Link2, FileText, Calculator, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  });

  // Close event mutation
  const closeEventMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('close_accounting_event', {
        p_event_id: eventId,
        p_actor_id: user?.id,
        p_actor_name: user?.email || 'Unknown',
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Szczegóły zdarzenia</h2>
              {eventDetail?.event && (
                <p className="text-sm text-gray-600">
                  {eventDetail.event.action_summary}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-gray-500">Ładowanie...</div>
              </div>
            ) : eventDetail ? (
              <div className="space-y-6 p-6">
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
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

                <Separator />

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
                  <div className="space-y-3">
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
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    <Link2 className="mr-2 h-4 w-4" />
                    Powiąż z...
                  </Button>
                </Section>

                <Separator />

                {/* Section 3: Accounting (Wn/Ma) */}
                <Section
                  icon={Calculator}
                  title="Księgowanie"
                  badge={
                    eventDetail.readiness.missing_accounts ? (
                      <Badge variant="destructive">Brakuje kont</Badge>
                    ) : eventDetail.readiness.is_closed ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Zaksięgowane</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Gotowe</Badge>
                    )
                  }
                >
                  <div className="space-y-3">
                    {/* Account pickers (only if not closed) */}
                    {!eventDetail.readiness.is_closed ? (
                      <div className="grid grid-cols-2 gap-4">
                        <AccountPicker
                          businessProfileId={eventDetail.event.business_profile_id}
                          value={eventDetail.readiness.debit_account}
                          onChange={(code) => {
                            // TODO: Update event metadata with debit account
                            console.log('Debit account selected:', code);
                          }}
                          label="Wn (Debet)"
                          placeholder="Wybierz konto Wn..."
                        />
                        <AccountPicker
                          businessProfileId={eventDetail.event.business_profile_id}
                          value={eventDetail.readiness.credit_account}
                          onChange={(code) => {
                            // TODO: Update event metadata with credit account
                            console.log('Credit account selected:', code);
                          }}
                          label="Ma (Kredyt)"
                          placeholder="Wybierz konto Ma..."
                        />
                      </div>
                    ) : (
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
                    )}

                    <div className="rounded-md bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Kwota księgowania:</span>
                        <span className="font-semibold">
                          {formatCurrency(eventDetail.event.amount, eventDetail.event.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-assign button (placeholder for Session 3-4) */}
                  {!eventDetail.readiness.is_closed && eventDetail.readiness.missing_accounts && (
                    <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                      <Calculator className="mr-2 h-4 w-4" />
                      Auto-przypisz Wn/Ma (Session 3-4: Posting Templates)
                    </Button>
                  )}
                </Section>

                <Separator />

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
                    <Button variant="outline" size="sm" className="mt-4 w-full">
                      <Shield className="mr-2 h-4 w-4" />
                      Dodaj dowód
                    </Button>
                  )}
                </Section>

                <Separator />

                {/* Blockers (if any) */}
                {eventDetail.readiness.blocker_reasons.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start">
                      <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-900">Blokery zamknięcia</h4>
                        <ul className="mt-2 space-y-1 text-sm text-red-800">
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
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {eventDetail.readiness.period_locked && (
                    <span className="text-amber-600">⚠ Okres zablokowany</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Verify button */}
                  <Button
                    variant="outline"
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
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
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
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value}</div>
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
    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3">
      <div>
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
      </div>
      <Button variant="ghost" size="sm">
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {present ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            {value && (
              <span className="font-mono text-xs text-gray-500">
                {value.substring(0, 8)}...
              </span>
            )}
          </>
        ) : (
          <XCircle className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
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
