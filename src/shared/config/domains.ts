export const getParentDomain = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return import.meta.env.DEV ? 'http://localhost:3000' : 'https://ksiegai.pl';
  }
  
  // Client-side: detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    // Development environment
    return 'http://localhost:3000';
  }
  
  // Production environment
  return 'https://ksiegai.pl';
};

export const getAppDomain = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return import.meta.env.DEV ? 'http://localhost:3000' : 'https://app.ksiegai.pl';
  }
  
  // Client-side: detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    // Development environment
    return 'http://localhost:3000';
  }
  
  // Production environment
  return 'https://app.ksiegai.pl';
};
