const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.setViewport({ width: 1280, height: 800 });

  const errs = [];
  page.on('pageerror', (e) => errs.push(`PAGE-ERR: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(`CONSOLE-ERR: ${m.text().slice(0, 100)}`);
  });

  console.log('=== 1. Homepage (Hero + Modules) ===');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '.pm-tmp/v2-home.png' });
  console.log('Screenshot: .pm-tmp/v2-home.png');

  console.log('\n=== 2. /?type=house (List + Tabs + Select) ===');
  await page.goto('http://localhost:3000/?type=house', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const total = await page.evaluate(() => {
    const m = document.body.innerText.match(/共\s*(\d+)\s*条/);
    return m ? m[1] : 'NOT FOUND';
  });
  console.log(`Posts count: ${total}`);
  await page.screenshot({ path: '.pm-tmp/v2-list.png' });

  // 点击 整租 tab
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[role="tab"]')];
    const tab = btns.find(b => b.textContent.includes('整租'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const total2 = await page.evaluate(() => {
    const m = document.body.innerText.match(/共\s*(\d+)\s*条/);
    return m ? m[1] : '0';
  });
  console.log(`After clicking 整租: ${total2}`);
  await page.screenshot({ path: '.pm-tmp/v2-tab.png' });

  console.log('\n=== 3. /login (Toast + Checkbox) ===');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '.pm-tmp/v2-login.png' });

  // 输入手机号 + 点击获取验证码 (触发 Toast)
  await page.type('#phone', '13900008888');
  await new Promise(r => setTimeout(r, 500));
  // 触发 Toast 路径: 同意协议 + 登录按钮 → 验证不通过 → warning toast
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('登录'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '.pm-tmp/v2-toast.png' });

  console.log('\n=== 4. /me (Avatar + Hero) ===');
  await page.goto('http://localhost:3000/me', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Status:', page.url());
  await page.screenshot({ path: '.pm-tmp/v2-me.png' });

  console.log('\n=== 5. Mobile viewport ===');
  await page.setViewport({ width: 375, height: 700 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '.pm-tmp/v2-mobile-home.png' });
  await page.goto('http://localhost:3000/?type=house', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '.pm-tmp/v2-mobile-list.png' });

  console.log('\n=== 6. /?type=house Mobile (汉堡菜单) ===');
  // 点击汉堡菜单
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="菜单"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: '.pm-tmp/v2-mobile-drawer.png' });

  console.log('\n=== Errors ===');
  if (errs.length === 0) console.log('✓ NO ERRORS');
  else errs.slice(0, 5).forEach(e => console.log('  ' + e));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
