/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TabBar from "./components/TabBar";
import RippleLayer from "./components/RippleLayer";
import BootSplash from "./components/BootSplash";
import PullToRefresh from "./components/PullToRefresh";
import BackBar from "./components/BackBar";
import AutoBoost from "./components/AutoBoost";
import ThemeInit from "./components/ThemeInit";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "行测题库",
  description: "公务员行测真题 · 离线刷题",
  authors: [{ name: "xiaogaostu" }],
  creator: "xiaogaostu",
  publisher: "xiaogaostu",
  applicationName: "行测题库",
  other: {
    author: "xiaogaostu",
    copyright: "© 2026 xiaogaostu. All Rights Reserved.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F4701E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        {/* 离线数据层：拦截 fetch('/api/*')，用本地 JSON 应答 */}
        <script src="/local-api.js" suppressHydrationWarning />
      </head>
      <body>
        <BootSplash />
        <ThemeInit />
        <AutoBoost />
        <RippleLayer />
        <PullToRefresh />
        <div className="shell">
          <Suspense fallback={null}>
            <TabBar />
          </Suspense>
          <main className="px-[18px] pt-2">
            <BackBar />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
