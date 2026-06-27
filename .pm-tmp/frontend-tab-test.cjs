const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // capture network
  const apiCalls = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/posts') || url.includes('/api/v1/categories')) {
      apiCalls.push({ url, status: res.status() });
    }
  });

  // console forward
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('  [browser-error]', msg.text());
  });

  console.log('=== 加载页面 /?type=house ===');
  await page.goto('http://localhost:3000/?type=house', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  const getTotal = async () => {
    return await page.evaluate(() => {
      const m = document.body.innerText.match(/共\s*(\d+)\s*条/);
      return m ? parseInt(m[1]) : null;
    });
  };

  const clickTab = async (label) => {
    const ok = await page.evaluate((label) => {
      const btns = [...document.querySelectorAll('button')];
      const tab = btns.find(b => b.textContent.trim() === label);
      if (tab) { tab.click(); return true; }
      return false;
    }, label);
    await new Promise(r => setTimeout(r, 1800));
    return ok;
  };

  console.log(`[1] 默认状态(URL: /?type=house)        → 共 ${await getTotal()} 条`);

  await clickTab('整租');
  console.log(`[2] 点击 整租                          → 共 ${await getTotal()} 条`);

  await clickTab('全部');
  console.log(`[3] 点回 全部                          → 共 ${await getTotal()} 条`);

  await clickTab('合租');
  console.log(`[4] 点击 合租                          → 共 ${await getTotal()} 条`);

  await clickTab('短租/日租');
  console.log(`[5] 点击 短租/日租                     → 共 ${await getTotal()} 条`);

  await clickTab('商铺/写字楼');
  console.log(`[6] 点击 商铺/写字楼                   → 共 ${await getTotal()} 条`);

  await clickTab('房屋出租');
  console.log(`[7] 点击 房屋出租                      → 共 ${await getTotal()} 条`);

  await clickTab('全部');
  console.log(`[8] 点回 全部                          → 共 ${await getTotal()} 条`);

  console.log('\n--- API calls observed ---');
  apiCalls.forEach(c => {
    const u = new URL(c.url);
    const params = [...u.searchParams.entries()].map(([k,v]) => `${k}=${v}`).join('&');
    console.log(`  [${c.status}] /api/v1/${u.pathname.split('/api/v1/')[1]}?${params}`);
  });

  await page.screenshot({ path: 'e:/workspace/yichun-you-shi-er-shuo/.pm-tmp/test-all-final.png', fullPage: false });
  console.log('\nScreenshot saved');

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });