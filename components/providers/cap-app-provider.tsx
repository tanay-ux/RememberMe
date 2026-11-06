"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { syncAllReminderNotifications } from "@/lib/notifications/reminders";
import { contactDetailPath, pathFromDeepLink } from "@/lib/routes";

const SHARE_EVENT = "remembermeShare";

/**
 * Handles Capacitor deep links, shared URLs (Android SEND / iOS Share Extension),
 * and reminder notifications.
 */
export function CapAppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    void syncAllReminderNotifications();
  }, []);

  useEffect(() => {
    // Always start pages at the top (autofocus / WebView restore can scroll down)
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("native-app");
    document.documentElement.classList.add(
      `native-${Capacitor.getPlatform()}`,
    );

    let removeUrl: (() => void) | undefined;
    let removeState: (() => void) | undefined;
    let removeNotif: (() => void) | undefined;
    let lastShareKey = "";
    let lastShareAt = 0;

    function navigateShare(rawUrl: string) {
      const path = pathFromDeepLink(rawUrl);
      if (!path) return;
      // Dedupe cold-start getLaunchUrl + appUrlOpen for the same share
      const now = Date.now();
      if (path === lastShareKey && now - lastShareAt < 2500) return;
      lastShareKey = path;
      lastShareAt = now;
      router.push(path);
    }

    function onDomShare(ev: Event) {
      const detail = (ev as CustomEvent<{ url?: string }>).detail;
      if (detail?.url) navigateShare(detail.url);
    }

    window.addEventListener(SHARE_EVENT, onDomShare);

    async function setup() {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      try {
        await StatusBar.setStyle({ style: Style.Light });
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#f7f8fa" });
        }
        await SplashScreen.hide();
      } catch {
        // Web / unsupported — ignore
      }

      const urlSub = await App.addListener("appUrlOpen", ({ url }) => {
        navigateShare(url);
      });
      removeUrl = () => void urlSub.remove();

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        navigateShare(launch.url);
      }

      const stateSub = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void syncAllReminderNotifications();
      });
      removeState = () => void stateSub.remove();

      try {
        const { LocalNotifications } = await import(
          "@capacitor/local-notifications"
        );
        const notifSub = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (event) => {
            const contactId = event.notification.extra?.contactId as
              | string
              | undefined;
            if (contactId) router.push(contactDetailPath(contactId));
          },
        );
        removeNotif = () => void notifSub.remove();
      } catch {
        // Plugin unavailable
      }
    }

    void setup();

    return () => {
      document.documentElement.classList.remove(
        "native-app",
        "native-android",
        "native-ios",
      );
      window.removeEventListener(SHARE_EVENT, onDomShare);
      removeUrl?.();
      removeState?.();
      removeNotif?.();
    };
  }, [router]);

  return <>{children}</>;
}
