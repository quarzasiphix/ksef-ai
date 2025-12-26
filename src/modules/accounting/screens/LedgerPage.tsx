import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAggregatedLedger } from '@/shared/hooks/useAggregatedLedger';
import LedgerTimelineList from '../components/timeline/LedgerTimelineList';
import AuditPanel from '../components/audit/AuditPanel';
import { useOpenTab } from '@/shared/hooks/useOpenTab';
import type { LedgerFilters } from '../types/ledger';
import type { TimelineLedgerEvent, TimelineDateGroup, LedgerDirection, LedgerSource } from '../types/timeline';
import type { AuditPanelState, AuditEvent } from '../types/audit';

export const LedgerPage: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { openInvoiceTab, openExpenseTab, openContractTab } = useOpenTab();
  const [filters, setFilters] = useState<LedgerFilters>({});
  
  // Audit panel state
  const [auditPanelState, setAuditPanelState] = useState<AuditPanelState>('closed');
  const [selectedLedgerEntryId, setSelectedLedgerEntryId] = useState<string | null>(null);
  const [auditPanelWidth, setAuditPanelWidth] = useState<number>(() => {
    const stored = localStorage.getItem('auditPanelWidth');
    return stored ? parseInt(stored, 10) : 480;
  });

  // Persist audit panel width
  useEffect(() => {
    localStorage.setItem('auditPanelWidth', auditPanelWidth.toString());
  }, [auditPanelWidth]);

  const handleEventClick = (event: TimelineLedgerEvent) => {
    switch (event.documentType) {
      case 'invoice':
        openInvoiceTab(event.documentId, event.meta?.docNo || event.documentId);
        break;
      case 'expense':
        openExpenseTab(event.documentId, event.meta?.docNo || event.documentId);
        break;
      case 'contract':
        openContractTab(event.documentId, event.meta?.docNo || event.documentId);
        break;
    }
  };

  const handleShowAudit = (eventId: string) => {
    setSelectedLedgerEntryId(eventId);
    setAuditPanelState('open');
  };

  const handleCloseAudit = () => {
    setAuditPanelState('closed');
    setSelectedLedgerEntryId(null);
  };

  const handleLedgerEntryClickFromAudit = (entryId: string) => {
    setSelectedLedgerEntryId(entryId);
    // Optionally scroll to the entry in the ledger
  };

  // Mock audit hint data - TODO: replace with real data from backend
  const getAuditHint = (eventId: string) => {
    return {
      recordedAt: new Date().toISOString(),
      actorName: 'Jan Nowak',
      isDelayed: Math.random() > 0.8,
      isBackdated: Math.random() > 0.9,
    };
  };

  // Fetch aggregated ledger data from edge function
  const { data: ledgerData, isLoading, error } = useAggregatedLedger(
    selectedProfileId || '',
    {
      startDate: filters.startDate,
      endDate: filters.endDate,
      eventTypes: filters.eventTypes,
      documentTypes: filters.documentTypes,
    }
  );

  // Transform aggregated events to timeline format
  const timelineEvents: TimelineLedgerEvent[] = useMemo(() => {
    if (!ledgerData?.events) return [];
    
    return ledgerData.events.map(event => {
      const rawStatus = event.status;
      const normalizedStatus =
        rawStatus === 'paid' || rawStatus === 'completed'
          ? 'posted'
          : rawStatus === 'unpaid' || rawStatus === 'pending'
            ? 'pending'
            : rawStatus === 'cancelled'
              ? 'cancelled'
              : 'posted';

      // Map direction
      const direction: LedgerDirection = 
        event.direction === 'incoming' ? 'in' :
        event.direction === 'outgoing' ? 'out' : 'neutral';

      // Map source
      const source: LedgerSource = 
        event.document_type === 'invoice' ? 'invoice' :
        event.document_type === 'expense' ? 'expense' :
        event.document_type === 'contract' ? 'contract' :
        event.document_type === 'payment' ? 'payment' :
        event.document_type === 'bank_transaction' ? 'bank' :
        'invoice';

      // Build title from event type
      const titleMap: Record<string, string> = {
        invoice_issued: 'Faktura wystawiona',
        payment_received: 'Płatność otrzymana',
        expense_posted: 'Wydatek zaksięgowany',
        payment_sent: 'Płatność wysłana',
        contract_signed: 'Umowa podpisana',
      };
      const title = titleMap[event.event_type] || event.event_type;

      // Build subtitle
      const subtitle = `${event.document_number} · ${event.counterparty || 'Nieznany'}`;

      return {
        id: event.id,
        occurredAt: event.occurred_at,
        title,
        subtitle,
        amount: {
          value: event.amount,
          currency: event.currency,
        },
        direction,
        source,
        status: normalizedStatus,
        meta: {
          counterpartyName: event.counterparty || undefined,
          docNo: event.document_number,
          decisionId: event.metadata?.decision_id,
          decisionReference: event.metadata?.decision_reference,
        },
        linkedDocuments: [],
        documentId: event.document_id,
        documentType: event.document_type,
      };
    });
  }, [ledgerData, selectedProfileId]);

  // Group events by date
  const groupedEvents: TimelineDateGroup[] = useMemo(() => {
    const groups = new Map<string, TimelineLedgerEvent[]>();
    
    timelineEvents.forEach(event => {
      const dateKey = format(new Date(event.occurredAt), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });

    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      dateLabel: format(new Date(dateKey), 'd MMMM yyyy', { locale: pl }),
      items,
    }));
  }, [timelineEvents]);

  // Mock audit events - TODO: replace with real data from backend
  const auditEvents: AuditEvent[] = useMemo(() => {
    if (!selectedLedgerEntryId) return [];
    
    return [
      {
        id: '1',
        eventType: 'created',
        actionTimestamp: new Date(Date.now() - 86400000).toISOString(),
        actorId: 'user1',
        actorName: 'Jan Nowak',
        actorRole: 'Księgowy',
        description: 'Utworzono fakturę w systemie',
        linkedLedgerEntryIds: [selectedLedgerEntryId],
      },
      {
        id: '2',
        eventType: 'approved',
        actionTimestamp: new Date(Date.now() - 43200000).toISOString(),
        actorId: 'user2',
        actorName: 'Adam Kowalski',
        actorRole: 'Zarząd',
        description: 'Zatwierdzono dokument do księgowania',
        metadata: {
          decisionReference: 'U/2025/001',
        },
      },
      {
        id: '3',
        eventType: 'posted',
        actionTimestamp: new Date().toISOString(),
        actorId: 'user1',
        actorName: 'Jan Nowak',
        actorRole: 'Księgowy',
        description: 'Zaksięgowano w księdze głównej',
        metadata: {
          delayDays: Math.random() > 0.5 ? 12 : 2,
          backdated: Math.random() > 0.7,
        },
        linkedLedgerEntryIds: [selectedLedgerEntryId],
      },
    ];
  }, [selectedLedgerEntryId]);

  // Get selected event context for audit panel header
  const selectedEventContext = useMemo(() => {
    if (!selectedLedgerEntryId) return undefined;
    const event = timelineEvents.find(e => e.id === selectedLedgerEntryId);
    if (!event) return undefined;
    return {
      documentNumber: event.meta?.docNo || event.documentId,
      eventType: event.title,
    };
  }, [selectedLedgerEntryId, timelineEvents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-100 mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ładowanie księgi finansowej...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            Błąd ładowania danych: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Summary stats */}
      {ledgerData?.summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Przychody (PLN)</div>
              <div className="text-2xl font-medium tabular-nums tracking-tight text-slate-50 mt-1">
                {ledgerData.summary.total_incoming.toLocaleString('pl-PL', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} PLN
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Wydatki (PLN)</div>
              <div className="text-2xl font-medium tabular-nums tracking-tight text-slate-50 mt-1">
                {ledgerData.summary.total_outgoing.toLocaleString('pl-PL', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} PLN
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Saldo (PLN)</div>
              <div className="text-2xl font-medium tabular-nums tracking-tight text-slate-50 mt-1">
                {(ledgerData.summary.total_incoming - ledgerData.summary.total_outgoing).toLocaleString('pl-PL', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} PLN
              </div>
            </div>
          </div>

          {ledgerData.summary.currency_totals && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">Waluty</div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Kwoty w walutach źródłowych</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ledgerData.summary.currency_totals).map(([currency, totals]) => (
                  <div
                    key={currency}
                    className="min-w-[160px] flex-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-2 flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{currency}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Saldo: <span className="tabular-nums font-medium tracking-tight text-slate-900 dark:text-slate-100">{totals.net.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-600 dark:text-green-400">
                        +{totals.incoming.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-red-500 dark:text-red-400">
                        −{totals.outgoing.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main layout with optional audit panel */}
      <div className="flex gap-0">
        {/* Timeline Ledger */}
        <div className={cn(
          "flex-1 min-w-0 transition-all",
          auditPanelState === 'pinned' && "pr-6"
        )}>
          <LedgerTimelineList
            groups={groupedEvents}
            onEventClick={handleEventClick}
            onShowAudit={handleShowAudit}
            getAuditHint={getAuditHint}
          />
        </div>

        {/* Audit Panel */}
        {auditPanelState === 'pinned' && (
          <AuditPanel
            state={auditPanelState}
            selectedLedgerEntryId={selectedLedgerEntryId}
            selectedLedgerEntryContext={selectedEventContext}
            width={auditPanelWidth}
            onStateChange={setAuditPanelState}
            onWidthChange={setAuditPanelWidth}
            onClose={handleCloseAudit}
            onLedgerEntryClick={handleLedgerEntryClickFromAudit}
            events={auditEvents}
          />
        )}
      </div>

      {/* Audit Panel (drawer mode) */}
      {auditPanelState === 'open' && (
        <AuditPanel
          state={auditPanelState}
          selectedLedgerEntryId={selectedLedgerEntryId}
          selectedLedgerEntryContext={selectedEventContext}
          width={auditPanelWidth}
          onStateChange={setAuditPanelState}
          onWidthChange={setAuditPanelWidth}
          onClose={handleCloseAudit}
          onLedgerEntryClick={handleLedgerEntryClickFromAudit}
          events={auditEvents}
        />
      )}
    </div>
  );
};

export default LedgerPage;
