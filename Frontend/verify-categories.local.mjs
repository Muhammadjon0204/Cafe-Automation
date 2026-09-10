import { chromium } from 'playwright';

const ADMIN = 'http://localhost:5185';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\f946bd66-348b-48ea-83a1-5e77db912c12\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

async function shot(name) {
  await page.screenshot({ path: `${shotDir}/${name}.png` });
}

await page.goto(`${ADMIN}/login`, { waitUntil: 'load' });
if (await page.locator('input[name="email"]').count() > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${ADMIN}/dashboard`, { timeout: 15000 }).catch(() => {});
}

await page.goto(`${ADMIN}/menu`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await shot('01-menu-initial');

// Open the categories manager
await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(300);
await shot('02-category-manager-open');

// Create a new category
const CAT_NAME = 'Веганское меню';
await page.fill('.crud-inline-input', CAT_NAME);
await page.click('.crud-inline-row button:has-text("+ Добавить")');
await page.waitForTimeout(500);
await shot('03-category-created');

// Close the manager, open dish creation
await page.locator('.modal-actions button:has-text("Закрыть")').click();
await page.waitForTimeout(200);
await page.locator('button:has-text("+ Добавить блюдо")').click();
await page.waitForTimeout(300);

// Select the newly created category and fill the dish form
await page.selectOption('.crud-form-field select >> nth=0', { label: CAT_NAME });
await page.fill('input[name="name"]', 'Тофу-боул');
await page.fill('input[name="price"]', '450');
await page.fill('input[name="cookingTimeMinutes"]', '12');
await shot('04-dish-form-filled');
await page.click('button:has-text("Создать")');
await page.waitForTimeout(700);
await shot('05-dish-created');

// Verify grouping shows the new category header with the dish under it
const groupHeaderVisible = await page.locator('.menu-group-title', { hasText: CAT_NAME }).count();
console.log('Group header present:', groupHeaderVisible > 0);

// Reopen category manager: verify count is now 1, delete should be disabled
await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(300);
await shot('06-category-manager-with-count');

const targetRow = page.locator('.crud-list-row', { has: page.locator('.crud-list-name', { hasText: CAT_NAME }) });
const deleteBtn = targetRow.locator('button:has-text("Удалить")');
console.log('Delete disabled while non-empty:', await deleteBtn.isDisabled());

// Rename the category
await targetRow.locator('.crud-list-name').click();
await page.waitForTimeout(200);
const RENAMED = 'Растительное меню';
await targetRow.locator('.crud-inline-input').fill(RENAMED);
await targetRow.locator('button:has-text("Сохранить")').click();
await page.waitForTimeout(500);
await shot('07-category-renamed');

await page.locator('.modal-actions button:has-text("Закрыть")').click();
await page.waitForTimeout(500);
await shot('08-menu-after-rename');

const renamedHeaderVisible = await page.locator('.menu-group-title', { hasText: RENAMED }).count();
console.log('Dish list shows renamed category without editing dish:', renamedHeaderVisible > 0);

// Archive the dish so the category becomes empty again, then delete it
await page.locator('.menu-card', { hasText: 'Тофу-боул' }).locator('button:has-text("Архивировать")').click();
await page.waitForTimeout(200);
await page.locator('.modal-card button:has-text("Архивировать")').last().click();
await page.waitForTimeout(500);

await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(300);
const targetRow2 = page.locator('.crud-list-row', { has: page.locator('.crud-list-name', { hasText: RENAMED }) });
await shot('09-category-manager-after-archive');
console.log('Delete enabled once empty:', !(await targetRow2.locator('button:has-text("Удалить")').isDisabled()));
await targetRow2.locator('button:has-text("Удалить")').click();
await page.waitForTimeout(300);
await shot('10-delete-confirm');
await page.locator('.modal-card button:has-text("Удалить")').last().click();
await page.waitForTimeout(500);
await shot('11-category-deleted');

await browser.close();
console.log('done');
