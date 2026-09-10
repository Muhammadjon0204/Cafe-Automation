import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5184';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\a5f0564e-2e93-4d23-a96a-bc00417de92b\\scratchpad';

const browser = await chromium.launch({ headless: true });

// Desktop: multi-step zoom to make the effect obvious.
const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await desktopPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await desktopPage.locator('input[name="email"]').count()) > 0) {
  await desktopPage.fill('input[name="email"]', 'admin@cafe.local');
  await desktopPage.fill('input[name="password"]', 'Admin123!');
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await desktopPage.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(400);
await desktopPage.mouse.move(400, 200); // hover near table "4"
for (let i = 0; i < 15; i++) {
  await desktopPage.mouse.wheel(0, -100);
}
await desktopPage.waitForTimeout(300);
await desktopPage.screenshot({ path: `${shotDir}/phase4-4-zoomed-in.png` });

// Mobile: click table 4, log any console errors and check DOM for the panel.
const mobilePage = await browser.newPage({ viewport: { width: 700, height: 900 } });
const mobileErrors = [];
mobilePage.on('pageerror', (err) => mobileErrors.push('PAGEERROR: ' + err.message));
mobilePage.on('console', (msg) => { if (msg.type() === 'error') mobileErrors.push('CONSOLE: ' + msg.text()); });
await mobilePage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if ((await mobilePage.locator('input[name="email"]').count()) > 0) {
  await mobilePage.fill('input[name="email"]', 'admin@cafe.local');
  await mobilePage.fill('input[name="password"]', 'Admin123!');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}
await mobilePage.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(400);
const canvasBox = await mobilePage.locator('.floor-canvas-container canvas').first().boundingBox();
console.log('canvasBox', canvasBox);
await mobilePage.mouse.click(canvasBox.x + 80, canvasBox.y + 80);
await mobilePage.waitForTimeout(500);
const panelCount = await mobilePage.locator('.table-side-panel').count();
console.log('panelCount after click 1:', panelCount);
await mobilePage.screenshot({ path: `${shotDir}/phase4-5-mobile-after-click.png` });

console.log('MOBILE_ERRORS_JSON_START');
console.log(JSON.stringify(mobileErrors, null, 2));
console.log('MOBILE_ERRORS_JSON_END');

await browser.close();
