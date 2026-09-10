import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5184';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\a5f0564e-2e93-4d23-a96a-bc00417de92b\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

const errors = [];
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
});

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await page.locator('input[name="email"]').count()) > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Click the free table (live mode, no editor toggle needed) to open the side panel.
await page.mouse.click(388, 219);
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/phase3-1-panel-free.png` });

// Create a quick order from the panel.
await page.getByRole('button', { name: 'Создать заказ' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/phase3-2-quick-order-form.png` });
await page.getByRole('button', { name: 'Создать заказ' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${shotDir}/phase3-3-after-create.png` });

// Table should now show Occupied (terracotta) — click it again to see the order summary.
await page.mouse.click(388, 219);
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/phase3-4-panel-occupied.png` });

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');

await browser.close();
