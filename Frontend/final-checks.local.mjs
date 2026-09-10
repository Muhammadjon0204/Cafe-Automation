import { chromium } from 'playwright';

const ADMIN = 'http://localhost:5185';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\f946bd66-348b-48ea-83a1-5e77db912c12\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

await page.goto(`${ADMIN}/login`, { waitUntil: 'load' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${ADMIN}/dashboard`, { timeout: 15000 }).catch(() => {});
}
await page.goto(`${ADMIN}/menu`, { waitUntil: 'load' });
await page.waitForTimeout(600);

await page.fill('.crud-search', 'zzz-no-such-dish');
await page.waitForTimeout(200);
await page.screenshot({ path: `${shotDir}/final-search-empty.png` });
await page.fill('.crud-search', '');

// dark theme
await page.click('[aria-label="Toggle theme"], button:has(svg)');
await page.waitForTimeout(700);
await page.screenshot({ path: `${shotDir}/final-menu-dark.png`, fullPage: true });

await browser.close();
console.log('done');
