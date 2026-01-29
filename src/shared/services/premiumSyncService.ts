import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PremiumToken {
  token: string;
  expiry: number;
  userId: string;
  businessId: string;
  tier: string;
}

interface PremiumVerificationResponse {
  verified: boolean;
  token?: string;
  expiry?: number;
  tier?: string;
  message?: string;
}

type PremiumStatusListener = (status: {
  isActive: boolean;
  tier: string;
  lastVerified: Date;
}) => void;

class PremiumSyncService {
  private subscription: RealtimeChannel | null = null;
  private verificationToken: PremiumToken | null = null;
  private listeners: Set<PremiumStatusListener> = new Set();
  private currentUserId: string | null = null;
  private currentBusinessId: string | null = null;
  private verificationInProgress = false;
  private autoRefreshInterval: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // Configuration
  private readonly TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly TOKEN_REFRESH_THRESHOLD_MS = 1 * 60 * 1000; // Refresh 1 min before expiry
  private readonly RECONNECT_DELAY_MS = 5000;
  private readonly AUTO_VERIFY_INTERVAL_MS = 30 * 1000; // Re-verify every 30 seconds
  
  // Debug flag - set to false to reduce console spam
  private readonly DEBUG = false;

  /**
   * Start real-time subscription monitoring for premium status
   */
  async startRealtimeSync(userId: string, businessId: string): Promise<void> {
    if (this.DEBUG) console.log('[PremiumSync] Starting real-time sync', { userId, businessId });
    
    // Clean up existing subscription
    if (this.subscription) {
      await this.stopRealtimeSync();
    }

    this.currentUserId = userId;
    this.currentBusinessId = businessId;

    // Initial verification
    await this.verifyPremiumAccess();

    // Set up real-time subscription to enhanced_subscriptions table
    this.subscription = supabase
      .channel(`premium:${userId}:${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'enhanced_subscriptions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (this.DEBUG) console.log('[PremiumSync] Subscription change detected', payload);
        this.handleSubscriptionChange(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'enterprise_benefits',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (this.DEBUG) console.log('[PremiumSync] Enterprise benefit change detected', payload);
        this.handleSubscriptionChange(payload);
      })
      .subscribe((status) => {
        if (this.DEBUG) console.log('[PremiumSync] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
          this.startAutoRefresh();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.handleDisconnect();
        }
      });
  }

  /**
   * Stop real-time sync and clean up
   */
  async stopRealtimeSync(): Promise<void> {
    if (this.DEBUG) console.log('[PremiumSync] Stopping real-time sync');
    
    if (this.subscription) {
      await supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }

    this.verificationToken = null;
    this.currentUserId = null;
    this.currentBusinessId = null;
  }

  /**
   * Verify premium access with server and get encrypted token
   */
  async verifyPremiumAccess(): Promise<boolean> {
    if (this.verificationInProgress) {
      if (this.DEBUG) console.log('[PremiumSync] Verification already in progress');
      return false;
    }

    // Check if current token is still valid
    if (this.isTokenValid()) {
      if (this.DEBUG) console.log('[PremiumSync] Token still valid');
      return true;
    }

    if (!this.currentUserId || !this.currentBusinessId) {
      if (this.DEBUG) console.error('[PremiumSync] Missing userId or businessId');
      return false;
    }

    this.verificationInProgress = true;

    try {
      if (this.DEBUG) console.log('[PremiumSync] Verifying premium access with server');
      
      const { data, error } = await supabase.functions.invoke<PremiumVerificationResponse>(
        'verify-premium-access',
        {
          body: {
            businessId: this.currentBusinessId
          }
        }
      );

      if (error) {
        if (this.DEBUG) console.error('[PremiumSync] Verification error:', error);
        this.notifyListeners(false, 'free');
        return false;
      }

      if (!data?.verified || !data.token) {
        if (this.DEBUG) console.log('[PremiumSync] Verification failed:', data?.message);
        this.verificationToken = null;
        this.notifyListeners(false, 'free');
        return false;
      }

      // Store new token
      this.verificationToken = {
        token: data.token,
        expiry: data.expiry || Date.now() + this.TOKEN_EXPIRY_MS,
        userId: this.currentUserId,
        businessId: this.currentBusinessId,
        tier: data.tier || 'free'
      };

      if (this.DEBUG) console.log('[PremiumSync] Verification successful', { tier: data.tier });
      this.notifyListeners(true, data.tier || 'free');
      return true;

    } catch (error) {
      if (this.DEBUG) console.error('[PremiumSync] Verification exception:', error);
      this.notifyListeners(false, 'free');
      return false;
    } finally {
      this.verificationInProgress = false;
    }
  }

  /**
   * Check if current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.verificationToken) return false;
    
    const now = Date.now();
    const timeUntilExpiry = this.verificationToken.expiry - now;
    
    // Token is valid if it hasn't expired and matches current context
    return (
      timeUntilExpiry > 0 &&
      this.verificationToken.userId === this.currentUserId &&
      this.verificationToken.businessId === this.currentBusinessId
    );
  }

  /**
   * Get current verification token
   */
  getToken(): string | null {
    if (!this.isTokenValid()) return null;
    return this.verificationToken?.token || null;
  }

  /**
   * Get current premium tier
   */
  getTier(): string {
    if (!this.isTokenValid()) return 'free';
    return this.verificationToken?.tier || 'free';
  }

  /**
   * Check if user has premium access
   */
  hasPremiumAccess(): boolean {
    return this.isTokenValid() && this.verificationToken?.tier !== 'free';
  }

  /**
   * Handle subscription change from real-time listener
   */
  private async handleSubscriptionChange(payload: any): Promise<void> {
    if (this.DEBUG) console.log('[PremiumSync] Handling subscription change', payload);
    
    // Invalidate current token
    this.verificationToken = null;
    
    // Re-verify with server
    await this.verifyPremiumAccess();
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private async handleDisconnect(): Promise<void> {
    if (this.DEBUG) console.warn('[PremiumSync] Disconnected from real-time subscription');
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.DEBUG) console.error('[PremiumSync] Max reconnect attempts reached');
      this.notifyListeners(false, 'free');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(async () => {
      if (this.currentUserId && this.currentBusinessId) {
        if (this.DEBUG) console.log('[PremiumSync] Attempting reconnect', { attempt: this.reconnectAttempts });
        await this.startRealtimeSync(this.currentUserId, this.currentBusinessId);
      }
    }, this.RECONNECT_DELAY_MS * this.reconnectAttempts);
  }

  /**
   * Start auto-refresh timer to keep token fresh
   */
  private startAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    this.autoRefreshInterval = window.setInterval(async () => {
      if (!this.verificationToken) return;

      const now = Date.now();
      const timeUntilExpiry = this.verificationToken.expiry - now;

      // Refresh token if it's about to expire
      if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD_MS) {
        if (this.DEBUG) console.log('[PremiumSync] Token expiring soon, refreshing');
        await this.verifyPremiumAccess();
      }
    }, this.AUTO_VERIFY_INTERVAL_MS);
  }

  /**
   * Add listener for premium status changes
   */
  addListener(listener: PremiumStatusListener): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    if (this.verificationToken) {
      listener({
        isActive: this.hasPremiumAccess(),
        tier: this.getTier(),
        lastVerified: new Date()
      });
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(isActive: boolean, tier: string): void {
    const status = {
      isActive,
      tier,
      lastVerified: new Date()
    };

    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        if (this.DEBUG) console.error('[PremiumSync] Error notifying listener:', error);
      }
    });
  }

  /**
   * Force immediate verification (useful for testing or manual refresh)
   */
  async forceVerify(): Promise<boolean> {
    this.verificationToken = null;
    return await this.verifyPremiumAccess();
  }

  /**
   * Get current sync status
   */
  getStatus(): {
    isConnected: boolean;
    hasValidToken: boolean;
    tier: string;
    tokenExpiry: Date | null;
  } {
    return {
      isConnected: this.subscription?.state === 'joined',
      hasValidToken: this.isTokenValid(),
      tier: this.getTier(),
      tokenExpiry: this.verificationToken ? new Date(this.verificationToken.expiry) : null
    };
  }
}

// Export singleton instance
export const premiumSyncService = new PremiumSyncService();
