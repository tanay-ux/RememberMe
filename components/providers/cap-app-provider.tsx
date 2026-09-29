"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { pathFromDeepLink } from "@/lib/routes";

/**
 * Handles Capacitor deep links & shared URLs (Share Extension → rememberme://add?…)
 */
export function CapAppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeUrl: (() => void) | undefined;
    let removeState: (() => void) | undefined;

    async function setup() {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      try {
        await StatusBar.setStyle({ style: Style.Light });
        await SplashScreen.hide();
      } catch {
        // Web / unsupported — ignore
      }

      const urlSub = await App.addListener("appUrlOpen", ({ url }) => {
        const path = pathFromDeepLink(url);
        if (path) router.push(path);
      });
      removeUrl = () => void urlSub.remove();

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        const path = pathFromDeepLink(launch.url);
        if (path) router.push(path);
      }

      const stateSub = await App.addListener("appStateChange", () => {
        // Reserved for future sync / reminder checks
      });
      removeState = () => void stateSub.remove();
    }

    void setup();

    return () => {
      removeUrl?.();
      removeState?.();
    };
  }, [router]);

  return <>{children}</>;
}
