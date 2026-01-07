import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  FileText,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Banknote,
  ArrowRight,
  Activity,
  Scale,
  BookOpen,
  Briefcase,
  Target,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import NextActionPanel from '@/modules/accounting/components/NextActionPanel';
import { BusinessProfile } from '@/shared/types';

interface SpoolkaDashboardProps {
  profile: BusinessProfile;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  taxEstimate: number | string;
  unpaidInvoices: number;
  totalInvoices: number;
  isPremium: boolean;
}

const SpoolkaDashboard: React.FC<SpoolkaDashboardProps> = ({
  profile,
  totalRevenue,
  totalExpenses,
  netProfit,
  taxEstimate,
  unpaidInvoices,
  totalInvoices,
  isPremium,
}) => {
  const missingBasics = !profile.krs_number || !profile.share_capital;
  const hasIssues = missingBasics || unpaidInvoices > 0;

  // Governance health score
  const governanceScore = React.useMemo(() => {
    let score = 100;
    if (!profile.krs_number) score -= 20;
    if (!profile.share_capital) score -= 20;
    if (!profile.court_registry) score -= 10;
    if (!profile.establishment_date) score -= 10;
    if (unpaidInvoices > 0) score -= 15;
    if (!profile.accounting_method) score -= 15;
    if (!profile.cit_rate) score -= 10;
    return Math.max(0, score);
  }, [profile, unpaidInvoices]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Company Health Overview */}
      <Card className={cn('border-2', getHealthBg(governanceScore))}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', 
                  governanceScore >= 80 ? 'bg-green-100' : governanceScore >= 60 ? 'bg-amber-100' : 'bg-red-100')}>
                  <Shield className={cn('h-6 w-6', getHealthColor(governanceScore))} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Status Spółki</h2>
                  <p className="text-sm text-muted-foreground">Ocena zgodności i zarządzania</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn('text-4xl font-bold', getHealthColor(governanceScore))}>
                {governanceScore}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Wskaźnik zdrowia</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Governance */}
            <div className="rounded-lg border-2 p-4 bg-background">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Ład korporacyjny</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">KRS</span>
                  {profile.krs_number ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Kapitał zakładowy</span>
                  {profile.share_capital ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Księgowość</span>
                  {profile.accounting_method ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-3">
                <Link to="/accounting/company-registry">
                  Rejestr spółki <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Financial Health */}
            <div className="rounded-lg border-2 p-4 bg-background">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Finanse</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Przychody</span>
                  <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Koszty</span>
                  <span className="font-medium">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Zysk netto</span>
                  <span className={cn('font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-3">
                <Link to="/analytics">
                  Analityka <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Compliance */}
            <div className="rounded-lg border-2 p-4 bg-background">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Zobowiązania</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Faktury</span>
                  <span className="font-medium">{totalInvoices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Niezapłacone</span>
                  <span className={cn('font-medium', unpaidInvoices > 0 ? 'text-amber-600' : 'text-green-600')}>
                    {unpaidInvoices}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CIT</span>
                  <span className="font-medium text-xs">
                    {typeof taxEstimate === 'number' ? formatCurrency(taxEstimate) : taxEstimate}
                  </span>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-3">
                <Link to="/accounting">
                  Księgowość <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <NextActionPanel
        actions={[
          ...(missingBasics
            ? [
                {
                  id: 'complete-company',
                  title: 'Uzupełnij dane spółki',
                  description: 'KRS i kapitał zakładowy są wymagane do prawidłowego funkcjonowania spółki.',
                  href: '/accounting/company-registry',
                  variant: 'warning' as const,
                  dismissible: true,
                },
              ]
            : []),
          ...(unpaidInvoices > 0
            ? [
                {
                  id: 'unpaid-invoices',
                  title: `${unpaidInvoices} niezapłaconych faktur`,
                  description: 'Zadbaj o płynność finansową - przypomnij kontrahentom lub oznacz płatności.',
                  href: '/income',
                  variant: 'warning' as const,
                  dismissible: true,
                },
              ]
            : []),
          {
            id: 'documents-hub',
            title: 'Zarządzaj dokumentami spółki',
            description: 'Umowy, uchwały i dokumenty korporacyjne w jednym miejscu.',
            href: '/contracts',
            variant: 'info' as const,
            dismissible: true,
          },
          ...(isPremium
            ? [
                {
                  id: 'board-members',
                  title: 'Zarząd i reprezentacja',
                  description: 'Sprawdź uprawnienia członków zarządu i prokurę.',
                  href: '/accounting/company-registry',
                  variant: 'info' as const,
                  dismissible: true,
                },
              ]
            : []),
        ]}
      />

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/contracts">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Dokumenty</h3>
                  <p className="text-xs text-muted-foreground">Umowy i uchwały</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/decisions">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Uchwały</h3>
                  <p className="text-xs text-muted-foreground">Decyzje zarządu</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/company-registry">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Rejestr</h3>
                  <p className="text-xs text-muted-foreground">Dane spółki</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/employees">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-amber-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Pracownicy</h3>
                  <p className="text-xs text-muted-foreground">Zarządzanie kadrami</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Company Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Informacje o spółce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Nazwa</p>
                <p className="font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NIP</p>
                <p className="font-medium">{profile.taxId}</p>
              </div>
              {profile.krs_number && (
                <div>
                  <p className="text-xs text-muted-foreground">KRS</p>
                  <p className="font-medium">{profile.krs_number}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {profile.share_capital && (
                <div>
                  <p className="text-xs text-muted-foreground">Kapitał zakładowy</p>
                  <p className="font-medium">{formatCurrency(profile.share_capital)}</p>
                </div>
              )}
              {profile.accounting_method && (
                <div>
                  <p className="text-xs text-muted-foreground">Metoda księgowa</p>
                  <p className="font-medium">
                    {profile.accounting_method === 'ksiegi_rachunkowe' ? 'Księgi rachunkowe' : 'Uproszczona'}
                  </p>
                </div>
              )}
              {profile.cit_rate && (
                <div>
                  <p className="text-xs text-muted-foreground">Stawka CIT</p>
                  <p className="font-medium">{profile.cit_rate}%</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpoolkaDashboard;
