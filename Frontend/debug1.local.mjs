import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));
page.on('response', (r) => {
  if (!r.ok()) console.log('[response]', r.status(), r.url());
});
await page.goto('http://localhost:5183/orders', { waitUntil: 'networkidle' });
console.log('URL after goto:', page.url());
console.log('BODY:', (await page.content()).slice(0, 800));
await browser.close();
