const PRODUCTION_APP_URL = "https://market-watchlist-neon.vercel.app";
const ANDROID_AUTH_REDIRECT_URL = "marketwatch://auth/callback";

function isMarketWatchAndroid(): boolean {
  return typeof navigator !== "undefined" && /MarketWatchAndroid\//i.test(navigator.userAgent);
}

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  if (path === "/auth/callback" && isMarketWatchAndroid()) {
    return ANDROID_AUTH_REDIRECT_URL;
  }

  const browserOrigin = typeof window === "undefined" ? undefined : window.location.origin;
  const baseUrl = browserOrigin || process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_APP_URL;
  return new URL(path, baseUrl).toString();
}
