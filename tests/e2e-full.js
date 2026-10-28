const { chromium } = require('@playwright/test');
const B = 'http://127.0.0.1:8331';
const R = []; const ok = (n,c,x='') => R.push({n,c,x});

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, acceptDownloads:true });
  const p = await ctx.newPage();
  // 打开软件会自动弹打气框，测试前先关闭
  const closeBoost = async () => {
    const btn = p.locator('button', { hasText: /继续上岸/ });
    if (await btn.count()) { await btn.first().click().catch(() => {}); await p.waitForTimeout(300); }
  };
  const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,90)));

  // 答错会弹「这道题为什么错？」错因面板，测试时跳过
  const skipReason = async () => {
    const skip = p.locator('button', { hasText: /^跳过$/ }).first();
    if (await skip.count()) { await skip.click().catch(() => {}); await p.waitForTimeout(300); }
  };

  const clickModalConfirm = async () => {
    const btn = p.locator('button', { hasText: /^(确认|确认交卷|确定)$/ }).first();
    if (await btn.count()) { await btn.click(); await p.waitForTimeout(1500); }
  };

  // ① 专练 5 题全流程（含交卷确认弹窗）→ 报告
  await p.goto(B+'/practice/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  await closeBoost();
  await p.locator('button',{hasText:/^5$/}).first().click();
  await p.locator('button',{hasText:/开始练习/}).first().click();
  await p.waitForTimeout(4000);
  for (let i=0;i<6;i++){
    const lab = p.locator('span',{hasText:/^A\.$/}).first();
    if (await lab.count()) { await lab.locator('xpath=..').click(); await p.waitForTimeout(500); }
    await skipReason();
    const rev = p.locator('button',{hasText:/查看答案/}).first();
    if (await rev.count()) { await rev.click(); await p.waitForTimeout(400); }
    const nxt = p.locator('button',{hasText:/下一题|交卷看分析/}).first();
    if (!(await nxt.count())) break;
    const txt = (await nxt.textContent()) || '';
    await nxt.click(); await p.waitForTimeout(800);
    if (/交卷/.test(txt)) { await clickModalConfirm(); await p.waitForTimeout(2000); break; }
  }
  const rep = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('专练→结果报告', /报告|正确率/.test(rep), rep.slice(0,40));
  ok('报告·逐题明细', /第\s*1\s*题|明细|题号/.test(rep));
  ok('报告·用时', /用时/.test(rep));
  ok('报告·同类题/相关', /同类|相关|考点/.test(rep));
  await p.screenshot({path:'/tmp/e2e-report.png'});

  const wrongCount = await p.evaluate(()=>JSON.parse(localStorage.getItem('wrongStats')||'[]').length);
  ok('错题已记录', wrongCount>0, String(wrongCount));

  // ② 错题本：列表 → 重做 → 答对 → 返回
  await p.goto(B+'/wrong/',{waitUntil:'networkidle'}); await p.waitForTimeout(2000);
  const wt = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('错题本·有记录', !/还是空的/.test(wt), wt.slice(0,50));
  // 错题本按模块分组，需先进入分组才能看到单题操作
  const grp = p.locator('button').filter({ hasText: /言语理解|判断推理|资料分析|常识判断|数量关系|政治理论/ }).first();
  if (await grp.count() && !(await p.locator('button',{hasText:/重做这道题/}).count())) {
    await grp.click(); await p.waitForTimeout(1200);
  }
  const redo = p.locator('button',{hasText:/重做这道题/}).first();
  ok('错题本·分组与重做按钮', await redo.count()>0);
  if (await redo.count()){
    await redo.click(); await p.waitForTimeout(2500);
    const dt = (await p.textContent('body')).replace(/\s+/g,' ');
    ok('重做·进入题目', /第\s*\d+|选项|A\./.test(dt));
    const o = p.locator('span',{hasText:/^A\.$/}).first();
    if (await o.count()) { await o.locator('xpath=..').click(); await p.waitForTimeout(1200); }
    const dt2 = (await p.textContent('body')).replace(/\s+/g,' ');
    ok('重做·判分反馈', /正确|错误|解析|继续|下一题/.test(dt2), dt2.slice(0,50));
    await p.screenshot({path:'/tmp/e2e-drill.png'});
  }
  // 移除错题
  const removeBtn = p.locator('button',{hasText:/移出错题本/}).first();
  if (await removeBtn.count()) {
    if (!p.url().includes('/wrong/')) { await p.goto(B+'/wrong/',{waitUntil:'networkidle'}); await p.waitForTimeout(1500); }
    const before = await p.evaluate(()=>JSON.parse(localStorage.getItem('wrongStats')||'[]').length);
    await p.locator('button',{hasText:/移出错题本/}).first().click();
    await p.waitForTimeout(1200);
    const after = await p.evaluate(()=>JSON.parse(localStorage.getItem('wrongStats')||'[]').length);
    ok('错题本·移除生效', after < before, `${before}→${after}`);
  }

  // ③ 考试：开始 → 作答 → 交卷 → 报告 → 返回后出现答题记忆
  await p.goto(B+'/exam/',{waitUntil:'networkidle'}); await p.waitForTimeout(2000);
  await p.locator('button',{hasText:/开始考试/}).first().click();
  await p.waitForTimeout(4000);
  const o1 = p.locator('span',{hasText:/^A\.$/}).first();
  if (await o1.count()) { await o1.locator('xpath=..').click(); await p.waitForTimeout(500); }
  await p.locator('button',{hasText:/^交卷$/}).first().click(); await p.waitForTimeout(800);
  await clickModalConfirm(); await p.waitForTimeout(2500);
  const ert = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('考试→成绩报告', /总正确率|各模块正确率/.test(ert));
  ok('报告·逐题详情', /逐题答案详情|各模块正确率/.test(ert));
  await p.screenshot({path:'/tmp/e2e-exam-report.png'});
  await p.goto(B+'/exam/',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  const mem = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('考试·答题记忆出现', /答题记忆/.test(mem) && /已交卷|进行中/.test(mem), mem.slice(0,60));

  // ⑤ 考点：树 → 详情 → 题目
  await p.goto(B+'/knowledge/',{waitUntil:'networkidle'}); await p.waitForTimeout(2200);
  const kn = p.locator('button').filter({hasText:/资料分析|判断推理|政治理论/}).first();
  if (await kn.count()) { await kn.click(); await p.waitForTimeout(1500); }
  const kn2 = p.locator('button').filter({hasText:/增长|图形|新思想|逻辑/}).first();
  if (await kn2.count()) { await kn2.click(); await p.waitForTimeout(2200); }
  const kt = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('考点·详情与相关', /相关考点|题目|题/.test(kt));
  await p.screenshot({path:'/tmp/e2e-kp.png'});

  // ⑥ 搜索筛选 + 分页
  await p.goto(B+'/search/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  const inp = p.locator('input').first(); await inp.fill('数据'); await inp.press('Enter');
  await p.waitForTimeout(2500);
  const st = (await p.textContent('body')).replace(/\s+/g,' ');
  ok('搜索·结果与分页', /共找到|页/.test(st));

  R.forEach(r=>console.log(`${r.c?'✓':'✗'} ${r.n}${r.x?' · '+r.x:''}`));
  console.log(`\n通过 ${R.filter(r=>r.c).length}/${R.length}`);
  console.log('JS错误:', errs.length, errs.slice(0,4).join(' | '));
  await b.close();
})();
