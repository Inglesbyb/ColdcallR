import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(process.cwd(), 'test-results', 'ui-audit');

async function ensureDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function checkOverflow(page: Page): Promise<boolean> {
  const hasOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });
  return hasOverflow;
}

async function run() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  
  const viewports = {
    mobile: { width: 390, height: 844 }, // iPhone 14
    desktop: { width: 1440, height: 900 }
  };

  const context = await browser.newContext();

  // Helper to run checks in a viewport
  const runChecks = async (vpName: string, vpData: { width: number, height: number }) => {
    console.log(`\n=== Running checks for ${vpName} ===`);
    const page = await context.newPage();
    await page.setViewportSize(vpData);

    // STATE 1: /list Initial Render
    console.log(`[State 1] Navigating to /list...`);
    await page.goto('http://localhost:3000/list');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT_DIR, `list-${vpName}-default.png`), fullPage: true });

    const hasOverflow = await checkOverflow(page);
    console.log(`[State 1] Horizontal overflow: ${hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);

    // Check if bottom nav exists
    const bottomNav = await page.$('nav'); // Adjust selector based on your BottomNav
    if (bottomNav) {
      console.log(`[State 1] BottomNav found.`);
    }

    // STATE 2: FilterDrawer Modal (Mobile only or both, we'll try both)
    console.log(`[State 2] Opening FilterDrawer...`);
    const filterBtn = await page.locator('button:has-text("Filters"), button:has-text("Advanced")').first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(1000); // wait for drawer animation
      await page.screenshot({ path: path.join(OUT_DIR, `filter-drawer-${vpName}-open.png`) });
      
      // Close drawer by clicking backdrop or close button
      const closeBtn = await page.locator('button:has(svg.lucide-x)').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log(`[State 2] Could not find Filter button`);
    }

    // STATE 3: Zero-Results
    console.log(`[State 3] Checking Zero-Results...`);
    await page.goto('http://localhost:3000/list?search=xyzq999182746');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT_DIR, `list-empty-state-${vpName}.png`) });

    // STATE 4: LeadDrawer
    console.log(`[State 4] Checking LeadDrawer...`);
    await page.goto('http://localhost:3000/list');
    await page.waitForLoadState('networkidle');
    const firstCard = await page.locator('div.bg-slate-800').first(); // Adjust selector
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000); // wait for drawer
      await page.screenshot({ path: path.join(OUT_DIR, `lead-drawer-${vpName}.png`) });
    }

    // STATE 5: /map Stacking
    console.log(`[State 5] Checking /map...`);
    await page.goto('http://localhost:3000/map');
    await page.waitForLoadState('networkidle');
    // wait for map to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, `map-view-${vpName}.png`) });

    await page.close();
  };

  await runChecks('mobile', viewports.mobile);
  await runChecks('desktop', viewports.desktop);

  await browser.close();
  console.log(`\nAudit complete! Screenshots saved to ${OUT_DIR}`);
}

run().catch(console.error);
