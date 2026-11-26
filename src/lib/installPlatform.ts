export const INSTALL_DISMISS_KEY = "bible-trivia-v1:add-to-home-dismissed";

export const INSTALL_PLATFORMS = [
  "ios-safari",
  "ios-other",
  "android-chrome",
  "samsung",
  "standalone",
  "other",
] as const;

export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

export type InstallSignals = {
  userAgent: string;
  /** iPadOS 13+ sends a Macintosh user agent. Pass navigator.maxTouchPoints. */
  maxTouchPoints?: number;
  /** Legacy iOS flag: navigator.standalone. */
  navigatorStandalone?: boolean;
  /** matchMedia("(display-mode: standalone)").matches */
  displayModeStandalone?: boolean;
};

const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser/i;
const IN_APP_BROWSER =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Twitter|Snapchat|TikTok|musical_ly|LinkedInApp|Pinterest|MicroMessenger|GSA\/|Reddit|Discord|WhatsApp|Telegram/i;

function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

function isIosSafari(userAgent: string): boolean {
  if (IOS_OTHER_BROWSER.test(userAgent) || IN_APP_BROWSER.test(userAgent)) return false;
  return /Safari/i.test(userAgent) && /Version\//i.test(userAgent);
}

function isAndroidChrome(userAgent: string): boolean {
  if (!/Android/i.test(userAgent)) return false;
  if (/SamsungBrowser|EdgA|Edg\/|OPR\/|Opera|Firefox|UCBrowser/i.test(userAgent)) return false;
  if (/\bwv\b/.test(userAgent)) return false;
  return /Chrome\/\d/.test(userAgent);
}

/** Classify this browser for Add to Home Screen. Nothing is stored or sent. */
export function detectInstallPlatform(signals: InstallSignals): InstallPlatform {
  if (signals.displayModeStandalone || signals.navigatorStandalone) return "standalone";
  const userAgent = signals.userAgent;
  const maxTouchPoints = signals.maxTouchPoints ?? 0;
  if (isIos(userAgent, maxTouchPoints)) return isIosSafari(userAgent) ? "ios-safari" : "ios-other";
  if (/SamsungBrowser/i.test(userAgent)) return "samsung";
  if (isAndroidChrome(userAgent)) return "android-chrome";
  return "other";
}

export function readInstallBannerDismissed(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeInstallBannerDismissed(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    // Blocked storage must not break the page.
  }
}
