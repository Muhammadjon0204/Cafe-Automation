import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\c6c9b3ac-05b7-4cd2-afef-4705671b4e3a\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
await page.waitForTimeout(500);

async function stageTransform() {
  return page.evaluate(() => {
    const stage = window.__KONVA_STAGES__ ? window.__KONVA_STAGES__[0] : null;
    return stage ? { x: stage.x(), y: stage.y(), scale: stage.scaleX() } : null;
  });
}

// Konva doesn't expose a global registry by default, so read the stage transform via
// the canvas's own attrs stashed by react-konva isn't trivial from outside — instead
// verify via visual + DOM: drag on an empty area, then screenshot-diff pixel content
// at a fixed point, and separately confirm cursor never becomes "grab"/"grabbing".

const canvas = page.locator('.floor-canvas-container canvas').first();
const box = await canvas.boundingBox();

// Pick an empty background point (top-left corner area, away from any table).
const emptyX = box.x + 30;
const emptyY = box.y + 30;

async function dragAndCheck(label) {
  const cursorBefore = await page.evaluate(() => document.querySelector('.floor-canvas-container')?.style.cursor || getComputedStyle(document.querySelector('.floor-canvas-container canvas')).cursor);
  await page.mouse.move(emptyX, emptyY);
  await page.mouse.down();
  await page.mouse.move(emptyX + 150, emptyY + 100, { steps: 10 });
  const cursorDuring = await page.evaluate(() => getComputedStyle(document.querySelector('.floor-canvas-container canvas')).cursor);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const shot = `${shotDir}/drag-${label}.png`;
  await page.screenshot({ path: shot, clip: { x: box.x, y: box.y, width: Math.min(box.width, 500), height: Math.min(box.height, 400) } });
  console.log(`${label}: cursorBefore=${cursorBefore} cursorDuring=${cursorDuring} screenshot=${shot}`);
}

console.log('=== LIVE MODE: drag empty background ===');
await dragAndCheck('live-bg-before');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
await page.waitForTimeout(500);
await dragAndCheck('live-bg-after-reload');

console.log('=== ENTER EDITOR MODE ===');
const editBtn = page.locator('button.tables-mode-toggle');
if (await editBtn.count() > 0) {
  await editBtn.click();
  await page.waitForTimeout(300);
  console.log('=== EDITOR MODE: drag empty background ===');
  await dragAndCheck('editor-bg');

  console.log('=== EDITOR MODE: drag an actual table ===');
  // Find a table group's approximate screen position by reading the first table's
  // rendered bounding box via a klick target inside canvas — use a known table center
  // from the live screenshot: table "3" was roughly at container-relative (150, 140).
  const tableX = box.x + 145;
  const tableY = box.y + 245;
  const beforeShot = `${shotDir}/drag-editor-table-before.png`;
  await page.screenshot({ path: beforeShot, clip: { x: box.x, y: box.y, width: Math.min(box.width, 500), height: Math.min(box.height, 400) } });
  await page.mouse.move(tableX, tableY);
  await page.mouse.down();
  await page.mouse.move(tableX + 80, tableY + 40, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterShot = `${shotDir}/drag-editor-table-after.png`;
  await page.screenshot({ path: afterShot, clip: { x: box.x, y: box.y, width: Math.min(box.width, 500), height: Math.min(box.height, 400) } });
  console.log(`editor table drag: before=${beforeShot} after=${afterShot}`);
}

console.log('CONSOLE_ERRORS_JSON_START');
console.log(JSON.stringify(consoleErrors, null, 2));
console.log('CONSOLE_ERRORS_JSON_END');

await browser.close();
