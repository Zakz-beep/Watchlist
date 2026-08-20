# MarketWatch Android WebView

Native Android wrapper for the MarketWatch production website.

## Included

- Opens `https://market-watchlist-neon.vercel.app`
- Keeps MarketWatch and Supabase pages inside the app
- Opens external destinations, including Google OAuth, in the device browser
- Loading indicator and Android back navigation

## Build an APK

1. Install Android Studio with Android SDK Platform 35.
2. Open this `android-webview` folder in Android Studio.
3. Let Android Studio install the Gradle wrapper and Android Gradle Plugin.
4. Select **Build → Build APK(s)**.

The debug APK will be created in `app/build/outputs/apk/debug/`.

## Google login

Google blocks sign-in inside embedded webviews. This wrapper opens Google/external links in the system browser. A fully native sign-in that returns into the app needs an Android deep link and Supabase mobile OAuth callback configured before release.
