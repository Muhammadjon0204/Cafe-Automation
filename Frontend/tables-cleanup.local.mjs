import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5184';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await page.locator('input[name="email"]').count()) > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Редактировать зал' }).click();
await page.waitForTimeout(400);

await page.mouse.click(898, 559);
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Удалить' }).first().click();
await page.waitForTimeout(300);
await page.locator('.modal-card').getByRole('button', { name: 'Удалить' }).click();
await page.waitForTimeout(600);

console.log('done');
await browser.close();
