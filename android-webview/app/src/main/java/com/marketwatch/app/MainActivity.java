package com.marketwatch.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://market-watchlist-neon.vercel.app";
    private static final String ALERT_CHANNEL_ID = "market_alerts";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1001;
    private static final int FILE_CHOOSER_REQUEST = 1002;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileUploadCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge dark window
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().getInsetsController().setSystemBarsAppearance(
                0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            );
        }

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.loading_indicator);
        configureWebView();
        createAlertChannel();
        requestNotificationPermission();

        if (!handleAuthCallback(getIntent())) {
            if (savedInstanceState == null) webView.loadUrl(APP_URL);
            else webView.restoreState(savedInstanceState);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.getSettings().setAllowFileAccess(true);
        // Allow mixed content for Supabase storage images
        webView.getSettings().setMixedContentMode(
            android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        );
        webView.getSettings().setUserAgentString(
            webView.getSettings().getUserAgentString() + " MarketWatchAndroid/2.0"
        );

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Bridge for: notifications, haptic vibration
        webView.addJavascriptInterface(new NativeBridge(), "MarketWatchAndroid");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }

            // File chooser for profile picture upload
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                fileUploadCallback = callback;
                Intent intent = params.createIntent();
                // Also accept camera capture
                Intent chooser = Intent.createChooser(intent, "Select Image");
                startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                return true;
            }

            // Web geolocation permission
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            // Web media permission (camera/mic for future use)
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
        });

        webView.setWebViewClient(new SafeWebViewClient());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback == null) return;
            Uri[] results = (resultCode == RESULT_OK && data != null)
                ? new Uri[]{data.getData()}
                : null;
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
    }

    private boolean isInternalUrl(Uri uri) {
        String host = uri.getHost();
        return host != null && (
            host.equals("market-watchlist-neon.vercel.app") ||
            host.endsWith(".vercel.app") ||
            host.equals("zuubkbrroxdvzufrfbes.supabase.co")
        );
    }

    private void openExternal(Uri uri) {
        startActivity(new Intent(Intent.ACTION_VIEW, uri));
    }

    private boolean handleAuthCallback(Intent intent) {
        Uri uri = intent.getData();
        if (uri == null || !"marketwatch".equals(uri.getScheme()) || !"auth".equals(uri.getHost())) {
            return false;
        }
        Uri.Builder callback = Uri.parse(APP_URL + "/auth/callback").buildUpon();
        for (String name : uri.getQueryParameterNames()) {
            for (String value : uri.getQueryParameters(name)) {
                callback.appendQueryParameter(name, value);
            }
        }
        webView.loadUrl(callback.build().toString());
        return true;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthCallback(intent);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    private void createAlertChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                ALERT_CHANNEL_ID,
                "Market alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Price alert notifications from MarketWatch");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 150, 80, 150});
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private class NativeBridge {
        /** Called from JS: MarketWatchAndroid.notify(title, message) */
        @JavascriptInterface
        public void notify(String title, String message) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            android.app.Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new android.app.Notification.Builder(MainActivity.this, ALERT_CHANNEL_ID)
                : new android.app.Notification.Builder(MainActivity.this);
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true);
            getSystemService(NotificationManager.class).notify((int) System.currentTimeMillis(), builder.build());
        }

        /**
         * Called from JS: MarketWatchAndroid.vibrate(pattern)
         * pattern: comma-separated durations e.g. "150,80,150"
         */
        @JavascriptInterface
        public void vibrate(String pattern) {
            try {
                String[] parts = pattern.split(",");
                long[] durations = new long[parts.length];
                for (int i = 0; i < parts.length; i++) {
                    durations[i] = Long.parseLong(parts[i].trim());
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                    if (vm != null) vm.getDefaultVibrator()
                        .vibrate(VibrationEffect.createWaveform(prependZero(durations), -1));
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                    if (v != null) v.vibrate(VibrationEffect.createWaveform(prependZero(durations), -1));
                } else {
                    Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                    if (v != null) v.vibrate(500);
                }
            } catch (Exception ignored) {}
        }

        /** Called from JS: returns "android" so web can adapt UI */
        @JavascriptInterface
        public String getPlatform() {
            return "android";
        }
    }

    /** VibrationEffect.createWaveform needs leading 0 for delay before first vibration */
    private long[] prependZero(long[] durations) {
        long[] out = new long[durations.length + 1];
        out[0] = 0;
        System.arraycopy(durations, 0, out, 1, durations.length);
        return out;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private class SafeWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isInternalUrl(uri)) return false;
            openExternal(uri);
            return true;
        }
    }
}
