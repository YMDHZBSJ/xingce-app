package com.xiaogaostu.xingceapp;

import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 返回键策略（由页面内的 BackHandler 决定去哪里）：
 * 1) 调用 window.__xcBack()：返回 true 表示页面已处理（已跳转），App 不退出
 * 2) 返回 false（当前在首页）或不可用 → 第一次提示「再按一次退出」，2 秒内再按则退出
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
            "(function(){try{return (typeof window.__xcBack==='function') ? String(window.__xcBack()) : 'false';}catch(e){return 'false';}})()",
            value -> {
                String v = value == null ? "false" : value.replace("\"", "").trim();
                if ("true".equals(v)) {
                    return; // 页面已处理（返回上一级 / 回首页），不退出
                }
                // 首页：连按两次退出
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
