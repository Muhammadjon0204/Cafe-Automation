import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5184';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\a5f0564e-2e93-4d23-a96a-bc00417de92b\\scratchpad';

const browser = await chromium.launch({ headless: true });

const errors = [];

// Desktop: verify wheel-zoom works and editor toggle is enabled.
const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
desktopPage.on('pageerror', (err) => errors.push('PAGEERROR(desktop): ' + err.message));
await desktopPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await desktopPage.locator('input[name="email"]').count()) > 0) {
  await desktopPage.fill('input[name="email"]', 'admin@cafe.local');
  await desktopPage.fill('input[name="password"]', 'Admin123!');
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await desktopPage.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(400);
await desktopPage.mouse.move(700, 400);
await desktopPage.mouse.wheel(0, -300); // zoom in
await desktopPage.waitForTimeout(300);
await desktopPage.screenshot({ path: `${shotDir}/phase4-1-zoomed.png` });

// Narrow viewport (tablet-ish): editor toggle should be replaced with a disabled note,
// and live mode (table click -> side panel) should still work.
const mobilePage = await browser.newPage({ viewport: { width: 700, height: 900 } });
mobilePage.on('pageerror', (err) => errors.push('PAGEERROR(mobile): ' + err.message));
await mobilePage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await mobilePage.locator('input[name="email"]').count()) > 0) {
  await mobilePage.fill('input[name="email"]', 'admin@cafe.local');
  await mobilePage.fill('input[name="password"]', 'Admin123!');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await mobilePage.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(400);
await mobilePage.screenshot({ path: `${shotDir}/phase4-2-narrow-live.png` });
await mobilePage.mouse.click(388, 219);
await mobilePage.waitForTimeout(400);
await mobilePage.screenshot({ path: `${shotDir}/phase4-3-narrow-panel.png` });

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');

await browser.close();
