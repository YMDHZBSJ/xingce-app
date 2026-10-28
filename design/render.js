const { chromium } = require('/Users/xiaogaostu/.dsh/skills/ui-design-to-code/node_modules/playwright');
const fs = require('fs'), path = require('path');
const pages = ['home','search','practice','question','exam','stats','knowledge','wrong','me'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const name of pages) {
    await p.goto('file://' + path.resolve(__dirname, `page-${name}.html`));
    await p.waitForTimeout(250);
    await p.screenshot({ path: `out/${name}.png` });
    console.log('rendered', name);
  }
  await b.close();
})();
