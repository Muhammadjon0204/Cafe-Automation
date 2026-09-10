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

// Enter editor mode.
await page.getByRole('button', { name: 'Редактировать зал' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/editor-1-entered.png` });

// Arm "add table" and click an empty spot on the canvas.
await page.getByRole('button', { name: '+ Добавить стол' }).click();
const canvasBox = await page.locator('.floor-canvas-container canvas').first().boundingBox();
const clickX = canvasBox.x + 400;
const clickY = canvasBox.y + 300;
await page.mouse.click(clickX, clickY);
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/editor-2-add-form.png` });

// Fill and submit the create form (unique table number so reruns don't collide).
const tableNumber = String(100 + (Date.now() % 800));
await page.fill('input[type="number"] >> nth=0', tableNumber);
await page.getByRole('button', { name: 'Добавить', exact: true }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${shotDir}/editor-3-created.png` });

// Drag the new table (top-left at the click point, 80x80 box -> center offset +40,+40).
const fromX = clickX + 40;
const fromY = clickY + 40;
const toX = fromX + 150;
const toY = fromY + 80;
await page.mouse.move(fromX, fromY);
await page.mouse.down();
await page.mouse.move(toX, toY, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(900); // debounce (500ms) + PATCH round trip
await page.screenshot({ path: `${shotDir}/editor-4-dragged.png` });

// Zone manager: create a zone.
await page.getByRole('button', { name: 'Зоны', exact: true }).click();
await page.waitForTimeout(200);
await page.fill('input[placeholder="Название новой зоны"]', 'Терраса');
await page.getByRole('button', { name: '+ Добавить', exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/editor-5-zone-created.png` });
await page.locator('.modal-card').getByRole('button', { name: 'Закрыть' }).click();

// Exit editor mode.
await page.getByRole('button', { name: 'Готово' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/editor-6-live-again.png` });

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');

await browser.close();
