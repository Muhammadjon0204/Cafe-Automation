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
await page.waitForTimeout(800);
await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(400);

const RENAMED = 'Растительное меню';
const targetRow = page.locator('.crud-list-row', { has: page.locator('.crud-list-name', { hasText: RENAMED }) });
await targetRow.getByRole('button', { name: 'Удалить' }).click();
await page.waitForTimeout(300);
await page.getByRole('dialog', { name: /Удалить категорию/ }).getByRole('button', { name: 'Удалить' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/18-after-delete.png` });

const stillThere = await page.locator('.crud-list-name', { hasText: RENAMED }).count();
console.log('Category gone after delete:', stillThere === 0);

await browser.close();
console.log('done');
