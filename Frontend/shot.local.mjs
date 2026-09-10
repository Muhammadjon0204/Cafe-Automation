import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';
const outName = process.argv[2] || 'shot';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\714e93cf-683d-4bf0-a8df-b9545b07ca30\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
const onLogin = await page.locator('input[name="email"]').count();
if (onLogin > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await page.waitForTimeout(1200);

await page.screenshot({ path: `${shotDir}/${outName}.png`, fullPage: true });

console.log('CONSOLE_ERRORS_JSON_START');
console.log(JSON.stringify(consoleErrors, null, 2));
console.log('CONSOLE_ERRORS_JSON_END');

await browser.close();
