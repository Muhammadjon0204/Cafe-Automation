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

// Click table "639" (still Free) to create a reservation on it.
await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
await page.mouse.click(541, 214);
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Создать бронь' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/phase3-5-reservation-form.png` });

// The default reservedAt is 1h from now; guestsCount default 2; just fill the name.
await page.fill('input[name="customerName"]', 'Тестовый гость');
await page.getByRole('button', { name: 'Забронировать' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${shotDir}/phase3-6-after-reservation.png` });

// Click the same table again — should now show Reserved (ochre) with the reservation panel.
await page.mouse.click(541, 214);
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/phase3-7-panel-reserved.png` });

// Seat the guest.
const seatBtn = page.getByRole('button', { name: 'Гость пришёл' });
if (await seatBtn.count()) {
  await seatBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shotDir}/phase3-8-after-seat.png` });
} else {
  errors.push('"Гость пришёл" button not found in the reservation panel.');
}

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');

await browser.close();
