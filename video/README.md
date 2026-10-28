# 《行测题库》宣传片 · 制作工作区

规格：竖版 1080×1920 / 30fps / MP4（抖音）；方案 B（纯 HTML/CSS 重绘 + 动效）
配音：macOS `say`（Tingting）+ ffmpeg 升调提亮 → 动漫女声风格

## 配音（IndexTTS-2.5 音色克隆）
- 参考音：`manbo.wav`（用户提供，17s，44.1k）→ 去静音 + 响度归一 → `voice-test/ref-manbo.wav`(22.05k mono)
- 引擎：`~/Documents/gjj/tools/index-tts`（IndexTTS-2.5，10G 模型）
- 音色验证：manbo 中位基频 ≈320Hz，克隆输出 314–320Hz（动漫女声区间）
- 产出：
  - `voice/`（69s 初版）、`voice/60s/`（58s 精简）
  - `voice/fast/`（**加速版**：raw-* 原始、fast-* 1.12 倍速、mid-* 1.05 倍速）
- 整条试听：`voice-test/manbo-fast.m4a`（42s，推荐）/ `manbo-mid.m4a`（45s）/ `manbo-58s.m4a`（58s 原速）
- 提速方案：`silenceremove` 收紧停顿 → `atempo` 变速（不变调）→ 2.8kHz 提亮 + 轻压缩 → 响度归一

### 58s 版时间轴
| 段 | 内容 | 开始 | 时长 |
|---|---|---|---|
| 01 | 行测题库，一个完全离线的行测刷题应用 | 0.00 | 4.11 |
| 02 | 收录 2022–2026 真题，两万两千两百多道，六大模块，解析与图片在本地 | 4.46 | 8.14 |
| 03 | 每天随机十题，也可只做三题；单题计时，交卷出报告 | 12.95 | 7.19 |
| 04 | 长按放大题干、点击放大图片；收藏与错题本 | 20.49 | 8.38 |
| 05 | 标记错因 → 学习分析生成错因画像与建议 | 29.22 | 10.33 |
| 06 | 用时分布与节奏诊断；错题按 5min/1d/3d/7d 复习 | 39.90 | 7.91 |
| 07 | 考点图谱按年份排列；数据存在本机 | 48.16 | 8.34 |
| 08 | 完全离线，无广告，无账号登录 | 56.84 | 3.11 |

## 当前进度
- [x] 分镜脚本（8 镜）
- [x] 8 张关键分镜首帧（`frame-01..08.png`，拼版 `contact-sheet.png`）
- [x] 配音：用 manbo 音色克隆，58s / 69s 两版
- [ ] 用户确认首帧与配音
- [x] 动画与成片：`行测题库-宣传片-竖版.mp4`（24.5s / 1080×1920 / 30fps / H.264+AAC，响度 -14.1 LUFS）
- [x] 分镜动画源码：`promo.html`（`window.renderAt(t)` 确定性时间轴）+ `render-promo.js`（逐帧渲染 735 帧）
- [ ] 15 秒粗剪试节奏（可裁前 15s 另出投流版）
- [ ] 完整 60 秒成片

## 文件
- `storyboard.html` —— 所有分镜的 HTML 源（可改文案后重新导出）
- `frame-0N.png` —— 各镜首帧（1080×1920）
- `contact-sheet.png` —— 8 镜拼版
- `voice-test/` —— 配音试音（A 原声 / B 轻动漫 / C 强动漫）

## 重新导出首帧
```bash
cd /Users/xiaogaostu/Documents/kaogong/xingce-tools/web
node -e "const{chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1128,height:1968}});await p.goto('file:///Users/xiaogaostu/Documents/kaogong/xingce-app/video/storyboard.html');for(let i=1;i<=8;i++)await p.locator('#s'+i).screenshot({path:'/Users/xiaogaostu/Documents/kaogong/xingce-app/video/frame-0'+i+'.png'});await b.close();})()"
```

## 配音生成
```bash
say -v Tingting -r 180 -o /tmp/base.aiff "文案…"
ffmpeg -y -i /tmp/base.aiff -af "asetrate=22050*1.10,aresample=44100,atempo=0.9091,highshelf=f=3200:g=3" out.m4a
```
