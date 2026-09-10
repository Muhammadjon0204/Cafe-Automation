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

await page.locator('a', { hasText: 'Menu' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${shotDir}/cs-menu-light.png`, fullPage: true });

// Open a destructive confirm modal (archive a dish) to check modal-btn-danger.
const archiveBtn = page.locator('.menu-card-buttons button', { hasText: /Архив|Удал/i }).first();
if (await archiveBtn.count() > 0) {
  await archiveBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/cs-menu-confirm-light.png` });
}

await browser.close();
