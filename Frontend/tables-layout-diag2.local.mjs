import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';

const browser = await chromium.launch({ headless: true });

async function run(height) {
  const page = await browser.newPage({ viewport: { width: 1440, height } });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const onLogin = await page.locator('input[name="email"]').count();
  if (onLogin > 0) {
    await page.fill('input[name="email"]', 'admin@cafe.local');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
  }
  await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const container = document.querySelector('.floor-canvas-container');
    const shellContent = document.querySelector('.app-shell-content');
    const rect = (el) => el ? { w: Math.round(el.getBoundingClientRect().width) } : null;
    return {
      containerW: rect(container)?.w,
      shellContentClientWidth: shellContent?.clientWidth,
      shellContentHasVScroll: shellContent ? shellContent.scrollHeight > shellContent.clientHeight : null,
      bodyHasVScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      windowInnerWidth: window.innerWidth,
      docClientWidth: document.documentElement.clientWidth,
    };
  });
  console.log(`viewport height=${height} ->`, JSON.stringify(data));
  await page.close();
}

await run(900);
await run(760);
await run(650);

await browser.close();
