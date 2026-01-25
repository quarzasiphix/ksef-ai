import { useEffect, useRef } from "react";
import { useAuth } from "@/shared/context/AuthContext";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { supabase } from "@/integrations/supabase/client";

function usePremiumRealtime(userId: string | undefined, businessId: string | undefined, onStatus: (status: any) => void) {
  useEffect(() => {
    if (!userId || !businessId) return;
    
    // Monitor business_premium_subscriptions table
    const channel = supabase
      .channel("business_premium_subscriptions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_premium_subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // payload.new is the new row (for INSERT/UPDATE), payload.old for DELETE
          const row = payload.new;
          if (row && typeof row === 'object' && 'status' in row) {
            onStatus({
              premium: row.status === 'active' && (!row.current_period_end || new Date(row.current_period_end) > new Date()),
              premium_until: row.current_period_end ?? null,
              banned: false,
              ban_reason: null,
            });
          } else {
            onStatus({ premium: false, premium_until: null, banned: false, ban_reason: null });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, businessId, onStatus]);
}

export function useHeartbeat({
  onStatus,
}: {
  onStatus?: (status: { premium: boolean; premium_until: string | null; banned: boolean; ban_reason: string | null }) => void;
} = {}) {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const lastStatus = useRef<any>(null);

  // Realtime listener only
  usePremiumRealtime(user?.id, selectedProfileId, (status) => {
    if (onStatus && JSON.stringify(status) !== JSON.stringify(lastStatus.current)) {
      onStatus(status);
      lastStatus.current = status;
    }
  });
} 