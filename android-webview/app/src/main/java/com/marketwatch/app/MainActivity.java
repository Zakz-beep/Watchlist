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
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://market-watchlist-neon.vercel.app";
    private static final String ALERT_CHANNEL_ID = "market_alerts";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1001;
    private WebView webView;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
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
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.getSettings().setUserAgentString(
            webView.getSettings().getUserAgentString() + " MarketWatchAndroid/1.1"
        );
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new NativeAlerts(), "MarketWatchAndroid");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }
        });
        webView.setWebViewClient(new SafeWebViewClient());
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
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private class NativeAlerts {
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
