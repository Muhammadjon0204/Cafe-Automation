import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Delay the Google Fonts stylesheet response to force a visible fallback-font
// render window before Montserrat swaps in — simulates a slow/cold font fetch.
await page.route('**fonts.googleapis.com/**', async (route) => {
  await new Promise((r) => setTimeout(r, 2500));
  await route.continue();
});

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
const onLogin = await page.locator('input[name="email"]').count();
if (onLogin > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.goto(`${BASE}/tables`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 15000 });

const early = await page.evaluate(() => {
  const wrap = document.querySelector('.tables-canvas-wrap');
  const tabs = document.querySelector('.zone-tabs');
  const r = wrap ? wrap.getBoundingClientRect() : null;
  return {
    wrapY: r ? Math.round(r.y) : null,
    wrapX: r ? Math.round(r.x) : null,
    wrapW: r ? Math.round(r.width) : null,
    tabsHeight: tabs ? Math.round(tabs.getBoundingClientRect().height) : null,
    fontsReady: document.fonts.status,
  };
});
console.log('EARLY (fonts probably not yet swapped):', JSON.stringify(early));

await page.waitForTimeout(3500); // let the delayed font arrive and swap
await page.evaluate(() => document.fonts.ready);

const late = await page.evaluate(() => {
  const wrap = document.querySelector('.tables-canvas-wrap');
  const tabs = document.querySelector('.zone-tabs');
  const r = wrap ? wrap.getBoundingClientRect() : null;
  return {
    wrapY: r ? Math.round(r.y) : null,
    wrapX: r ? Math.round(r.x) : null,
    wrapW: r ? Math.round(r.width) : null,
    tabsHeight: tabs ? Math.round(tabs.getBoundingClientRect().height) : null,
    fontsReady: document.fonts.status,
  };
});
console.log('LATE (settled, font swapped):', JSON.stringify(late));

console.log('DELTA wrapY:', late.wrapY - early.wrapY, 'DELTA tabsHeight:', late.tabsHeight - early.tabsHeight);

await browser.close();
