import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.movieverse.app',
  appName: 'MovieVerse AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    overrideUserAgent: 'MovieVerseTV'
  }
};

export default config;
