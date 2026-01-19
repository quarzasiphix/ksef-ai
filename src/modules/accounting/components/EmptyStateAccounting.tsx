import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { 
  FileText, 
  Receipt, 
  Landmark, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { SetupState, Obligation } from '../domain/setupState';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EmptyStateAccountingProps {
  setupState: SetupState;
  entityType: 'dzialalnosc' | 'sp_zoo' | 'sa';
  onAction: (route: string) => void;
}

export function EmptyStateAccounting({ setupState, entityType, onAction }: EmptyStateAccountingProps) {
  const { stage, missingSetup, recommendedActions, obligationsTimeline } = setupState;

  return (
    <div className="space-y-6 p-6">
      {/* Status Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {entityType === 'dzialalnosc' ? 'Księgowość JDG' : 'Księgowość Spółki'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {stage === 'empty' && 'Skonfiguruj profil firmy, aby rozpocząć księgowość'}
          {stage === 'configured_no_activity' && 'Profil skonfigurowany - dodaj pierwsze dokumenty'}
          {stage === 'activity_unposted' && 'Dokumenty oczekują na zaksięgowanie'}
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle>Status księgowości</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Brak zapisów księgowych</strong> — to normalne dla nowej firmy lub przed pierwszym dokumentem.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Co tworzy zapisy księgowe?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Wystawione faktury sprzedaży</li>
              <li>Zarejestrowane wydatki i koszty</li>
              <li>Importy bankowe (opcjonalnie)</li>
              <li>Ręczne zapisy księgowe (Spółka)</li>
            </ul>
          </div>

          {missingSetup.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-sm font-semibold mb-2">Wymagana konfiguracja:</p>
              <ul className="text-sm space-y-1">
                {missingSetup.includes('MISSING_TAX_TYPE') && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Ustaw formę opodatkowania
                  </li>
                )}
                {missingSetup.includes('MISSING_VAT_STATUS') && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Ustaw status VAT
                  </li>
                )}
                {missingSetup.includes('MISSING_START_DATE') && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Ustaw datę rozpoczęcia działalności
                  </li>
                )}
                {missingSetup.includes('MISSING_RYCZALT_CATEGORIES') && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Dodaj kategorie przychodów (ryczałt)
                  </li>
                )}
                {missingSetup.includes('MISSING_COA') && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    Zasiej plan kont
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Następne kroki</CardTitle>
            <CardDescription>Wybierz akcję, aby rozpocząć księgowość</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendedActions.slice(0, 6).map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto py-4 px-4 justify-start"
                  onClick={() => onAction(action.route)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5">
                      {action.id === 'create_invoice' && <FileText className="h-5 w-5" />}
                      {action.id === 'add_expense' && <Receipt className="h-5 w-5" />}
                      {action.id === 'connect_bank' && <Landmark className="h-5 w-5" />}
                      {action.id.startsWith('set_') && <CheckCircle2 className="h-5 w-5" />}
                      {action.id === 'auto_post' && <Calendar className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Obligations Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Oś czasu obowiązków</CardTitle>
          <CardDescription>
            Obowiązki wynikające z formy prawnej i opodatkowania — niezależnie od aktywności
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ObligationsTimeline obligations={obligationsTimeline} />
        </CardContent>
      </Card>

      {/* Info: Zero declarations */}
      <Card>
        <CardHeader>
          <CardTitle>Czy muszę coś składać bez sprzedaży?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p className="font-medium">Zależy od statusu VAT i formy opodatkowania:</p>
            
            <div className="space-y-2 ml-4">
              <div>
                <p className="font-semibold">VAT czynny:</p>
                <p className="text-muted-foreground">
                  Możliwy obowiązek składania JPK_V7 nawet z zerowymi wartościami (zależy od reżimu).
                </p>
              </div>

              <div>
                <p className="font-semibold">VAT zwolniony (art. 113):</p>
                <p className="text-muted-foreground">
                  Brak obowiązku składania JPK_V7.
                </p>
              </div>

              <div>
                <p className="font-semibold">ZUS (JDG):</p>
                <p className="text-muted-foreground">
                  Składki należne co miesiąc, niezależnie od przychodów.
                </p>
              </div>

              <div>
                <p className="font-semibold">PIT/CIT:</p>
                <p className="text-muted-foreground">
                  Zaliczki tylko przy przychodach. Roczne zeznanie zawsze (może być zerowe).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ObligationsTimeline({ obligations }: { obligations: Obligation[] }) {
  const upcoming = obligations.filter(o => o.applies && o.dueDate);
  const notApplicable = obligations.filter(o => !o.applies);

  return (
    <div className="space-y-4">
      {/* Upcoming obligations */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Nadchodzące terminy</h4>
          {upcoming.map((obligation) => (
            <div
              key={obligation.code}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{obligation.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{obligation.description}</p>
                  </div>
                  {obligation.dueDate && (
                    <Badge variant="outline" className="shrink-0">
                      {format(obligation.dueDate, 'dd MMM yyyy', { locale: pl })}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="capitalize">{obligation.frequency}</span>
                  <span>•</span>
                  <span>{obligation.submissionChannel}</span>
                  {obligation.expectedMode === 'zero_possible' && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Możliwe zerowe</span>
                    </>
                  )}
                  {obligation.expectedMode === 'requires_activity' && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">Wymaga aktywności</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not applicable */}
      {notApplicable.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Nie dotyczy</h4>
          {notApplicable.map((obligation) => (
            <div
              key={obligation.code}
              className="flex items-center gap-2 p-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>{obligation.title}</span>
              <span className="text-xs">— {obligation.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
