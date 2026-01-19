import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Calendar, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';

interface TaxObligationsTimelineProps {
  businessProfileId: string;
  entityType: 'jdg' | 'spolka';
  isVatExempt?: boolean;
  taxType?: string;
}

export function TaxObligationsTimeline({ 
  businessProfileId, 
  entityType, 
  isVatExempt,
  taxType 
}: TaxObligationsTimelineProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Define obligations based on entity type
  const obligations = entityType === 'jdg' ? [
    {
      name: 'ZUS',
      frequency: 'Miesięcznie',
      deadline: '10. dzień następnego miesiąca',
      description: 'Składki ZUS za poprzedni miesiąc',
      status: 'pending',
      filedVia: 'PUE ZUS (platforma.zus.pl)'
    },
    ...(taxType === 'ryczalt' ? [{
      name: 'PIT-28',
      frequency: 'Kwartalnie',
      deadline: '20. dzień miesiąca po kwartale',
      description: 'Zaliczka na podatek ryczałt',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }] : []),
    ...(taxType === 'liniowy' ? [{
      name: 'PIT-36L',
      frequency: 'Miesięcznie',
      deadline: '20. dzień następnego miesiąca',
      description: 'Zaliczka na podatek liniowy 19%',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }] : []),
    ...(taxType === 'skala' ? [{
      name: 'PIT-36',
      frequency: 'Miesięcznie',
      deadline: '20. dzień następnego miesiąca',
      description: 'Zaliczka na podatek wg skali',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }] : []),
    ...(!isVatExempt ? [{
      name: 'JPK_V7M',
      frequency: 'Miesięcznie',
      deadline: '25. dzień następnego miesiąca',
      description: 'Deklaracja VAT',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }] : []),
    {
      name: 'Roczne zeznanie PIT',
      frequency: 'Rocznie',
      deadline: '30 kwietnia',
      description: 'Roczne rozliczenie podatkowe',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }
  ] : [
    {
      name: 'CIT-8',
      frequency: 'Miesięcznie',
      deadline: '20. dzień następnego miesiąca',
      description: 'Zaliczka na podatek CIT',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    },
    {
      name: 'JPK_V7M',
      frequency: 'Miesięcznie',
      deadline: '25. dzień następnego miesiąca',
      description: 'Deklaracja VAT',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    },
    {
      name: 'Sprawozdanie finansowe',
      frequency: 'Rocznie',
      deadline: '3 miesiące po zakończeniu roku',
      description: 'Bilans, RZiS, informacja dodatkowa',
      status: 'pending',
      filedVia: 'KRS (ekrs.ms.gov.pl)'
    },
    {
      name: 'CIT-8 roczne',
      frequency: 'Rocznie',
      deadline: '3 miesiące po zakończeniu roku',
      description: 'Roczne zeznanie CIT',
      status: 'pending',
      filedVia: 'e-Urząd Skarbowy'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Obowiązki podatkowe
          </CardTitle>
          <CardDescription>
            Terminy składania deklaracji i płatności
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {obligations.map((obligation, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{obligation.name}</h4>
                    <Badge variant="outline">{obligation.frequency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{obligation.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Termin: {obligation.deadline}
                    </span>
                    <span className="text-muted-foreground">
                      Składane przez: {obligation.filedVia}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info about e-Urząd Skarbowy */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>e-Urząd Skarbowy:</strong> Wszystkie deklaracje PIT i CIT składasz przez portal{' '}
          <a 
            href="https://www.podatki.gov.pl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            podatki.gov.pl
          </a>
          {' '}(wymaga profilu zaufanego lub e-dowodu).
        </AlertDescription>
      </Alert>

      {isVatExempt && entityType === 'jdg' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Jesteś zwolniony z VAT (art. 113). Nie musisz składać deklaracji JPK_V7M.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
