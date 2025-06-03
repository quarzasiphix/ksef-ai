import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.ksiegai.app',
  appName: 'KsiegaI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
