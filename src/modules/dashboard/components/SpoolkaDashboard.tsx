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
  BarChart3,
  Wallet,
  PieChart,
  Landmark,
  Gavel,
  TrendingDown,
  Plus,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import NextActionPanel from '@/modules/accounting/components/NextActionPanel';
import { BusinessProfile } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';
import { getDecisions } from '@/modules/spolka/data/decisionsRepository';
import EventChainViewer from '@/components/events/EventChainViewer';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Decision } from '@/modules/decisions/decisions';

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

  // Fetch decisions/resolutions
  const { data: decisions = [] } = useQuery<Decision[]>({
    queryKey: ['decisions', profile.id],
    queryFn: async (): Promise<Decision[]> => {
      if (!profile.id) return [];
      return getDecisions(profile.id);
    },
    enabled: !!profile.id,
  });

  const getDecisionDate = (decision: Decision) => {
    const source = decision.valid_from || decision.updated_at || decision.created_at;
    return source ? new Date(source) : new Date();
  };

  const recentDecisions = decisions
    .filter(d => d.status === 'active')
    .sort((a, b) => getDecisionDate(b).getTime() - getDecisionDate(a).getTime())
    .slice(0, 3);

  // Company stability score (comprehensive)
  const stabilityScore = React.useMemo(() => {
    let score = 100;
    
    // Governance (40 points)
    if (!profile.krs_number) score -= 15;
    if (!profile.share_capital) score -= 15;
    if (!profile.court_registry) score -= 5;
    if (!profile.establishment_date) score -= 5;
    
    // Financial health (30 points)
    if (netProfit < 0) score -= 15;
    if (unpaidInvoices > 0) score -= 10;
    if (totalRevenue === 0) score -= 5;
    
    // Compliance (30 points)
    if (!profile.accounting_method) score -= 10;
    if (!profile.cit_rate) score -= 10;
    if (decisions.length === 0) score -= 10;
    
    return Math.max(0, score);
  }, [profile, unpaidInvoices, netProfit, totalRevenue, decisions]);

  const getStabilityColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStabilityBg = (score: number) => {
    if (score >= 85) return 'from-emerald-950/90 via-emerald-900/70 to-slate-950/80';
    if (score >= 70) return 'from-blue-950/90 via-blue-900/70 to-slate-950/80';
    if (score >= 50) return 'from-amber-950/90 via-amber-900/70 to-slate-950/80';
    return 'from-red-950/90 via-red-900/70 to-slate-950/80';
  };

  const getStabilityLabel = (score: number) => {
    if (score >= 85) return 'Doskonała';
    if (score >= 70) return 'Dobra';
    if (score >= 50) return 'Wymaga uwagi';
    return 'Krytyczna';
  };

  return (
    <div className="space-y-5">
      {/* Company Stability Overview */}
      <Card className={cn('border border-white/5 bg-gradient-to-br shadow-2xl', getStabilityBg(stabilityScore))}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl border border-white/10', 
                  stabilityScore >= 85 ? 'bg-emerald-500/80' : stabilityScore >= 70 ? 'bg-blue-500/80' : stabilityScore >= 50 ? 'bg-amber-500/80' : 'bg-red-500/80')}>
                  <Landmark className="h-7 w-7 text-white drop-shadow-lg" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Stabilność Spółki</h2>
                  <p className="text-sm text-white/70">Kompleksowa ocena kondycji</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn('text-5xl font-bold', getStabilityColor(stabilityScore))}>
                {stabilityScore}%
              </div>
              <p className={cn('text-sm font-semibold mt-1', getStabilityColor(stabilityScore))}>
                {getStabilityLabel(stabilityScore)}
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Revenue */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center shadow-inner">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Przychody</span>
              </div>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(totalRevenue)}</p>
            </div>

            {/* Expenses */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Koszty</span>
              </div>
              <p className="text-2xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
            </div>

            {/* Net Profit */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', netProfit >= 0 ? 'bg-blue-500' : 'bg-orange-500')}>
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Zysk netto</span>
              </div>
              <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-blue-300' : 'text-orange-300')}>
                {formatCurrency(netProfit)}
              </p>
            </div>

            {/* Tax */}
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">CIT</span>
              </div>
              <p className="text-xl font-bold text-purple-300">
                {typeof taxEstimate === 'number' ? formatCurrency(taxEstimate) : 'Do obliczenia'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance & Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-white/5 bg-slate-950/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-5 w-5 text-slate-200" />
              <h3 className="font-semibold text-sm text-white">Ład korporacyjny</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span className="text-muted-foreground">KRS</span>
                {profile.krs_number ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-white/80">
                <span className="text-muted-foreground">Kapitał</span>
                {profile.share_capital ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-white/80">
                <span className="text-muted-foreground">Księgowość</span>
                {profile.accounting_method ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/5 bg-blue-950/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-blue-300" />
              <h3 className="font-semibold text-sm text-white">Księgowość</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Metoda</span>
                <span className="font-medium text-xs">
                  {profile.accounting_method === 'ksiegi_rachunkowe' ? 'Pełna' : 'Uproszczona'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Faktury</span>
                <span className="font-medium">{totalInvoices}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Niezapłacone</span>
                <span className={cn('font-medium', unpaidInvoices > 0 ? 'text-amber-600' : 'text-green-600')}>
                  {unpaidInvoices}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/5 bg-purple-950/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-sm text-white">Decyzje</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Aktywne</span>
                <span className="font-medium">{decisions.filter(d => d.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ostatnia</span>
                <span className="font-medium text-xs">
                  {recentDecisions[0] ? format(getDecisionDate(recentDecisions[0]), 'dd MMM', { locale: pl }) : 'Brak'}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="w-full h-7 text-xs mt-1">
                <Link to="/decisions">
                  Zobacz wszystkie <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Decisions & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Decisions */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-4 w-4" />
              Ostatnie uchwały
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDecisions.length > 0 ? (
              <div className="space-y-2">
                {recentDecisions.map((decision) => (
                  <Link
                    key={decision.id}
                    to={`/decisions/${decision.id}`}
                    className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{decision.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(getDecisionDate(decision), 'dd MMMM yyyy', { locale: pl })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>Brak uchwał</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/decisions/new">
                    <Plus className="h-3 w-3 mr-1" />
                    Dodaj uchwałę
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events Timeline */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Ostatnie zdarzenia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 overflow-hidden rounded-lg border">
              <EventChainViewer
                businessProfileId={profile.id}
                limit={5}
                showFilters={false}
              />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-3">
              <Link to="/events">
                Zobacz wszystkie zdarzenia <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/accounting">
          <Card className="hover:shadow-md transition-all cursor-pointer border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Księgowość</h3>
                  <p className="text-xs text-muted-foreground">Plan kont</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/analytics">
          <Card className="hover:shadow-md transition-all cursor-pointer border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Analityka</h3>
                  <p className="text-xs text-muted-foreground">Raporty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/contracts">
          <Card className="hover:shadow-md transition-all cursor-pointer border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Dokumenty</h3>
                  <p className="text-xs text-muted-foreground">Umowy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/employees">
          <Card className="hover:shadow-md transition-all cursor-pointer border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Pracownicy</h3>
                  <p className="text-xs text-muted-foreground">Kadry</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default SpoolkaDashboard;
