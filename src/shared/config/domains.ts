export const getParentDomain = (): string => {
  // In development, you might want to use localhost
  // In production, use the actual parent domain
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    // For local development, you can test with localhost or use the production domain
    return 'http://localhost:3000'; // Change this to your Next.js dev server port
  }
  
  return 'https://ksiegai.pl';
};

export const getAppDomain = (): string => {
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    return 'http://localhost:8080';
  }
  
  return 'https://app.ksiegai.pl';
};
