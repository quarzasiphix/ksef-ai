import { KsefConfig, KsefEnvironment } from './types';

export const KSEF_CONFIGS: Record<KsefEnvironment, KsefConfig> = {
  test: {
    environment: 'test',
    baseUrl: 'https://api-test.ksef.mf.gov.pl/v2',
    apiUrl: 'https://api-test.ksef.mf.gov.pl/v2',
    systemInfo: 'KsięgaI v1.0',
    namespace: 'http://crd.gov.pl/wzor/2023/06/29/12648/',
    schemaVersion: '1-0E',
  },
  production: {
    environment: 'production',
    baseUrl: 'https://api.ksef.mf.gov.pl/v2',
    apiUrl: 'https://api.ksef.mf.gov.pl/v2',
    systemInfo: 'KsięgaI v1.0',
    namespace: 'http://crd.gov.pl/wzor/2023/06/29/12648/',
    schemaVersion: '1-0E',
  },
};

export const getKsefConfig = (environment: KsefEnvironment): KsefConfig => {
  return KSEF_CONFIGS[environment];
};

export const VAT_RATE_CODES: Record<string, string> = {
  '23': '23',
  '8': '8',
  '5': '5',
  '0': '0',
  'zw': 'zw',
  'np': 'np',
  'oo': 'oo',
};

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
};

export const OFFLINE24_HOURS = 24;
