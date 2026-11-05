import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.elibraryai.app',
  appName: 'E-Library AI by shio del rio',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, loggingBehavior: 'none' },
  plugins: { StatusBar: { style: 'LIGHT', backgroundColor: '#f7f8fa' } },
}
export default config
