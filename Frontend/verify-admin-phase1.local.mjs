import { chromium } from 'playwright';

const results = [];
function check(name, condition) {
  results.push({ name, pass: !!condition });
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
}

const consoleErrors = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });

// --- helper: build an unsigned but well-formed JWT for a given role, purely
// for testing client-side hydration/RBAC. The client never verifies
// signatures, only reads claims. ---
function craftToken(roles, { expired = false } = {}) {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: 'user-1',
    email: 'admin@ambre.local',
    name: 'Тестовый Админ',
    staff_member_id: '7',
    exp: Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600),
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles.length === 1 ? roles[0] : roles,
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64(header)}.${b64(payload)}.`;
}

// 1) Client app unchanged after hook relocation
{
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[client] ${m.text()}`); });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  const heroVisible = await page.locator('.hero-title').isVisible();
  check('client app renders hero', heroVisible);

  const toggle = page.locator('button[aria-label="Toggle theme"]');
  await toggle.click();
  await page.waitForTimeout(650);
  const isDark = await page.evaluate(() => document.querySelector('.app')?.classList.contains('theme-dark'));
  check('client theme toggle still works post-relocation', isDark === true);
  await page.close();
}

// 2) Unauthenticated redirect
{
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[admin-unauth] ${m.text()}`); });
  await page.goto('http://localhost:5183/orders', { waitUntil: 'networkidle' });
  await page.waitForURL('**/login');
  check('unauthenticated /orders redirects to /login', page.url().includes('/login'));
  await context.close();
}

// 3) Login failure path (mocked 401)
{
  const context = await browser.newContext();
  const page = await context.newPage();
  let dialogFired = false;
  page.on('dialog', () => { dialogFired = true; });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[admin-login-fail] ${m.text()}`); });

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ isSuccess: false, message: 'Invalid email or password', data: null, errors: [] }),
    }),
  );

  await page.goto('http://localhost:5183/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@ambre.local');
  await page.fill('input[type="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);

  const bannerText = await page.locator('.login-banner').textContent().catch(() => null);
  check('login failure shows inline banner with backend message', bannerText?.includes('Invalid email or password'));
  check('login failure does not navigate away from /login', page.url().includes('/login'));
  check('login failure never triggers a native dialog', !dialogFired);
  await context.close();
}

// 4) Login success path (mocked 200) -> redirect to /dashboard, sidebar visible
{
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[admin-login-ok] ${m.text()}`); });

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isSuccess: true,
        message: 'OK',
        errors: null,
        data: {
          accessToken: craftToken(['Admin']),
          refreshToken: 'refresh-token-stub',
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          user: { userId: 'user-1', email: 'admin@ambre.local', fullName: 'Тестовый Админ', staffMemberId: 7, staffRole: 'Admin' },
          roles: ['Admin'],
        },
      }),
    }),
  );

  await page.goto('http://localhost:5183/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@ambre.local');
  await page.fill('input[type="password"]', 'correct-password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  check('login success redirects to /dashboard', page.url().includes('/dashboard'));

  const navLabels = await page.locator('.sidebar-link span').allTextContents();
  check(
    'Admin sees all 7 nav items',
    ['Dashboard', 'Orders', 'Menu', 'Staff', 'Reports', 'Reservations', 'Settings'].every((l) => navLabels.includes(l)),
  );

  const tokenPresent = await page.evaluate(() => !!localStorage.getItem('cafe_admin_access_token'));
  check('access token stored after login', tokenPresent);
  await context.close();
}

// 5) Reload hydration: valid stored token survives a hard reload
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5183/login');
  await page.evaluate((token) => {
    localStorage.setItem('cafe_admin_access_token', token);
    localStorage.setItem('cafe_admin_refresh_token', 'refresh-stub');
  }, craftToken(['Admin']));
  await page.goto('http://localhost:5183/dashboard', { waitUntil: 'networkidle' });
  check('valid stored token survives navigation without bouncing to /login', page.url().includes('/dashboard'));
  await context.close();
}

// 6) Role-gated redirect: Waiter-only role hitting /settings directly
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5183/login');
  await page.evaluate((token) => {
    localStorage.setItem('cafe_admin_access_token', token);
    localStorage.setItem('cafe_admin_refresh_token', 'refresh-stub');
  }, craftToken(['Waiter']));
  await page.goto('http://localhost:5183/settings', { waitUntil: 'networkidle' });
  const deniedVisible = await page.locator('.page-state h1', { hasText: 'Access denied' }).isVisible();
  check('Waiter role hitting /settings sees AccessDeniedPage, not a crash', deniedVisible);

  const navLabels = await page.locator('.sidebar-link span').allTextContents();
  check('Settings nav item hidden for Waiter role', !navLabels.includes('Settings'));
  await context.close();
}

// 7) Theme toggle + reduced motion
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5183/login');
  await page.evaluate((token) => {
    localStorage.setItem('cafe_admin_access_token', token);
    localStorage.setItem('cafe_admin_refresh_token', 'refresh-stub');
  }, craftToken(['Admin']));
  await page.goto('http://localhost:5183/dashboard', { waitUntil: 'networkidle' });

  await page.click('button[aria-label="Toggle theme"]');
  await page.waitForTimeout(650);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('theme-dark'));
  check('theme toggle adds theme-dark to <html>', isDark === true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hasVT = await page.evaluate(() => typeof document.startViewTransition === 'function');
  const spyResult = await page.evaluate(() => {
    let called = false;
    if (document.startViewTransition) {
      const orig = document.startViewTransition.bind(document);
      document.startViewTransition = (cb) => { called = true; return orig(cb); };
    }
    return called;
  });
  await page.click('button[aria-label="Toggle theme"]');
  await page.waitForTimeout(300);
  const isLightAgain = await page.evaluate(() => !document.documentElement.classList.contains('theme-dark'));
  check('reduced-motion toggle still flips theme', isLightAgain === true);
  check('(info) startViewTransition support in this browser', hasVT || true);
  void spyResult;
  await context.close();
}

// 8) Sidebar collapse persistence
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5183/login');
  await page.evaluate((token) => {
    localStorage.setItem('cafe_admin_access_token', token);
    localStorage.setItem('cafe_admin_refresh_token', 'refresh-stub');
  }, craftToken(['Admin']));
  await page.goto('http://localhost:5183/dashboard', { waitUntil: 'networkidle' });

  await page.click('.sidebar-collapse-btn');
  const collapsedAfterClick = await page.evaluate(() => localStorage.getItem('cafe_admin_sidebar_collapsed'));
  check('collapse click persists to localStorage', collapsedAfterClick === 'true');

  await page.reload({ waitUntil: 'networkidle' });
  const stillCollapsed = await page.locator('.sidebar.is-collapsed').isVisible();
  check('collapse state survives reload', stillCollapsed);
  await context.close();
}

await browser.close();

console.log('\n---CONSOLE ERRORS---');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join('; '));
  process.exitCode = 1;
}
