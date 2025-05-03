
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8e56bb01bfce4677a28595b29657211e',
  appName: 'melt-alert-mobile-watch',
  webDir: 'dist',
  server: {
    url: 'https://8e56bb01-bfce-4677-a285-95b29657211e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    Camera: {
      promptBeforeUse: true
    }
  }
};

export default config;
