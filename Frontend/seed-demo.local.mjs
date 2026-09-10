import { chromium } from 'playwright';

const ADMIN = 'http://localhost:5185';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\f946bd66-348b-48ea-83a1-5e77db912c12\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

await page.goto(`${ADMIN}/login`, { waitUntil: 'load' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${ADMIN}/dashboard`, { timeout: 15000 }).catch(() => {});
}
await page.goto(`${ADMIN}/menu`, { waitUntil: 'load' });
await page.waitForTimeout(600);

async function addCategory(name) {
  await page.locator('button:has-text("Категории")').first().click();
  await page.waitForTimeout(250);
  await page.fill('.crud-inline-input', name);
  await page.locator('.crud-inline-row button:has-text("+ Добавить")').click();
  await page.waitForTimeout(300);
  await page.locator('.modal-actions').getByRole('button', { name: 'Закрыть' }).click();
  await page.waitForTimeout(200);
}

async function addDish(name, categoryLabel, price, minutes, type) {
  await page.locator('button:has-text("+ Добавить блюдо")').click();
  await page.waitForTimeout(250);
  await page.selectOption('.crud-form-field select >> nth=0', { label: categoryLabel });
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="price"]', String(price));
  await page.fill('input[name="cookingTimeMinutes"]', String(minutes));
  if (type) await page.selectOption('.crud-form-field select >> nth=1', { label: type });
  await page.click('button:has-text("Создать")');
  await page.waitForTimeout(400);
}

await addCategory('Кофе');
await addCategory('Завтраки');

await addDish('Флэт уайт', 'Кофе', 320, 4, 'Напиток');
await addDish('Капучино', 'Кофе', 290, 4, 'Напиток');
await addDish('Овсяная каша с ягодами', 'Завтраки', 380, 10, 'Еда');
await addDish('Шакшука', 'Завтраки', 450, 15, 'Еда');

await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/final-menu-populated.png`, fullPage: true });

await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/final-category-manager-open.png` });

await browser.close();
console.log('done');
