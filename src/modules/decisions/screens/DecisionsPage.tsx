import React from 'react';
import { Shield, Users, Building2, TrendingUp, AlertCircle, Wallet, FileText, Receipt, Landmark } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useNavigate } from 'react-router-dom';
import type { DecisionCategory } from '@/modules/decisions/decisions';
import { DECISION_CATEGORY_LABELS } from '@/modules/decisions/decisions';

interface DecisionGuide {
  category: DecisionCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  documents: string[];
  enables: string[];
  action?: {
    label: string;
    path: string;
  };
}

const decisionGuides: DecisionGuide[] = [
  {
    category: 'cash_management',
    title: 'Zarządzanie kasą',
    subtitle: 'Gotówka, wypłaty i raporty kasowe',
    icon: Wallet,
    documents: [
      'Regulamin kasy i odpowiedzialność materialna',
      'Upoważnienie kasjera',
      'Szablon raportu kasowego'
    ],
    enables: [
      'Odblokowuje moduł „Kasa” i raporty KP/KW',
      'Pozwala księgować wypłaty i wpłaty gotówkowe',
      'Wymagane do kontroli salda gotówki'
    ],
    action: {
      label: 'Przejdź do kasy',
      path: '/accounting/kasa',
    },
  },
  {
    category: 'operational_costs',
    title: 'Koszty operacyjne',
    subtitle: 'Zakupy, faktury kosztowe, wydatki',
    icon: Receipt,
    documents: [
      'Uchwała zarządu z limitem wydatków',
      'Procedura klasyfikacji kosztów',
      'Rejestr decyzji kosztowych'
    ],
    enables: [
      'Pozwala księgować wydatki w skrzynce i księdze',
      'Wymagana do zwrotów wydatków pracowniczych',
      'Kontroluje limit wydatków na osobę/projekt'
    ],
  },
  {
    category: 'b2b_contracts',
    title: 'Umowy B2B',
    subtitle: 'Kontrakty z dostawcami i klientami',
    icon: FileText,
    documents: [
      'Szablon umowy ramowej',
      'Uchwała z zakresem pełnomocnictwa',
      'Rejestr podpisanych kontraktów'
    ],
    enables: [
      'Powiązuje decyzje z modułem Dokumenty/Umowy',
      'Pozwala oznaczać faktury jako wynik kontraktu',
      'Wymagana przy audycie ofert i zakupów'
    ],
  },
  {
    category: 'sales_services',
    title: 'Sprzedaż i przychody',
    subtitle: 'Faktury sprzedażowe i oferty',
    icon: TrendingUp,
    documents: [
      'Polityka rabatowa i cenniki',
      'Uchwała o warunkach sprzedaży',
      'Lista uprawnionych do podpisu'
    ],
    enables: [
      'Umożliwia wystawianie faktur sprzedażowych',
      'Definiuje limity cen i rabatów',
      'Łączy się z modułem Faktury przychodowe'
    ],
  },
  {
    category: 'company_financing',
    title: 'Finansowanie i kapitał',
    subtitle: 'Pożyczki, dopłaty, emisje udziałów',
    icon: Landmark,
    documents: [
      'Uchwała wspólników o finansowaniu',
      'Dokumentacja dopłat/pożyczek',
      'Rejestr kapitałowy'
    ],
    enables: [
      'Warunek dla modułu „Kapitał i udziałowcy”',
      'Pozwala księgować pożyczki wspólników',
      'Niezbędne przy raportowaniu do KRS'
    ],
  },
];

/**
 * Decisions page with authority gate explainer
 * Shows the hierarchy and enforcement model
 */
export const DecisionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-20">
      {/* Header with explainer */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Decyzje
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Authority Gates
            </p>
          </div>
        </div>

        {/* Explainer card */}
        <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-6 bg-blue-50 dark:bg-blue-950/20 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                W spółce z o.o. nic nie dzieje się bez zgody wyższej instancji. 
                Decyzje definiują, kto może co zrobić.
              </p>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Hierarchia:
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">Wspólnicy</span>
                      <span className="text-slate-600 dark:text-slate-400"> → decyzje strategiczne</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">Zarząd</span>
                      <span className="text-slate-600 dark:text-slate-400"> → decyzje operacyjne</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">Operacje</span>
                      <span className="text-slate-600 dark:text-slate-400"> → wykonanie (zdarzenia)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-900/50">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Każda decyzja określa:
                </div>
                <ul className="space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-400">
                  <li>• Co pozwala zrobić (dozwolone działania)</li>
                  <li>• Limity finansowe (np. maksymalna kwota wydatku)</li>
                  <li>• Okres obowiązywania (od kiedy do kiedy)</li>
                  <li>• Co jest zablokowane bez niej</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate('/decisions/create')}>
          <Shield className="h-4 w-4 mr-2" />
          Utwórz decyzję
        </Button>
        <Button variant="outline" onClick={() => navigate('/decisions/templates')}>
          Szablony decyzji
        </Button>
      </div>

      {/* Decision guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decisionGuides.map((guide) => {
          const Icon = guide.icon;
          return (
            <div
              key={guide.category}
              className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 bg-white dark:bg-slate-950/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
                    <Icon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {guide.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {guide.subtitle}
                    </p>
                  </div>
                </div>
                {guide.category === 'cash_management' && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full">
                    Kasa
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Dokumenty wymagane
                </p>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
                  {guide.documents.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Decyzja odblokowuje
                </p>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
                  {guide.enables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              {guide.action && (
                <Button size="sm" variant={guide.category === 'cash_management' ? 'default' : 'outline'} onClick={() => navigate(guide.action!.path)}>
                  {guide.action.label}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Decisions list placeholder */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
        <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Brak aktywnych decyzji
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Utwórz pierwszą decyzję, aby zdefiniować uprawnienia i limity dla operacji w firmie.
        </p>
        <Button onClick={() => navigate('/decisions/create')}>
          Utwórz pierwszą decyzję
        </Button>
      </div>
    </div>
  );
};

export default DecisionsPage;
