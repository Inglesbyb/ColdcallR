# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: securemap.spec.ts >> Journey C — Map Rendering & LeadDrawer >> C3: LeadDrawer shows company data and Navigate button
- Location: e2e\securemap.spec.ts:188:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: 'Navigate', exact: true }).or(locator('a[href*="maps/dir"]')).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('link', { name: 'Navigate', exact: true }).or(locator('a[href*="maps/dir"]')).first() with timeout 10000ms
  - waiting for getByRole('link', { name: 'Navigate', exact: true }).or(locator('a[href*="maps/dir"]')).first()

```

```yaml
- main:
  - search "Lead filters":
    - searchbox "Search leads"
    - button "Hot Only"
    - button "Unvisited"
    - button "More filters"
  - text: 500 leads on map
  - button "70"
  - button "3"
  - button "70"
  - button "7"
  - button "70"
  - button "2"
  - button "3"
  - button "9"
  - button "70"
  - button "70"
  - button "73"
  - button "2"
  - button "5"
  - button "70"
  - button "70"
  - button "3"
  - button "5"
  - button "70"
  - button "4"
  - button "3"
  - button "70"
  - button "78"
  - button "3"
  - button "5"
  - button "4"
  - button "70"
  - button "8"
  - button "71"
  - button "4"
  - button "3"
  - button "4"
  - button "73"
  - button "2"
  - button "36"
  - button "13"
  - button "70"
  - button "5"
  - button "16"
  - button "15"
  - button "29"
  - button "3"
  - button "9"
  - button "40"
  - button "42"
  - button "198"
  - link "Leaflet":
    - /url: https://leafletjs.com
  - text: ©
  - link "OpenStreetMap":
    - /url: https://www.openstreetmap.org/copyright
  - text: contributors
  - button "Find my location"
  - button "Zoom in"
  - button "Zoom out"
  - button "Reset to Liverpool"
  - navigation "Main navigation":
    - link "Leads":
      - /url: /list
    - link "Map":
      - /url: /map
    - link "Today":
      - /url: /today
