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
await page.getByRole('button', { name: 'Редактировать зал' }).click();
await page.waitForTimeout(400);

// Select the "713" test table (created by the previous run) by clicking its canvas position.
const canvasBox = await page.locator('.floor-canvas-container canvas').first().boundingBox();
// It was last dragged to roughly click(+400,+300) + drag(+150,+80) relative to canvas origin.
await page.mouse.click(canvasBox.x + 550 + 40, canvasBox.y + 380 + 40);
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/editor-7-selected.png` });

// Edit it: change seats count via the selection bar's "Изменить" button.
const editBtn = page.getByRole('button', { name: 'Изменить' });
if (await editBtn.count()) {
  await editBtn.click();
  await page.waitForTimeout(300);
  await page.fill('input[type="number"] >> nth=1', '6');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir}/editor-8-edited.png` });

  // Re-select and delete.
  await page.mouse.click(canvasBox.x + 550 + 40, canvasBox.y + 380 + 40);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Удалить' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('.modal-card').getByRole('button', { name: 'Удалить' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir}/editor-9-deleted.png` });
} else {
  errors.push('Selection bar did not appear after clicking the table — edit button not found.');
}

// Clean up: delete the "Терраса" test zone via the zone manager.
await page.getByRole('button', { name: 'Зоны', exact: true }).click();
await page.waitForTimeout(300);
const zoneDeleteBtn = page.locator('.zone-manager-row', { hasText: 'Терраса' }).getByRole('button', { name: 'Удалить' });
if (await zoneDeleteBtn.count()) {
  await zoneDeleteBtn.click();
  await page.waitForTimeout(300);
  await page.locator('.modal-overlay').last().getByRole('button', { name: 'Удалить' }).click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: `${shotDir}/editor-10-zone-deleted.png` });

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');

await browser.close();
