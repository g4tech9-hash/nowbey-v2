import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nowbey.app',
  appName: 'NowBey',
  webDir: 'out',
  server: {
    url: 'https://nowbey.vercel.app', // Placeholder: User should verify this URL
    cleartext: true
  }
};

export default config;
