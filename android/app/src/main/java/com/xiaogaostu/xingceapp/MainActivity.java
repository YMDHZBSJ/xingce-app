package com.xiaogaostu.xingceapp;

import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 返回键策略：
 * 1) 非首页：优先在应用内回退（网页历史）
 * 2) 首页：第一次提示「再按一次退出」，2 秒内再按才退出
 */
public class MainActivity extends BridgeActivity {

    private long lastBackTime = 0L;
    private static final long EXIT_INTERVAL = 2000L;

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        webView.evaluateJavascript(
            "(function(){try{var p=location.pathname.replace(/\\\\/+$/,'');return p||'/';}catch(e){return '/';}})()",
            value -> {
                String path = value == null ? "/" : value.replace("\"", "");
                boolean atHome = path.isEmpty() || "/".equals(path) || "/index.html".equals(path);

                if (!atHome && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                long now = System.currentTimeMillis();
                if (now - lastBackTime < EXIT_INTERVAL) {
                    finish();
                } else {
                    lastBackTime = now;
                    Toast.makeText(MainActivity.this, "再按一次退出", Toast.LENGTH_SHORT).show();
                }
            }
        );
    }
}
