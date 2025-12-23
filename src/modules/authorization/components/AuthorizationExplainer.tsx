import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Shield, FileText, Calendar, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const formatDate = (date: string | Date) => {
  return format(new Date(date), 'dd.MM.yyyy', { locale: pl });
};

interface AuthorizationExplainerProps {
  actionType: string;
  entityId?: string;
  entityType?: string;
  amount?: number;
  currency?: string;
  category?: string;
  className?: string;
}

interface Authorization {
  id: string;
  title: string;
  description?: string;
  type: 'decision' | 'contract' | 'policy' | 'consent';
  ref_id: string;
  ref_type: string;
  status: 'pending' | 'approved' | 'active' | 'expired' | 'revoked';
  scope: {
    action_types?: string[];
    amount_limit?: number;
    currency?: string;
    valid_from?: string;
    valid_to?: string;
    categories?: string[];
    counterparties?: string[];
  };
  required_signatures: number;
  current_signatures: number;
  created_at: string;
}

export const AuthorizationExplainer: React.FC<AuthorizationExplainerProps> = ({
  actionType,
  entityId,
  entityType,
  amount,
  currency,
  category,
  className,
}) => {
  const { data: authorization, isLoading } = useQuery({
    queryKey: ['authorization', actionType, category],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) return null;

      // Find matching authorization
      const { data, error } = await supabase
        .from('authorizations')
        .select('*')
        .eq('business_profile_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] as Authorization | null;
    },
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Sprawdzanie uprawnień...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!authorization) {
    return (
      <Card className={`border-amber-200 bg-amber-50 dark:bg-amber-900/20 ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Brak aktywnej zgody</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Ta operacja wymaga uchwały lub zgody wspólników.
          </p>
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Utwórz uchwałę
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isExpiringSoon = authorization.scope.valid_to 
    ? new Date(authorization.scope.valid_to).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    : false;

  const getStatusBadge = () => {
    switch (authorization.status) {
      case 'active':
        return (
          <Badge className="bg-green-600">
            <Shield className="h-3 w-3 mr-1" />
            Aktywna
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700">
            Oczekuje na podpisy
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            Wygasła
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={`border-blue-200 bg-blue-50 dark:bg-blue-900/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Dlaczego ta operacja jest dozwolona?</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Authorization title */}
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {authorization.type === 'decision' ? 'Uchwała:' : 
             authorization.type === 'contract' ? 'Umowa:' : 
             authorization.type === 'consent' ? 'Zgoda:' : 'Polityka:'}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-200">
            "{authorization.title}"
          </p>
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data zatwierdzenia:
            </p>
            <p className="text-blue-700 dark:text-blue-200">
              {formatDate(authorization.created_at)}
            </p>
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Podpisy:
            </p>
            <Badge 
              variant="outline" 
              className={
                authorization.current_signatures >= authorization.required_signatures
                  ? "text-green-600 border-green-600"
                  : "text-amber-600 border-amber-600"
              }
            >
              {authorization.current_signatures}/{authorization.required_signatures}
            </Badge>
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Status:</p>
          <div className="mt-1">
            {getStatusBadge()}
          </div>
        </div>

        {/* Scope details */}
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800 space-y-1">
          {authorization.scope.amount_limit && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Limit:</strong> {authorization.scope.amount_limit.toLocaleString('pl-PL')} {authorization.scope.currency || 'PLN'}
            </p>
          )}
          
          {authorization.scope.valid_from && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Ważność od:</strong> {formatDate(authorization.scope.valid_from)}
            </p>
          )}
          
          {authorization.scope.valid_to && (
            <p className={`text-xs ${isExpiringSoon ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-blue-700 dark:text-blue-300'}`}>
              <strong>Ważność do:</strong> {formatDate(authorization.scope.valid_to)}
              {isExpiringSoon && ' ⚠️ Wygasa wkrótce'}
            </p>
          )}
          
          {authorization.scope.categories && authorization.scope.categories.length > 0 && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Kategorie:</strong> {authorization.scope.categories.join(', ')}
            </p>
          )}
        </div>

        {/* Warning if amount exceeds limit */}
        {amount && authorization.scope.amount_limit && amount > authorization.scope.amount_limit && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-xs text-red-900 dark:text-red-100 font-medium">
              ⚠️ Kwota przekracza limit uchwały ({authorization.scope.amount_limit.toLocaleString('pl-PL')} {authorization.scope.currency || 'PLN'})
            </p>
          </div>
        )}

        {/* CTA */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(`/decisions/${authorization.ref_id}`, '_blank')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Zobacz pełną uchwałę
        </Button>
      </CardContent>
    </Card>
  );
};
