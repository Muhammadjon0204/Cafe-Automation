import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\c6c9b3ac-05b7-4cd2-afef-4705671b4e3a\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

// Screenshot the login page itself first (unauthenticated state).
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${shotDir}/cs-login-light.png` });

if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.waitForTimeout(800);
await page.screenshot({ path: `${shotDir}/cs-dashboard-light.png`, fullPage: true });

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-tables-light.png` });

await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-orders-light.png`, fullPage: true });

// Toggle to dark mode via the topbar theme button.
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const themeBtn = page.locator('button.icon-btn[aria-label="Toggle theme"]');
await themeBtn.click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${shotDir}/cs-dashboard-dark.png`, fullPage: true });

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-tables-dark.png` });

await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/cs-orders-dark.png`, fullPage: true });

console.log('CONSOLE_ERRORS_JSON_START');
console.log(JSON.stringify(consoleErrors, null, 2));
console.log('CONSOLE_ERRORS_JSON_END');

await browser.close();
