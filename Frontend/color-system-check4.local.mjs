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

await page.locator('a', { hasText: 'Staff' }).click();
await page.waitForTimeout(500);
const fireBtn = page.locator('.staff-row-actions button', { hasText: 'Уволить' }).first();
await fireBtn.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/cs-confirm-danger-light.png` });

await browser.close();
