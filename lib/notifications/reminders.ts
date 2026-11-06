import { Capacitor } from "@capacitor/core";
import { db } from "@/lib/db";
import { contactDetailPath } from "@/lib/routes";

const WEB_SHOWN_KEY = "rememberme_reminder_shown_v1";
/** Once an overdue reminder has fired, don't fire again until this calendar day ends. */
const FIRED_DAY_KEY = "rememberme_reminder_fired_day_v1";
const webTimeouts = new Map<string, number>();

function notificationIdForContact(contactId: string): number {
  let hash = 0;
  for (let i = 0; i < contactId.length; i++) {
    hash = (Math.imul(31, hash) + contactId.charCodeAt(i)) | 0;
  }
  const id = Math.abs(hash);
  return id === 0 ? 1 : id;
}

function calendarDayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function shownMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(WEB_SHOWN_KEY) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function markShown(contactId: string, at: number) {
  const map = shownMap();
  map[contactId] = at;
  localStorage.setItem(WEB_SHOWN_KEY, JSON.stringify(map));
}

function firedDayMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_DAY_KEY) || "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function alreadyFiredToday(contactId: string): boolean {
  return firedDayMap()[contactId] === calendarDayKey();
}

function markFiredToday(contactId: string) {
  const map = firedDayMap();
  map[contactId] = calendarDayKey();
  localStorage.setItem(FIRED_DAY_KEY, JSON.stringify(map));
}

async function ensureWebPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function ensureNativePermission(): Promise<boolean> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let status = await LocalNotifications.checkPermissions();
  if (status.display !== "granted") {
    status = await LocalNotifications.requestPermissions();
  }
  return status.display === "granted";
}

function showWebNotification(
  contactId: string,
  name: string,
  body?: string,
  reminderAt?: number,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const n = new Notification(`Reach out to ${name}`, {
    body: body || "Follow-up reminder from RememberMe",
    tag: `reminder-${contactId}`,
  });
  n.onclick = () => {
    window.focus();
    window.location.href = contactDetailPath(contactId);
    n.close();
  };
  if (reminderAt) markShown(contactId, reminderAt);
  markFiredToday(contactId);
}

export async function cancelContactReminder(contactId: string): Promise<void> {
  const timeout = webTimeouts.get(contactId);
  if (timeout) {
    window.clearTimeout(timeout);
    webTimeouts.delete(contactId);
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import(
        "@capacitor/local-notifications"
      );
      await LocalNotifications.cancel({
        notifications: [{ id: notificationIdForContact(contactId) }],
      });
    } catch {
      // ignore
    }
  }
}

export async function scheduleContactReminder(options: {
  contactId: string;
  name: string;
  reminderAt?: number | null;
  reminderNote?: string;
}): Promise<void> {
  const { contactId, name, reminderAt, reminderNote } = options;
  await cancelContactReminder(contactId);

  if (!reminderAt || reminderAt <= 0) return;

  const title = `Reach out to ${name}`;
  const body = reminderNote?.trim() || "Follow-up reminder from RememberMe";
  const isOverdue = reminderAt <= Date.now();

  // Overdue reminders: at most once per calendar day (app resume was re-arming them)
  if (isOverdue && alreadyFiredToday(contactId)) {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const ok = await ensureNativePermission();
      if (!ok) return;
      const { LocalNotifications } = await import(
        "@capacitor/local-notifications"
      );
      // Future: fire at reminder time. Overdue: fire shortly once, then lock for today.
      const at = isOverdue
        ? new Date(Date.now() + 2500)
        : new Date(Math.max(reminderAt, Date.now() + 1500));
      if (isOverdue) markFiredToday(contactId);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationIdForContact(contactId),
            title,
            body,
            schedule: { at, allowWhileIdle: true },
            extra: { contactId },
          },
        ],
      });
    } catch {
      // ignore scheduling failures
    }
    return;
  }

  const ok = await ensureWebPermission();
  if (!ok) return;

  const delay = reminderAt - Date.now();
  if (delay <= 0) {
    if (alreadyFiredToday(contactId)) return;
    const shown = shownMap()[contactId];
    if (shown === reminderAt) {
      markFiredToday(contactId);
      return;
    }
    showWebNotification(contactId, name, body, reminderAt);
    return;
  }

  // Session-scoped schedule (re-armed on each app open)
  if (delay > 7 * 24 * 60 * 60 * 1000) return;
  const handle = window.setTimeout(() => {
    showWebNotification(contactId, name, body, reminderAt);
    webTimeouts.delete(contactId);
  }, delay);
  webTimeouts.set(contactId, handle);
}

export async function syncAllReminderNotifications(): Promise<void> {
  if (typeof window === "undefined") return;

  if (Capacitor.isNativePlatform()) {
    await ensureNativePermission();
  } else {
    await ensureWebPermission();
  }

  const contacts = await db.contacts.toArray();
  for (const contact of contacts) {
    if (!contact.reminder_at) {
      await cancelContactReminder(contact.id);
      continue;
    }
    await scheduleContactReminder({
      contactId: contact.id,
      name: contact.name,
      reminderAt: contact.reminder_at,
      reminderNote: contact.reminder_note,
    });
  }
}
