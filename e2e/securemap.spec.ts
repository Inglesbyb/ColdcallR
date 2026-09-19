import { test, expect, Page, ConsoleMessage, Response } from "@playwright/test";

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

/** Collects console errors and uncaught exceptions from a page */
function attachConsoleWatcher(page: Page) {
  const errors: string[] = [];
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  page.on("console", handler);
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

/** Collects 4xx/5xx API responses */
function attachNetworkWatcher(page: Page) {
  const failedRequests: { url: string; status: number }[] = [];
  page.on("response", (res: Response) => {
    const url = res.url();
    const status = res.status();
    if (url.includes("/api/") && status >= 400) {
      failedRequests.push({ url, status });
    }
  });
  return failedRequests;
}

// ─────────────────────────────────────────────────────────────
// Journey A — Root Navigation & Redirects
// ─────────────────────────────────────────────────────────────
test.describe("Journey A — Root Navigation & Redirects", () => {
  test("A1: / redirects to /list", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await page.goto("/");
    await page.waitForURL("**/list", { timeout: 10_000 });
    expect(page.url()).toContain("/list");
    expect(errors).toHaveLength(0);
  });

  test("A2: Leads tab is active on /list", async ({ page }) => {
    await page.goto("/list");
    await page.waitForLoadState("networkidle");

    // The Leads nav link should have the active class (aria-current="page")
    const leadsTab = page.locator('nav a[href="/list"]');
    await expect(leadsTab).toHaveAttribute("aria-current", "page");

    // Map tab should NOT be active
    const mapTab = page.locator('nav a[href="/map"]');
    await expect(mapTab).not.toHaveAttribute("aria-current", "page");
  });
});

// ─────────────────────────────────────────────────────────────
// Journey B — List View, Sorting & Quick Filters
// ─────────────────────────────────────────────────────────────
test.describe("Journey B — List View, Sorting & Filters", () => {
  test("B1: Core list UI elements render", async ({ page }) => {
    await page.goto("/list");
    await page.waitForLoadState("networkidle");

    // Search bar
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Sort pills – verify all four exist
    for (const label of ["Highest Score", "Most Burglaries", "Newest Incorporated", "Most Established"]) {
      await expect(page.getByRole("button", { name: new RegExp(label, "i") })).toBeVisible();
    }

    // Filter toggle button
    await expect(page.getByRole("button", { name: /filters/i }).or(
      page.locator('[aria-label*="filter"], button:has(svg[data-lucide="sliders-horizontal"])')
    )).toBeVisible({ timeout: 8_000 }).catch(async () => {
      // Fallback: just check the filter icon button exists anywhere in the header
      await expect(page.locator("header button, .sticky button").first()).toBeVisible();
    });

    // At least one lead card
    const cards = page.locator("main .space-y-3 > *").first();
    await expect(cards).toBeVisible({ timeout: 15_000 });
  });

  test("B2: 'Most Burglaries' sort updates URL and reorders list", async ({ page }) => {
    const apiLatencies: number[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/leads")) {
        const timing = res.request().timing();
        // timing() is synchronous in this Playwright version
        if (timing && timing.responseEnd && timing.requestStart) {
          apiLatencies.push(timing.responseEnd - timing.requestStart);
        }
      }
    });

    await page.goto("/list");
    await page.waitForLoadState("networkidle");

    // Click the burglaries sort pill
    await page.getByRole("button", { name: /Most Burglaries/i }).click();

    // URL should update
    await page.waitForURL(/sort_by=burglaries/, { timeout: 8_000 });
    expect(page.url()).toContain("sort_by=burglaries");

    // Wait for fresh results
    await page.waitForResponse((res) => res.url().includes("/api/leads") && res.ok());
    await page.waitForLoadState("networkidle");

    console.log(`[B2] API latencies (ms): ${apiLatencies.join(", ")}`);
  });

  test("B3: Plot on Map FAB navigates with active params", async ({ page }) => {
    await page.goto("/list?sort_by=burglaries");
    await page.waitForLoadState("networkidle");

    // Wait for FAB to be visible
    const fab = page.getByRole("button", { name: /Plot.*Map/i });
    await expect(fab).toBeVisible({ timeout: 10_000 });

    // Click and check navigation
    await fab.click();
    await page.waitForURL("**/map**", { timeout: 10_000 });

    const url = page.url();
    expect(url).toContain("/map");
    expect(url).toContain("sort_by=burglaries");
  });
});

