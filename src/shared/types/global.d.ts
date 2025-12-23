
declare global {
  interface Window {
    triggerCustomersRefresh?: () => Promise<void>;
  }
}

export {};
