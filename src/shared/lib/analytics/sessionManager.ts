// Session management for A/B testing and analytics
// Generates and persists session IDs for anonymous tracking

const SESSION_KEY = 'ksiegai_session_id';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  createdAt: number;
  lastActivity: number;
}

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get or create session ID
 * Sessions expire after 30 minutes of inactivity
 */
export const getSessionId = (): string => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    
    if (stored) {
      const session: SessionData = JSON.parse(stored);
      const now = Date.now();
      
      // Check if session is still valid
      if (now - session.lastActivity < SESSION_DURATION) {
        // Update last activity
        session.lastActivity = now;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session.id;
      }
    }
    
    // Create new session
    const newSession: SessionData = {
      id: generateSessionId(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSession.id;
  } catch (error) {
    // Fallback if localStorage is not available
    console.error('Failed to manage session:', error);
    return generateSessionId();
  }
};

/**
 * Clear current session (useful for testing)
 */
export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

/**
 * Get device type based on screen width
 */
export const getDeviceType = (): string => {
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Get browser name
 */
export const getBrowser = (): string => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  
  return 'Other';
};
