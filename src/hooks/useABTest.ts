// React hook for A/B testing
// Handles variant assignment and persistence

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/lib/analytics/sessionManager';
import { assignVariant, getStoredVariant, storeVariant } from '@/lib/analytics/variantAssignment';

export interface ABTestConfig {
  testId: string;
  variants: string[];
  weights?: number[];
}

/**
 * Hook to get A/B test variant for current session
 * Automatically assigns and persists variant
 */
export const useABTest = (config: ABTestConfig): string | null => {
  const [variant, setVariant] = useState<string | null>(null);
  const sessionId = getSessionId();

  useEffect(() => {
    const initializeVariant = async () => {
      // Check localStorage first for consistency
      const stored = getStoredVariant(config.testId);
      if (stored && config.variants.includes(stored)) {
        setVariant(stored);
        return;
      }

      // Assign new variant
      const assigned = assignVariant(
        sessionId,
        config.testId,
        config.variants,
        config.weights
      );

      // Store in localStorage
      storeVariant(config.testId, assigned);
      setVariant(assigned);

      // Record assignment in database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('ab_test_assignments').insert({
          session_id: sessionId,
          user_id: user?.id || null,
          test_id: config.testId,
          variant: assigned,
        });
      } catch (error) {
        // Don't throw - assignment should work even if recording fails
        console.error('Failed to record A/B test assignment:', error);
      }
    };

    initializeVariant();
  }, [config.testId, sessionId]);

  return variant;
};
