# 《行测题库》宣传片 · 制作工作区

规格：竖版 1080×1920 / 30fps / MP4（抖音）；方案 B（纯 HTML/CSS 重绘 + 动效）
配音：macOS `say`（Tingting）+ ffmpeg 升调提亮 → 动漫女声风格

## 当前进度
- [x] 分镜脚本（8 镜）
- [x] 8 张关键分镜首帧（`frame-01..08.png`，拼版 `contact-sheet.png`）
- [x] 配音试音 3 版（`voice-test/A|B|C-*.m4a`）
- [ ] 用户确认首帧与音色
- [ ] 15 秒粗剪试节奏
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
