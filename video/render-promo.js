// 逐帧渲染：PROMO 时间轴 → PNG 序列
const { chromium } = require('@playwright/test');
const fs = require('fs');
const FPS = 30;
const DURATION = 24.5;              // 秒
const OUT = __dirname + '/frames';
const HTML = 'file://' + __dirname + '/promo.html';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto(HTML, { waitUntil: 'load' });
  await p.waitForTimeout(400);

  const total = Math.round(FPS * DURATION);
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    await p.evaluate((tt) => window.renderAt(tt), t);
    await p.screenshot({
      path: `${OUT}/f${String(i).padStart(4, '0')}.png`,
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    if (i % 60 === 0) process.stdout.write(`\r${i}/${total}`);
  }
  await b.close();
  console.log(`\n完成 ${total} 帧 → ${OUT}`);
})();
