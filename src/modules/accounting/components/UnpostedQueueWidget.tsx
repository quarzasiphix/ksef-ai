import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { AlertCircle, FileText } from 'lucide-react';
import { AutoPostingButton } from './AutoPostingButton';
import { supabase } from '@/integrations/supabase/client';

interface UnpostedQueueWidgetProps {
  businessProfileId: string;
}

export function UnpostedQueueWidget({ businessProfileId }: UnpostedQueueWidgetProps) {
  const [unpostedCount, setUnpostedCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts();
  }, [businessProfileId]);

  const loadCounts = async () => {
    setLoading(true);
    try {
      // Count unposted invoices
      const { count: unposted, error: unpostedError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', businessProfileId)
        .eq('accounting_status', 'unposted')
        .in('acceptance_status', ['accepted', 'auto_accepted']);

      if (unpostedError) throw unpostedError;

      // Count needs review
      const { count: needsReview, error: reviewError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', businessProfileId)
        .eq('accounting_status', 'needs_review');

      if (reviewError) throw reviewError;

      setUnpostedCount(unposted || 0);
      setNeedsReviewCount(needsReview || 0);
    } catch (error) {
      console.error('Error loading counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = unpostedCount + needsReviewCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Niezaksięgowane dokumenty
        </CardTitle>
        <CardDescription>
          Dokumenty oczekujące na księgowanie
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{totalPending}</p>
              <p className="text-sm text-muted-foreground">
                {unpostedCount} gotowych do księgowania
              </p>
              {needsReviewCount > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {needsReviewCount} wymaga przeglądu
                </p>
              )}
            </div>
            {unpostedCount > 0 && (
              <AutoPostingButton
                mode="batch"
                businessProfileId={businessProfileId}
                onPosted={loadCounts}
              />
            )}
          </div>

          {needsReviewCount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm">
              <p className="text-amber-900 dark:text-amber-100">
                Niektóre dokumenty wymagają ręcznego przeglądu, ponieważ nie znaleziono pasującej reguły księgowania.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
