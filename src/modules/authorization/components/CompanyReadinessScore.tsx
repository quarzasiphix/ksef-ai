import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ReadinessScore {
  total: number;
  breakdown: {
    decisions: {
      score: number;
      active: number;
      total: number;
      expiring_soon: number;
    };
    consents: {
      score: number;
      valid: number;
      required: number;
    };
    authorizations: {
      score: number;
      active: number;
      expired: number;
      pending: number;
    };
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    action?: string;
    actionUrl?: string;
  }>;
}

export const CompanyReadinessScore: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();

  const { data: readiness, isLoading } = useQuery({
    queryKey: ['company-readiness'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) throw new Error('No business profile');

      // Get authorizations
      const { data: authorizations } = await supabase
        .from('authorizations')
        .select('*')
        .eq('business_profile_id', profile.id);

      const activeAuths = authorizations?.filter(a => a.status === 'active') || [];
      const expiredAuths = authorizations?.filter(a => a.status === 'expired') || [];
      const pendingAuths = authorizations?.filter(a => a.status === 'pending') || [];

      // Check for expiring soon (within 30 days)
      const expiringSoon = activeAuths.filter(a => {
        if (!a.scope?.valid_to) return false;
        const daysUntilExpiry = (new Date(a.scope.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry < 30;
      });

      // Get decisions
      const { data: decisions } = await supabase
        .from('decisions')
        .select('*')
        .eq('business_profile_id', profile.id);

      const activeDecisions = decisions?.filter(d => d.status === 'active') || [];

      // Calculate scores
      const authScore = authorizations?.length 
        ? (activeAuths.length / authorizations.length) * 100 
        : 0;

      const decisionScore = decisions?.length
        ? (activeDecisions.length / decisions.length) * 100
        : 0;

      const totalScore = Math.round((authScore + decisionScore) / 2);

      // Build issues list
      const issues: ReadinessScore['issues'] = [];

      if (expiredAuths.length > 0) {
        issues.push({
          type: 'error',
          message: `${expiredAuths.length} wygasłych zgód`,
          action: 'Odnów',
          actionUrl: '/decisions',
        });
      }

      if (expiringSoon.length > 0) {
        issues.push({
          type: 'warning',
          message: `${expiringSoon.length} ${expiringSoon.length === 1 ? 'uchwała wygasa' : 'uchwały wygasają'} za ${Math.min(...expiringSoon.map(a => {
            const days = (new Date(a.scope.valid_to!).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return Math.floor(days);
          }))} dni`,
          action: 'Przejrzyj',
          actionUrl: '/decisions',
        });
      }

      if (pendingAuths.length > 0) {
        issues.push({
          type: 'warning',
          message: `${pendingAuths.length} zgód oczekuje na podpisy`,
          action: 'Zobacz',
          actionUrl: '/decisions',
        });
      }

      // Check for missing common authorizations
      const hasKasaAuth = activeAuths.some(a => 
        a.scope?.action_types?.includes('kasa_create') || 
        a.title.toLowerCase().includes('kasa')
      );

      if (!hasKasaAuth) {
        issues.push({
          type: 'error',
          message: 'Brak zgody na operacje kasowe',
          action: 'Dodaj',
          actionUrl: '/decisions/new',
        });
      }

      return {
        total: totalScore,
        breakdown: {
          decisions: {
            score: decisionScore,
            active: activeDecisions.length,
            total: decisions?.length || 0,
            expiring_soon: expiringSoon.length,
          },
          consents: {
            score: authScore,
            valid: activeAuths.length,
            required: authorizations?.length || 0,
          },
          authorizations: {
            score: authScore,
            active: activeAuths.length,
            expired: expiredAuths.length,
            pending: pendingAuths.length,
          },
        },
        issues,
      } as ReadinessScore;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Obliczanie gotowości...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!readiness) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 50) return 'bg-amber-600';
    return 'bg-red-600';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gotowość firmy
          </CardTitle>
          <Badge className={`text-lg px-3 py-1 ${getScoreColor(readiness.total)}`}>
            {readiness.total}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {readiness.total >= 90 ? 'Twoja firma jest w pełni zgodna' :
           readiness.total >= 70 ? 'Twoja firma jest prawie w pełni zgodna' :
           readiness.total >= 50 ? 'Wymaga uwagi' :
           'Wymaga pilnej uwagi'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted rounded">
            <p className="text-2xl font-bold text-green-600">
              {readiness.breakdown.authorizations.active}
            </p>
            <p className="text-xs text-muted-foreground">Aktywne zgody</p>
          </div>
          <div className="p-2 bg-muted rounded">
            <p className="text-2xl font-bold text-amber-600">
              {readiness.breakdown.authorizations.pending}
            </p>
            <p className="text-xs text-muted-foreground">Oczekujące</p>
          </div>
          <div className="p-2 bg-muted rounded">
            <p className="text-2xl font-bold text-red-600">
              {readiness.breakdown.authorizations.expired}
            </p>
            <p className="text-xs text-muted-foreground">Wygasłe</p>
          </div>
        </div>

        {/* Issues list */}
        {readiness.issues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Wymagane działania:</p>
            {readiness.issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm p-2 rounded border"
              >
                {issue.type === 'error' && (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                {issue.type === 'warning' && (
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                )}
                {issue.type === 'info' && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
                <span className="flex-1">{issue.message}</span>
                {issue.action && issue.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-blue-600 hover:text-blue-700"
                    onClick={() => navigate(issue.actionUrl!)}
                  >
                    {issue.action}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-900 dark:text-green-100">
              Wszystko w porządku!
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getScoreColor(readiness.total)}`}
              style={{ width: `${readiness.total}%` }}
            />
          </div>
          <p className={`text-xs text-right ${getScoreTextColor(readiness.total)}`}>
            {100 - readiness.total > 0 
              ? `${100 - readiness.total}% do pełnej zgodności`
              : 'Pełna zgodność osiągnięta!'}
          </p>
        </div>

        {/* CTA */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate('/decisions')}
        >
          <Shield className="h-4 w-4 mr-2" />
          Pokaż szczegóły
        </Button>
      </CardContent>
    </Card>
  );
};
