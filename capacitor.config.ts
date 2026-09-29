import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rememberme.app",
  appName: "RememberMe",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "RememberMe",
  },
};

export default config;