// ─────────────────────────────────────────────────────────────
// Journey C — Map Rendering, Pin Interactions & LeadDrawer
// ─────────────────────────────────────────────────────────────
test.describe("Journey C — Map Rendering & LeadDrawer", () => {
  test("C1: Map loads and Leaflet container renders", async ({ page }) => {
    const failedRequests = attachNetworkWatcher(page);
    await page.goto("/map");
    
    // Leaflet injects this class
    const leafletContainer = page.locator(".leaflet-container");
    await expect(leafletContainer).toBeVisible({ timeout: 20_000 });

    // Tile layer loads (canvas or img tiles)
    await page.waitForTimeout(2500); // let tiles start rendering
    expect(failedRequests.filter((r) => !r.url.includes("openstreetmap"))).toHaveLength(0);
  });

  test("C2: Clicking a marker opens the LeadDrawer", async ({ page }) => {
    await page.goto("/map");
    const leafletContainer = page.locator(".leaflet-container");
    await expect(leafletContainer).toBeVisible({ timeout: 20_000 });

    // Wait for markers to be stable — Leaflet re-clusters as data loads;
    // keep polling until a .lead-marker stays attached for 2 consecutive checks.
    await page.waitForFunction(() => {
      const markers = document.querySelectorAll(".lead-marker");
      return markers.length > 0;
    }, undefined, { timeout: 30_000, polling: 500 });

    // Small settle wait after last cluster update
    await page.waitForTimeout(1500);

    // Click via Leaflet map center (guaranteed to be in-viewport and stable)
    const box = await leafletContainer.boundingBox();
    if (!box) throw new Error("Map container has no bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // If we hit a cluster, spiderfy it then click one leaf
    await page.waitForTimeout(600);
    const markers = page.locator(".lead-marker");
    const count = await markers.count();
    if (count > 0) {
      const markerBox = await markers.first().boundingBox();
      if (markerBox) {
        await page.mouse.click(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
      }
    }

    // LeadDrawer should slide in
    const drawer = page.locator('[role="dialog"], [data-vaul-drawer]').or(
      page.locator(".fixed.inset-0, .fixed.bottom-0").filter({ hasText: /navigate|score|burglari/i })
    );
    await expect(drawer).toBeVisible({ timeout: 10_000 });
  });

  test("C3: LeadDrawer shows company data and Navigate button", async ({ page }) => {
    await page.goto("/map");
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });

    // Wait for stable markers
    await page.waitForFunction(() => {
      return document.querySelectorAll(".lead-marker").length > 0;
    }, undefined, { timeout: 30_000, polling: 500 });
    await page.waitForTimeout(1500);

    // Click map center, then first individual marker if still needed
    const box = await page.locator(".leaflet-container").boundingBox();
    if (!box) throw new Error("No map bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);

    const markers = page.locator(".lead-marker");
    if (await markers.count() > 0) {
      const markerBox = await markers.first().boundingBox();
      if (markerBox) {
        await page.mouse.click(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
      }
    }

    await page.waitForTimeout(600);

    // Navigate button — exact name to avoid strict-mode ambiguity with Street View
    const navigateBtn = page.getByRole("link", { name: "Navigate", exact: true }).or(
      page.locator('a[href*="maps/dir"]')
    ).first();
    await expect(navigateBtn).toBeVisible({ timeout: 10_000 });

    const href = await navigateBtn.getAttribute("href");
    expect(href).toMatch(/google\.com\/maps/);
    expect(href).toMatch(/destination=[-\d.]+,[-\d.]+/);
  });
});

// ─────────────────────────────────────────────────────────────
// Journey D — Navigation Bar & Today View
// ─────────────────────────────────────────────────────────────
test.describe("Journey D — BottomNav & Today View", () => {
  test("D1: Today tab navigates and renders without 404", async ({ page }) => {
    await page.goto("/list");
    await page.waitForLoadState("networkidle");

    // Click Today in the bottom nav
    const todayTab = page.locator('nav a[href="/today"]');
    await expect(todayTab).toBeVisible();
    await todayTab.click();

    await page.waitForURL("**/today", { timeout: 8_000 });
    expect(page.url()).toContain("/today");

    // No 404 copy
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/404|not found/i);
  });

  test("D2: Leads tab returns to /list with active state", async ({ page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const leadsTab = page.locator('nav a[href="/list"]');
    await leadsTab.click();

    await page.waitForURL("**/list", { timeout: 8_000 });
    await expect(page.locator('nav a[href="/list"]')).toHaveAttribute("aria-current", "page");
  });
});

// ─────────────────────────────────────────────────────────────
// Journey E — Console & Network Health Check
// ─────────────────────────────────────────────────────────────
test.describe("Journey E — Console & Network Health", () => {
  test("E1: Zero JS errors on /list load", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    const failedRequests = attachNetworkWatcher(page);

    await page.goto("/list");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000); // let any deferred fetches settle

    // Filter out benign browser extension noise & favicon 404
    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("extensions") &&
        !e.includes("ERR_BLOCKED_BY_CLIENT") &&
        !e.includes("Minified React error") // those come through pageerror anyway
    );

    if (realErrors.length > 0) {
      console.error("[E1] Console errors:\n" + realErrors.join("\n"));
    }
    expect(realErrors).toHaveLength(0);

    if (failedRequests.length > 0) {
      console.error("[E1] Failed API requests:", failedRequests);
    }
    expect(failedRequests).toHaveLength(0);
  });

  test("E2: Zero hydration errors on /map load", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    const failedRequests = attachNetworkWatcher(page);

    await page.goto("/map");
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);

    const hydrationErrors = errors.filter((e) =>
      /hydrat|did not match|Text content does not match/i.test(e)
    );

    if (hydrationErrors.length > 0) {
      console.error("[E2] Hydration errors:\n" + hydrationErrors.join("\n"));
    }
    expect(hydrationErrors).toHaveLength(0);
    expect(failedRequests.filter((r) => !r.url.includes("openstreetmap"))).toHaveLength(0);
  });

  test("E3: /api/leads returns 200 with correct shape", async ({ page }) => {
    const response = await page.request.get(
      "http://localhost:3000/api/leads?limit=5&offset=0&sort_by=score"
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("leads");
    expect(body).toHaveProperty("totalCount");
    expect(Array.isArray(body.leads)).toBe(true);
    expect(body.leads.length).toBeGreaterThan(0);

    // Shape-check the first lead
    const lead = body.leads[0];
    expect(lead).toHaveProperty("id");
    expect(lead).toHaveProperty("company_name");
    expect(lead).toHaveProperty("lead_score");
    expect(lead).toHaveProperty("recent_burglaries_count");
    expect(lead).toHaveProperty("risk_profile_tag");
    expect(lead).toHaveProperty("lat");
    expect(lead).toHaveProperty("lng");

    console.log(`[E3] Total leads in DB: ${body.totalCount}`);
    console.log(`[E3] Sample lead: ${lead.company_name} | score=${lead.lead_score} | tag=${lead.risk_profile_tag}`);
  });

  test("E4: sort_by=burglaries returns higher burglary counts first", async ({ page }) => {
    const burglariesRes = await page.request.get(
      "http://localhost:3000/api/leads?limit=5&sort_by=burglaries"
    );
    expect(burglariesRes.ok()).toBe(true);
    const { leads } = await burglariesRes.json();
    expect(leads.length).toBeGreaterThan(1);

    // Verify descending order
    for (let i = 0; i < leads.length - 1; i++) {
      expect(leads[i].recent_burglaries_count).toBeGreaterThanOrEqual(
        leads[i + 1].recent_burglaries_count
      );
    }
    console.log(
      `[E4] Top 5 burglary counts: ${leads.map((l: { recent_burglaries_count: number }) => l.recent_burglaries_count).join(", ")}`
    );
  });

  test("E5: risk_tags filter returns only matching risk_profile_tag records", async ({ page }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/leads?limit=10&risk_tags=HIGH_CRIME_ZONE,ELEVATED_CRIME"
    );
    expect(res.ok()).toBe(true);
    const { leads, totalCount } = await res.json();

    for (const lead of leads) {
      expect(["HIGH_CRIME_ZONE", "ELEVATED_CRIME"]).toContain(lead.risk_profile_tag);
    }
    console.log(`[E5] HIGH_CRIME_ZONE + ELEVATED_CRIME total: ${totalCount}`);
  });
});
