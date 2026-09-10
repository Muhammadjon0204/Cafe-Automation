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

await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(400);
await shot('12-manager-count-fixed');

const CAT_NAME = 'Веганское меню';
const targetRow = page.locator('.crud-list-row', { has: page.locator('.crud-list-name', { hasText: CAT_NAME }) });
const countText = await targetRow.locator('.crud-list-count').innerText();
const deleteBtn = targetRow.getByRole('button', { name: 'Удалить' });
console.log('Count label:', countText);
console.log('Delete disabled while non-empty (after fix):', await deleteBtn.isDisabled());
console.log('Delete title tooltip:', await deleteBtn.getAttribute('title'));

// Rename — the row's .crud-list-name button is replaced by the edit <form> once
// editing starts, so re-locate the input fresh instead of reusing targetRow.
await targetRow.locator('.crud-list-name').click();
await page.waitForTimeout(200);
await shot('13-renaming');
const RENAMED = 'Растительное меню';
const editInput = page.locator('.crud-list-row .crud-inline-input');
await editInput.fill(RENAMED);
await page.getByRole('button', { name: 'Сохранить' }).click();
await page.waitForTimeout(500);
await shot('14-renamed-in-manager');

await page.locator('.modal-actions').getByRole('button', { name: 'Закрыть' }).click();
await page.waitForTimeout(500);
await shot('15-menu-after-rename');

const renamedHeaderVisible = await page.locator('.menu-group-title', { hasText: RENAMED }).count();
console.log('Dish list shows renamed category without editing dish:', renamedHeaderVisible > 0);

// Archive the dish, then verify the category becomes deletable
await page.locator('.menu-card', { hasText: 'Тофу-боул' }).getByRole('button', { name: 'Архивировать' }).click();
await page.waitForTimeout(200);
await page.locator('.modal-card').getByRole('button', { name: 'Архивировать' }).click();
await page.waitForTimeout(600);

await page.locator('button:has-text("Категории")').first().click();
await page.waitForTimeout(400);
const targetRow2 = page.locator('.crud-list-row', { has: page.locator('.crud-list-name', { hasText: RENAMED }) });
await shot('16-manager-after-archive');
console.log('Count label after archive:', await targetRow2.locator('.crud-list-count').innerText());
console.log('Delete enabled once empty:', !(await targetRow2.getByRole('button', { name: 'Удалить' }).isDisabled()));

await targetRow2.getByRole('button', { name: 'Удалить' }).click();
await page.waitForTimeout(300);
await shot('17-delete-confirm');
await page.getByRole('dialog', { name: /Удалить категорию/ }).getByRole('button', { name: 'Удалить' }).click();
await page.waitForTimeout(500);
await shot('18-after-delete');

const stillThere = await page.locator('.crud-list-name', { hasText: RENAMED }).count();
console.log('Category gone after delete:', stillThere === 0);

await browser.close();
console.log('done');
