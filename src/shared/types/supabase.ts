export interface Invoice {
  // ...istniejące pola...
  exchangeRate?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: 'NBP' | 'manual';
  // ...istniejący kod ...
}
