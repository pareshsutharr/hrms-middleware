import { chromium } from "playwright";

const BASE = "https://cosec-api-test.vercel.app";
const OUT = "/private/tmp/claude-501/-Users-pareshsuthar-Desktop-cosec-api-test/a75e1301-64fd-4b85-84dc-e2d31b826e6f/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
page.on("response", (res) => {
  if (res.url().includes("/api/health")) console.log("[response]", res.url(), res.status());
});

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"], input[type="email"]', "pareshsutharr@gmail.com");
await page.fill('input[name="password"], input[type="password"]', "Paresh@7359");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 15000 });

console.log("--- navigating to /sync ---");
await page.goto(`${BASE}/sync`);
await page.waitForTimeout(15000);
await page.screenshot({ path: `${OUT}/sync-page-prod3.png`, fullPage: true });

const syncTodayBtn = page.getByRole("button", { name: /Sync Today/i });
console.log("Sync Today disabled on prod?", await syncTodayBtn.isDisabled());
const noteVisible = await page.getByText(/Manual sync needs a direct COSEC connection/i).count();
console.log("Note block present?", noteVisible);

await browser.close();
