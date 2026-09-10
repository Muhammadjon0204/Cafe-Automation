import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE || 'http://localhost:5183';
const shotDir = 'C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\c--Users-Muhammadjon-Desktop-Cafe-project\\c6c9b3ac-05b7-4cd2-afef-4705671b4e3a\\scratchpad';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
const onLogin = await page.locator('input[name="email"]').count();
if (onLogin > 0) {
  await page.fill('input[name="email"]', 'admin@cafe.local');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

async function measure(label, i) {
  await page.goto(`${BASE}/tables`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.floor-canvas-container canvas', { timeout: 10000 });
  await page.waitForTimeout(400);

  const data = await page.evaluate(() => {
    const wrap = document.querySelector('.tables-canvas-wrap');
    const container = document.querySelector('.floor-canvas-container');
    const canvases = Array.from(document.querySelectorAll('.floor-canvas-container canvas'));
    const shellContent = document.querySelector('.app-shell-content');
    const sidebar = document.querySelector('.sidebar');
    const shell = document.querySelector('.app-shell');
    const rect = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
    return {
      wrap: rect(wrap),
      container: rect(container),
      canvas0: canvases[0] ? { w: canvases[0].width, h: canvases[0].height, cssRect: rect(canvases[0]) } : null,
      containerScroll: container ? { scrollLeft: container.scrollLeft, scrollWidth: container.scrollWidth, clientWidth: container.clientWidth } : null,
      shellContentHasVScroll: shellContent ? shellContent.scrollHeight > shellContent.clientHeight : null,
      shellContentClientWidth: shellContent ? shellContent.clientWidth : null,
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      isCollapsed: shell ? shell.className.includes('is-collapsed') : null,
      documentClientWidth: document.documentElement.clientWidth,
    };
  });
  console.log(`--- ${label} #${i} ---`);
  console.log(JSON.stringify(data));
  await page.screenshot({ path: `${shotDir}/diag-${label}-${i}.png` });
  return data;
}

const results = [];
for (let i = 1; i <= 5; i++) {
  results.push(await measure('reload', i));
}

console.log('SUMMARY_JSON_START');
console.log(JSON.stringify(results, null, 2));
console.log('SUMMARY_JSON_END');

console.log('CONSOLE_ERRORS_JSON_START');
console.log(JSON.stringify(consoleErrors, null, 2));
console.log('CONSOLE_ERRORS_JSON_END');

await browser.close();
