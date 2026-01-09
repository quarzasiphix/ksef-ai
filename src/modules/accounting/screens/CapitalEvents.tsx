import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, FileText, Wallet, BookOpen, AlertCircle, CheckCircle2, ExternalLink, Download } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import type { CapitalEvent } from '@/modules/accounting/types/capital';
import CapitalEventWizard from '@/modules/accounting/components/CapitalEventWizard';
import { DecisionAuthorityBadge } from '@/modules/decisions/components/DecisionAuthorityBadge';
import { useQuery } from '@tanstack/react-query';
import { getCapitalEvents, generateKPReportForCapitalEvent } from '@/modules/accounting/data/capitalEventsRepository';
import { toast } from 'sonner';

const CapitalEvents = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['capital-events', selectedProfileId],
    queryFn: () => getCapitalEvents(selectedProfileId!),
    enabled: !!selectedProfileId,
  });

  const handleGenerateKPReport = async (eventId: string) => {
    try {
      const report = await generateKPReportForCapitalEvent(eventId);
      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KP-${eventId.substring(0, 8)}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Raport KP wygenerowany');
    } catch (error) {
      console.error('Error generating KP report:', error);
      toast.error('Błąd podczas generowania raportu KP');
    }
  };

  // Keep mock data for reference but commented out
  /*
  const mockEvents: CapitalEvent[] = [
    {
      id: '1',
      business_profile_id: selectedProfileId || '',
      event_type: 'capital_contribution',
      event_date: '2025-01-15',
      amount: 50000,
      currency: 'PLN',
      shareholder_name: 'Jan Kowalski',
      links: {
        decision_id: 'dec-001',
        decision_reference: 'U/2025/003',
        decision_type: 'shareholder_resolution',
        decision_date: '2025-01-10',
        payment_id: 'pay-001',
        payment_type: 'bank_transaction',
        payment_reference: 'MT940 #18421',
        payment_date: '2025-01-15',
        ledger_entry_id: 'ledger-001',
        ledger_posting_date: '2025-01-15',
        ledger_accounts: {
          debit_account: '130',
          credit_account: '801'
        }
      },
      status: 'completed',
      has_decision: true,
      has_payment: true,
      has_ledger_entry: true,
      decision_reference: {
        decision_id: 'dec-001',
        decision_title: 'Zgoda na finansowanie spółki',
        decision_number: 'U/2025/001',
        decision_status: 'active',
        is_valid: true
      },
      description: 'Wniesienie kapitału zakładowego',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-15T14:30:00Z'
    },
    {
      id: '2',
      business_profile_id: selectedProfileId || '',
      event_type: 'capital_contribution',
      event_date: '2025-02-01',
      amount: 25000,
      currency: 'PLN',
      shareholder_name: 'Anna Nowak',
      links: {
        decision_id: 'dec-002',
        decision_reference: 'U/2025/004',
        decision_type: 'shareholder_resolution',
        decision_date: '2025-01-28',
      },
      status: 'pending',
      has_decision: true,
      has_payment: false,
      has_ledger_entry: false,
      decision_reference: {
        decision_id: 'dec-002',
        decision_title: 'Zgoda na finansowanie spółki',
        decision_number: 'U/2025/001',
        decision_status: 'active',
        is_valid: true
      },
      description: 'Wniesienie kapitału - II transzy',
      created_at: '2025-01-28T09:00:00Z',
      updated_at: '2025-01-28T09:00:00Z'
    }
  ];
  */

  const getEventTypeLabel = (type: CapitalEvent['event_type']) => {
    const labels = {
      capital_contribution: 'Wniesienie kapitału',
      capital_withdrawal: 'Wypłata kapitału',
      dividend: 'Dywidenda',
      capital_increase: 'Podwyższenie kapitału',
      supplementary_payment: 'Dopłata (art. 177 KSH)',
      retained_earnings: 'Zyski zatrzymane',
      other: 'Inne'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Historia zdarzeń kapitałowych z powiązaniami do decyzji, płatności i księgi
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj zdarzenie
        </Button>
      </div>

      {/* Events List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Ładowanie zdarzeń kapitałowych...</p>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak zdarzeń kapitałowych</h3>
            <p className="text-muted-foreground mb-4">
              Dodaj pierwsze zdarzenie kapitałowe, aby rozpocząć śledzenie struktury kapitału
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwsze zdarzenie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="border-l-4 border-l-emerald-400">
              <CardContent className="p-6">
                {/* Top Row: Title, Shareholder, Date, Amount */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {getEventTypeLabel(event.event_type)}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {event.shareholder_name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(event.amount)}
                    </div>
                  </div>
                </div>

                {/* Decision Authority */}
                <div className="mb-4 pb-4 border-b">
                  <DecisionAuthorityBadge
                    decisionRef={event.decision_reference}
                    onNavigate={() => {
                      if (event.decision_reference) {
                        navigate(`/decisions/${event.decision_reference.decision_id}`);
                      }
                    }}
                  />
                </div>

                {/* Status Badges Row */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  {/* Decision Status */}
                  <div className="flex items-center gap-2">
                    {event.has_decision ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-medium">Decyzja</span>
                  </div>

                  {/* Payment Status */}
                  <div className="flex items-center gap-2">
                    {event.has_payment ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-medium">Płatność</span>
                  </div>

                  {/* Ledger Status */}
                  <div className="flex items-center gap-2">
                    {event.has_ledger_entry ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-medium">Księga</span>
                  </div>
                </div>

                {/* Triple Links Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* A) Decision Link */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Podstawa prawna</span>
                    </div>
                    {event.has_decision && event.links.decision_reference ? (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          Decyzja: {event.links.decision_reference}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            // Navigate to decision
                            console.log('Open decision:', event.links.decision_id);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Otwórz decyzję
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Brak powiązania
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600">
                          Powiąż decyzję
                        </Button>
                      </>
                    )}
                  </div>

                  {/* B) Payment Link */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span>Ruch pieniężny</span>
                    </div>
                    {event.has_payment && event.links.payment_reference ? (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {event.links.payment_type === 'bank_transaction' ? 'Bank' : 'Kasa'}: {event.links.payment_reference}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (event.links.payment_type === 'cash_document') {
                                navigate(`/accounting/kasa?doc=${event.links.payment_id}`);
                              } else {
                                navigate(`/banking?tx=${event.links.payment_id}`);
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Otwórz
                          </Button>
                          {event.links.payment_type === 'cash_document' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleGenerateKPReport(event.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              KP
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Brak powiązania z płatnością
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600">
                          Powiąż transakcję
                        </Button>
                      </>
                    )}
                  </div>

                  {/* C) Ledger Link */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>Zapis księgowy</span>
                    </div>
                    {event.has_ledger_entry && event.links.ledger_posting_date ? (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          Wpis: {new Date(event.links.ledger_posting_date).toLocaleDateString('pl-PL')}
                        </Badge>
                        {event.links.ledger_accounts && (
                          <div className="text-xs text-muted-foreground">
                            {event.links.ledger_accounts.debit_account} → {event.links.ledger_accounts.credit_account}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            // Navigate to ledger
                            console.log('Open ledger entry:', event.links.ledger_entry_id);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Otwórz w księdze
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Oczekuje zaksięgowania
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600">
                          Zaksięguj
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Capital Event Wizard */}
      <CapitalEventWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        businessProfileId={selectedProfileId || ''}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};

export default CapitalEvents;