- alert
```

# Test source

```ts
  118 | 
  119 |     // Wait for FAB to be visible
  120 |     const fab = page.getByRole("button", { name: /Plot.*Map/i });
  121 |     await expect(fab).toBeVisible({ timeout: 10_000 });
  122 | 
  123 |     // Click and check navigation
  124 |     await fab.click();
  125 |     await page.waitForURL("**/map**", { timeout: 10_000 });
  126 | 
  127 |     const url = page.url();
  128 |     expect(url).toContain("/map");
  129 |     expect(url).toContain("sort_by=burglaries");
  130 |   });
  131 | });
  132 | 
  133 | // ─────────────────────────────────────────────────────────────
  134 | // Journey C — Map Rendering, Pin Interactions & LeadDrawer
  135 | // ─────────────────────────────────────────────────────────────
  136 | test.describe("Journey C — Map Rendering & LeadDrawer", () => {
  137 |   test("C1: Map loads and Leaflet container renders", async ({ page }) => {
  138 |     const failedRequests = attachNetworkWatcher(page);
  139 |     await page.goto("/map");
  140 |     
  141 |     // Leaflet injects this class
  142 |     const leafletContainer = page.locator(".leaflet-container");
  143 |     await expect(leafletContainer).toBeVisible({ timeout: 20_000 });
  144 | 
  145 |     // Tile layer loads (canvas or img tiles)
  146 |     await page.waitForTimeout(2500); // let tiles start rendering
  147 |     expect(failedRequests.filter((r) => !r.url.includes("openstreetmap"))).toHaveLength(0);
  148 |   });
  149 | 
  150 |   test("C2: Clicking a marker opens the LeadDrawer", async ({ page }) => {
  151 |     await page.goto("/map");
  152 |     const leafletContainer = page.locator(".leaflet-container");
  153 |     await expect(leafletContainer).toBeVisible({ timeout: 20_000 });
  154 | 
  155 |     // Wait for markers to be stable — Leaflet re-clusters as data loads;
  156 |     // keep polling until a .lead-marker stays attached for 2 consecutive checks.
  157 |     await page.waitForFunction(() => {
  158 |       const markers = document.querySelectorAll(".lead-marker");
  159 |       return markers.length > 0;
  160 |     }, undefined, { timeout: 30_000, polling: 500 });
  161 | 
  162 |     // Small settle wait after last cluster update
  163 |     await page.waitForTimeout(1500);
  164 | 
  165 |     // Click via Leaflet map center (guaranteed to be in-viewport and stable)
  166 |     const box = await leafletContainer.boundingBox();
  167 |     if (!box) throw new Error("Map container has no bounding box");
  168 |     await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  169 | 
  170 |     // If we hit a cluster, spiderfy it then click one leaf
  171 |     await page.waitForTimeout(600);
  172 |     const markers = page.locator(".lead-marker");
  173 |     const count = await markers.count();
  174 |     if (count > 0) {
  175 |       const markerBox = await markers.first().boundingBox();
  176 |       if (markerBox) {
  177 |         await page.mouse.click(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  178 |       }
  179 |     }
  180 | 
  181 |     // LeadDrawer should slide in
  182 |     const drawer = page.locator('[role="dialog"], [data-vaul-drawer]').or(
  183 |       page.locator(".fixed.inset-0, .fixed.bottom-0").filter({ hasText: /navigate|score|burglari/i })
  184 |     );
  185 |     await expect(drawer).toBeVisible({ timeout: 10_000 });
  186 |   });
  187 | 
  188 |   test("C3: LeadDrawer shows company data and Navigate button", async ({ page }) => {
  189 |     await page.goto("/map");
  190 |     await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });
  191 | 
  192 |     // Wait for stable markers
  193 |     await page.waitForFunction(() => {
  194 |       return document.querySelectorAll(".lead-marker").length > 0;
  195 |     }, undefined, { timeout: 30_000, polling: 500 });
  196 |     await page.waitForTimeout(1500);
  197 | 
  198 |     // Click map center, then first individual marker if still needed
  199 |     const box = await page.locator(".leaflet-container").boundingBox();
  200 |     if (!box) throw new Error("No map bounding box");
  201 |     await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  202 |     await page.waitForTimeout(700);
  203 | 
  204 |     const markers = page.locator(".lead-marker");
  205 |     if (await markers.count() > 0) {
  206 |       const markerBox = await markers.first().boundingBox();
  207 |       if (markerBox) {
  208 |         await page.mouse.click(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  209 |       }
  210 |     }
  211 | 
  212 |     await page.waitForTimeout(600);
  213 | 
  214 |     // Navigate button — exact name to avoid strict-mode ambiguity with Street View
  215 |     const navigateBtn = page.getByRole("link", { name: "Navigate", exact: true }).or(
  216 |       page.locator('a[href*="maps/dir"]')
  217 |     ).first();
> 218 |     await expect(navigateBtn).toBeVisible({ timeout: 10_000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  219 | 
  220 |     const href = await navigateBtn.getAttribute("href");
  221 |     expect(href).toMatch(/google\.com\/maps/);
  222 |     expect(href).toMatch(/destination=[-\d.]+,[-\d.]+/);
  223 |   });
  224 | });
  225 | 
  226 | // ─────────────────────────────────────────────────────────────
  227 | // Journey D — Navigation Bar & Today View
  228 | // ─────────────────────────────────────────────────────────────
  229 | test.describe("Journey D — BottomNav & Today View", () => {
  230 |   test("D1: Today tab navigates and renders without 404", async ({ page }) => {
  231 |     await page.goto("/list");
  232 |     await page.waitForLoadState("networkidle");
  233 | 
  234 |     // Click Today in the bottom nav
  235 |     const todayTab = page.locator('nav a[href="/today"]');
  236 |     await expect(todayTab).toBeVisible();
  237 |     await todayTab.click();
  238 | 
  239 |     await page.waitForURL("**/today", { timeout: 8_000 });
  240 |     expect(page.url()).toContain("/today");
  241 | 
  242 |     // No 404 copy
  243 |     const bodyText = await page.locator("body").innerText();
  244 |     expect(bodyText).not.toMatch(/404|not found/i);
  245 |   });
  246 | 
  247 |   test("D2: Leads tab returns to /list with active state", async ({ page }) => {
  248 |     await page.goto("/today");
  249 |     await page.waitForLoadState("networkidle");
  250 | 
  251 |     const leadsTab = page.locator('nav a[href="/list"]');
  252 |     await leadsTab.click();
  253 | 
  254 |     await page.waitForURL("**/list", { timeout: 8_000 });
  255 |     await expect(page.locator('nav a[href="/list"]')).toHaveAttribute("aria-current", "page");
  256 |   });
  257 | });
  258 | 
  259 | // ─────────────────────────────────────────────────────────────
  260 | // Journey E — Console & Network Health Check
  261 | // ─────────────────────────────────────────────────────────────
  262 | test.describe("Journey E — Console & Network Health", () => {
  263 |   test("E1: Zero JS errors on /list load", async ({ page }) => {
  264 |     const errors = attachConsoleWatcher(page);
  265 |     const failedRequests = attachNetworkWatcher(page);
  266 | 
  267 |     await page.goto("/list");
  268 |     await page.waitForLoadState("networkidle");
  269 |     await page.waitForTimeout(1000); // let any deferred fetches settle
  270 | 
  271 |     // Filter out benign browser extension noise & favicon 404
  272 |     const realErrors = errors.filter(
  273 |       (e) =>
  274 |         !e.includes("favicon") &&
  275 |         !e.includes("extensions") &&
  276 |         !e.includes("ERR_BLOCKED_BY_CLIENT") &&
  277 |         !e.includes("Minified React error") // those come through pageerror anyway
  278 |     );
  279 | 
  280 |     if (realErrors.length > 0) {
  281 |       console.error("[E1] Console errors:\n" + realErrors.join("\n"));
  282 |     }
  283 |     expect(realErrors).toHaveLength(0);
  284 | 
  285 |     if (failedRequests.length > 0) {
  286 |       console.error("[E1] Failed API requests:", failedRequests);
  287 |     }
  288 |     expect(failedRequests).toHaveLength(0);
  289 |   });
  290 | 
  291 |   test("E2: Zero hydration errors on /map load", async ({ page }) => {
  292 |     const errors = attachConsoleWatcher(page);
  293 |     const failedRequests = attachNetworkWatcher(page);
  294 | 
  295 |     await page.goto("/map");
  296 |     await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });
  297 |     await page.waitForTimeout(2000);
  298 | 
  299 |     const hydrationErrors = errors.filter((e) =>
  300 |       /hydrat|did not match|Text content does not match/i.test(e)
  301 |     );
  302 | 
  303 |     if (hydrationErrors.length > 0) {
  304 |       console.error("[E2] Hydration errors:\n" + hydrationErrors.join("\n"));
  305 |     }
  306 |     expect(hydrationErrors).toHaveLength(0);
  307 |     expect(failedRequests.filter((r) => !r.url.includes("openstreetmap"))).toHaveLength(0);
  308 |   });
  309 | 
  310 |   test("E3: /api/leads returns 200 with correct shape", async ({ page }) => {
  311 |     const response = await page.request.get(
  312 |       "http://localhost:3000/api/leads?limit=5&offset=0&sort_by=score"
  313 |     );
  314 |     expect(response.status()).toBe(200);
  315 | 
  316 |     const body = await response.json();
  317 |     expect(body).toHaveProperty("leads");
  318 |     expect(body).toHaveProperty("totalCount");
```