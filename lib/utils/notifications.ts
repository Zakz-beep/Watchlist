// lib/utils/notifications.ts

/**
 * Play a synthesized chime using the Web Audio API.
 * Ponytail style: zero audio file dependencies, instant, works on both mobile & desktop.
 */
export function playAlertChime(type: "success" | "warning" | "danger" = "warning") {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Ascending major chime (587Hz D5 -> 880Hz A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === "danger") {
      // Double beep alarm
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Standard bell chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, now); // G5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (err) {
    console.warn("[playAlertChime] Web Audio playback failed:", err);
  }
}

/**
 * Trigger native vibration on mobile devices (Android / iOS PWA)
 */
export function triggerHaptic(pattern: number[] = [150, 80, 150]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
}

/**
 * Request permission for HTML5 Web Notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("[requestNotificationPermission] Failed:", err);
    return Notification.permission;
  }
}

/**
 * Dispatch a native browser notification (Desktop & Mobile)
 */
export function sendBrowserNotification(title: string, options: {
  body: string;
  icon?: string;
  tag?: string;
  playSound?: boolean;
  vibrate?: boolean;
}) {
  if (typeof window === "undefined") return false;

  // 1. Play chime & vibration if requested
  if (options.playSound !== false) {
    playAlertChime("warning");
  }
  if (options.vibrate !== false) {
    triggerHaptic();
  }

  // 2. Native Android Webview Bridge support
  const nativeBridge = (window as unknown as { MarketWatchAndroid?: { notify: (title: string, msg: string) => void } }).MarketWatchAndroid;
  if (nativeBridge && typeof nativeBridge.notify === "function") {
    nativeBridge.notify(title, options.body);
    return true;
  }

  // 3. HTML5 Web Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: options.body,
        icon: options.icon || "/icon.png",
        tag: options.tag || `mw-alert-${Date.now()}`,
      });
      return true;
    } catch (err) {
      console.warn("[sendBrowserNotification] Notification constructor error:", err);
    }
  }

  return false;
}
