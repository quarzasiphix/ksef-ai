import React from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useInboxEvents, useClassifyEvent, useApproveEvent } from '@/shared/hooks/useUnifiedEvents';
import { InboxEmptyState } from '../components/InboxEmptyState';
import { InboxEventCard } from '../components/InboxEventCard';
import { Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getInvoiceSharesReceived } from '@/modules/invoices/data/invoiceShareRepository';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FileText, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';

/**
 * Unified inbox page showing unposted events needing action
 * Events automatically disappear when posted to ledger
 */
export const UnifiedInboxPage: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: inboxEvents, isLoading } = useInboxEvents(selectedProfileId || '');
  const classifyMutation = useClassifyEvent();
  const approveMutation = useApproveEvent();

  // Fallback: fetch received invoice shares to populate inbox
  const { data: receivedShares = [], isLoading: isLoadingShares } = useQuery({
    queryKey: ['received-invoice-shares', user?.id],
    queryFn: () => user?.id ? getInvoiceSharesReceived(user.id) : [],
    enabled: !!user?.id,
  });

  const handleClassify = (eventId: string) => {
    navigate(`/inbox/classify/${eventId}`);
  };

  const handleApprove = async (eventId: string) => {
    try {
      await approveMutation.mutateAsync(eventId);
      toast.success('Zdarzenie zatwierdzone i zaksięgowane');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Nie udało się zatwierdzić zdarzenia');
      }
    }
  };

  const handleCreateDecision = (eventId: string) => {
    navigate(`/decisions/create?for_event=${eventId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  const events = inboxEvents || [];

  // Transform received shares into inbox-like events for display
  const shareEvents = receivedShares.map(share => ({
    id: `share-${share.id}`,
    event_type: 'invoice_received',
    occurred_at: share.shared_at,
    recorded_at: share.shared_at,
    amount: share.invoices?.total_gross_value,
    currency: 'PLN',
    status: share.status === 'accepted' ? 'approved' : share.status === 'viewed' ? 'classified' : 'captured',
    document_number: share.invoices?.number || 'Brak numeru',
    counterparty: share.invoices?.business_profiles?.name || share.invoices?.customers?.name || 'Nieznany nadawca',
    blocked_by: null,
    blocked_reason: null,
    inbox_reasons: share.status === 'sent' ? ['Otrzymano nową fakturę'] : [],
    // Store original data for navigation
    _shareId: share.id,
    _invoiceId: share.invoice_id,
    // Additional details for display
    _businessProfileName: share.invoices?.business_profiles?.name,
    _businessProfileTaxId: share.invoices?.business_profiles?.tax_id,
    _customerName: share.invoices?.customers?.name,
    _customerTaxId: share.invoices?.customers?.tax_id,
    _customerAddress: share.invoices?.customers?.address,
    _customerCity: share.invoices?.customers?.city,
    _customerPostalCode: share.invoices?.customers?.postal_code,
  }));

  // Merge real events with share events
  const allEvents = [...events, ...shareEvents];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Skrzynka
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Zdarzenia do rozliczenia
          </p>
        </div>
      </div>

      {/* Content */}
      {allEvents.length === 0 ? (
        <InboxEmptyState />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {allEvents.length} {allEvents.length === 1 ? 'zdarzenie' : 'zdarzeń'} do rozliczenia
            </p>
          </div>

          <div className="space-y-3">
            {allEvents.map((event) => {
              // For share events, render a simplified card that navigates to invoice detail
              if (event.id.startsWith('share-')) {
                return (
                  <Card key={event.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {event.document_number}
                              </h3>
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                Faktura otrzymana
                              </Badge>
                            </div>
                            
                            {event.counterparty && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                od: {event.counterparty}
                                {event._businessProfileTaxId && (
                                  <span className="text-xs text-slate-500 ml-1">
                                    (NIP: {event._businessProfileTaxId})
                                  </span>
                                )}
                              </p>
                            )}
                            
                            {event._customerName && event._customerName !== event.counterparty && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                Kontrahent: {event._customerName}
                                {event._customerTaxId && (
                                  <span className="text-xs text-slate-500 ml-1">
                                    (NIP: {event._customerTaxId})
                                  </span>
                                )}
                              </p>
                            )}
                            
                            {(event._customerAddress || event._customerCity || event._customerPostalCode) && (
                              <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                {event._customerAddress && `${event._customerAddress}, `}
                                {event._customerPostalCode && `${event._customerPostalCode} `}
                                {event._customerCity}
                              </p>
                            )}
                            
                            {event.amount && (
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                                {event.amount.toLocaleString('pl-PL', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {event.currency || 'PLN'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Otrzymano: {format(new Date(event.occurred_at), 'dd MMM yyyy', { locale: pl })}
                          </span>
                        </div>
                      </div>

                      {/* Inbox reasons */}
                      {event.inbox_reasons && event.inbox_reasons.length > 0 && (
                        <div className="space-y-1.5">
                          {event.inbox_reasons.map((reason, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded px-2 py-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/inbox/invoice/${event._invoiceId}`)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Zobacz fakturę
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                        
                        {event.status === 'captured' && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/inbox/invoice/${event._invoiceId}?section=discussion`)}
                          >
                            Dyskusja
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // For regular events, use the existing InboxEventCard
              return (
                <InboxEventCard
                  key={event.id}
                  event={event}
                  onClassify={handleClassify}
                  onApprove={handleApprove}
                  onCreateDecision={handleCreateDecision}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInboxPage;
