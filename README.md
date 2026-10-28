# 行测题库 · Android

完全离线的公务员行测刷题 App。22,298 道真题（2022–2026）/ 194 套卷 / 106 考点，**无广告、无账号、断网可用**。

作者：xiaogaostu

## 下载

到 [Releases](https://github.com/YMDHZBSJ/xingce-app/releases) 下载最新 APK：

| 版本 | 体积 | 说明 |
|---|---|---|
| `xingce-app-vXX-full.apk` | ~116 MB | 含全部 12,238 张题目配图，推荐 |
| `xingce-app-vXX-lite.apk` | ~69 MB | 不含判断推理配图，便于微信传输 |

安装前建议先卸载旧版。应用为 debug 签名，仅供个人学习使用。

## 功能

**做题**
- 今日练习（独立模块）：随机 10 题，或「只有 3 分钟」的 3 题轻量模式；交卷出报告，完成后显示「再来 10 题」
- 题型专练：按模块 / 题型自选题量，支持左右滑动切题
- 模拟考试：按套卷计时，倒计时剩 1 小时 / 15 分钟 / 5 分钟时变色抖动提醒
- 单题计时 + 与上次用时对比、标记存疑、题号悬浮窗

**看题**
- 长按题干/材料 → 大字阅读层；点击图片 → 全屏，双击放大 2 倍、拖动平移、双指缩放

**复盘**
- 错题本、全局收藏（任意页面可收藏，我的 → 收藏题目）
- 错因标签：概念不清 / 审题失误 / 计算失误 / 时间不够 / 蒙的
- 今日复习：间隔重复，5 分钟 → 1 天 → 3 天 → 7 天，连对 3 次视为掌握
- 学习分析：错因画像（各类错因占比 + 提分建议）、节奏诊断（耗时黑洞 / 秒答陷阱）、做题来源分布
- 考点图谱：真题按年份纵向排列，看同一考点五年命题演变

**其他**
- 成绩海报：本地 canvas 生成，文案可自己编辑，仅显示日期（专练与考试均支持）
- AI 分析（本地规则）：考点分析 / 答题思路 / 易错避坑 / 同类题
- 个人设置：每日目标题数（10/20/30/50）、浅色 / 深色 / 跟随系统
- 每次启动弹出激励短句（同一小时最多一次）

## 技术栈

- **前端**：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS v4，`output: "export"` 静态导出
- **数据层**：`public/local-api.js` 在客户端拦截 `/api/*`，直接读本地 JSON —— 零后端、零网络请求
- **安卓壳**：Capacitor 8（compileSdk 34），WebView 内跑静态站点，资源全部打包进 APK
- **存储**：localStorage（作答记录、错题、收藏、复习队列、设置）
- **工具**：Playwright 端到端回归脚本（`tests/e2e-full.js`）

## 目录结构

```
web/                 Next.js 前端（唯一源码）
  app/               页面：首页 / 今日练习 / 专练 / 模考 / 错题 / 收藏 / 复习 / 分析 / 考点 / 我的 / 设置 / 关于
  app/components/    组件：题目卡、计时、悬浮层、放大查看、确认弹窗、海报等
  app/lib/           逻辑：历史、错题、收藏、复习队列、错因、节奏诊断、设置
  public/data/       题库 JSON（22,298 题 / 考点 / 卷子 / 统计）
  public/local-api.js 本地 API 拦截器
android/             Capacitor 安卓工程（含返回键连按两次退出）
tests/e2e-full.js    端到端回归（15 项）
CHANGELOG.md         版本变更记录
video/               宣传片制作工作区（分镜源码 + 首帧）
```

> **注意**：`web/public/images/`（122 MB 题目配图）不在仓库中。本地构建前需要从题库源仓库
> [ERRRC/xingcezhenti](https://github.com/ERRRC/xingcezhenti) 复制 `90-图片/` 到 `web/public/images/`。

## 本地构建

```bash
cd web
npm install
npx next build            # 产出 web/out

cd ..
npx cap sync android
cd android
./gradlew assembleDebug   # 产出 android/app/build/outputs/apk/debug/app-debug.apk
```

## 数据来源

真题与解析来自 [ERRRC/xingcezhenti](https://github.com/ERRRC/xingcezhenti)（2016–2026 行测真题库），
本应用取其 2022–2026 部分并做结构化处理。题库版权归原整理者，仅用于个人学习。

## 许可

见 [LICENSE](LICENSE)。题库数据版权归原整理者，应用代码版权归作者 xiaogaostu。
