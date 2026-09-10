import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\c6c9b3ac-05b7-4cd2-afef-4705671b4e3a\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await page.waitForTimeout(500);

// Toggle dark via topbar, then use client-side nav links (no full reload) so theme
// state (which isn't persisted) survives to the next page.
await page.locator('button.icon-btn[aria-label="Toggle theme"]').click();
await page.waitForTimeout(600);

await page.locator('a', { hasText: 'Tables' }).click();
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-tables-dark2.png` });

await page.locator('a', { hasText: 'Orders' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-orders-dark2.png`, fullPage: true });

await page.locator('a', { hasText: 'Staff' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-staff-dark2.png`, fullPage: true });

await browser.close();
