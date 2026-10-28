package com.xiaogaostu.xingceapp;

import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 返回键策略：
 * 1) 首页（第一层）：清空 WebView 历史 + 第一次提示「再按一次退出」，2 秒内再按退出
 * 2) 其他页面：优先在应用内回退；回退不了同样走退出逻辑
 *
 * 修复：之前停在首页手势返回会退回上一个页面（如「我的」），
 * 原因是 WebView 历史里仍留着首页之前的记录。现在到首页即 clearHistory()。
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
                String path = value == null ? "/" : value.replace("\"", "").trim();
                boolean atHome = path.isEmpty()
                        || "/".equals(path)
                        || "/index.html".equals(path)
                        || "null".equals(path);

                if (atHome) {
                    // 首页是应用第一层：清掉历史，保证从此再按返回只有「退出」一条路
                    if (webView.canGoBack()) {
                        webView.clearHistory();
                    }
                    long now = System.currentTimeMillis();
                    if (now - lastBackTime < EXIT_INTERVAL) {
                        finish();
                    } else {
                        lastBackTime = now;
                        Toast.makeText(MainActivity.this, "再按一次退出", Toast.LENGTH_SHORT).show();
                    }
                    return;
                }

                if (webView.canGoBack()) {
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
