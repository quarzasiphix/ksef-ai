import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function usePremiumRealtime(userId: string | undefined, onStatus: (status: any) => void) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("premium_subscriptions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "premium_subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // payload.new is the new row (for INSERT/UPDATE), payload.old for DELETE
          const row = payload.new;
          if (row && typeof row === 'object' && 'is_active' in row) {
            onStatus({
              premium: row.is_active && (!row.ends_at || new Date(row.ends_at) > new Date()),
              premium_until: row.ends_at ?? null,
              banned: false, // You can add a similar listener for banned_users
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
  }, [userId, onStatus]);
}

export function useHeartbeat({
  onStatus,
}: {
  onStatus?: (status: { premium: boolean; premium_until: string | null; banned: boolean; ban_reason: string | null }) => void;
} = {}) {
  const { user } = useAuth();
  const lastStatus = useRef<any>(null);

  // Realtime listener only
  usePremiumRealtime(user?.id, (status) => {
    if (onStatus && JSON.stringify(status) !== JSON.stringify(lastStatus.current)) {
      onStatus(status);
      lastStatus.current = status;
    }
  });
} 