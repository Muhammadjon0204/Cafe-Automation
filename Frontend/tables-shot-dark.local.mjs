import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5184';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\a5f0564e-2e93-4d23-a96a-bc00417de92b\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'Toggle theme' }).click();
await page.waitForTimeout(900);

await page.screenshot({ path: `${shotDir}/tables-dark.png`, fullPage: true });
await browser.close();
