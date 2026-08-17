import { chromium } from "playwright";

const BASE = "http://localhost:3002";
const OUT = "/private/tmp/claude-501/-Users-pareshsuthar-Desktop-cosec-api-test/a75e1301-64fd-4b85-84dc-e2d31b826e6f/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"], input[type="email"]', "beipoready@gmail.com");
await page.fill('input[name="password"], input[type="password"]', "1sbyUITXq6qzK0zO");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 10000 });

await page.goto(`${BASE}/sync`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/sync-page-local.png`, fullPage: true });

const syncTodayBtn = page.getByRole("button", { name: /Sync Today/i });
console.log("Sync Today disabled?", await syncTodayBtn.isDisabled());

await page.goto(`${BASE}/attendance`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/attendance-page-local.png`, fullPage: true });

await browser.close();
