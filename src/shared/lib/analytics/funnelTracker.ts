// Funnel event tracking for analytics
// Records user interactions for conversion analysis

import { supabase } from '@/integrations/supabase/client';
import { getSessionId, getDeviceType, getBrowser } from './sessionManager';

export interface FunnelEventData {
  eventName: string;
  eventData?: Record<string, any>;
  pagePath: string;
  referrer?: string;
}

/**
 * Track a funnel event
 * Automatically includes session, device, and browser info
 */
export const trackFunnelEvent = async (data: FunnelEventData): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const browser = getBrowser();
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('funnel_events').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      event_name: data.eventName,
      event_data: data.eventData || null,
      page_path: data.pagePath,
      referrer: data.referrer || document.referrer || null,
      device_type: deviceType,
      browser: browser,
    });
  } catch (error) {
    // Don't throw - tracking should never break the app
    console.error('Failed to track funnel event:', error);
  }
};

/**
 * Common funnel events for registration flow
 */
export const FunnelEvents = {
  // Page views
  VIEWED_REGISTER_PAGE: 'viewed_register_page',
  VIEWED_CHECK_EMAIL_PAGE: 'viewed_check_email_page',
  
  // Interactions
  CLICKED_GOOGLE_BUTTON: 'clicked_google_button',
  EXPANDED_EMAIL_FORM: 'expanded_email_form',
  FOCUSED_EMAIL_FIELD: 'focused_email_field',
  CLICKED_CONTINUE_BUTTON: 'clicked_continue_button',
  CLICKED_RESEND_LINK: 'clicked_resend_link',
  EXPANDED_PASSWORD_FORM: 'expanded_password_form',
  
  // Outcomes
  MAGIC_LINK_SENT: 'magic_link_sent',
  MAGIC_LINK_CLICKED: 'magic_link_clicked',
  EMAIL_VERIFIED: 'email_verified',
  REGISTRATION_COMPLETE: 'registration_complete',
  
  // Drop-offs
  ABANDONED_EMAIL_FORM: 'abandoned_email_form',
  ERROR_SENDING_MAGIC_LINK: 'error_sending_magic_link',
  ERROR_GOOGLE_SIGNIN: 'error_google_signin',
} as const;

export type FunnelEventName = typeof FunnelEvents[keyof typeof FunnelEvents];
