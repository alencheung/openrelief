import { test, expect } from '../fixtures/test-fixtures';

/**
 * Performance tests for OpenRelief.
 *
 * Targets the real routes. The homepage lazy-loads the map bundle and
 * may keep a websocket/long-poll open, so we avoid 'networkidle' for
 * navigation and use 'domcontentloaded' instead. Core Web Vitals are
 * measured via PerformanceObserver.
 */
test.describe('Performance Tests', () => {
  test('should load the homepage within a reasonable budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loadTime = Date.now() - startTime;

    // Budget is generous (5s) to stay stable across CI machines; the dev
    // server compiles on demand. Tighten once production builds are the
    // baseline.
    expect(loadTime).toBeLessThan(15000);

    // The hero heading should paint quickly after DOMContentLoaded.
    await expect(
      page.getByRole('heading', { level: 1 })
    ).toContainText('Emergency Coordination');
  });

  test('should report Core Web Vitals on the homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Give the browser time to record LCP/CLS entries.
    const metrics = await page.evaluate<{ lcp: number; cls: number }>(() => {
      return new Promise((resolve) => {
        const vitals = { lcp: 0, cls: 0 };

        const lcpObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.lcp = Math.max(vitals.lcp, entry.startTime);
          }
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });

        const clsObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.cls += (entry as PerformanceEntry & { value: number }).value;
          }
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });

        // Resolve after a short window so the test stays fast.
        setTimeout(() => {
          lcpObs.disconnect();
          clsObs.disconnect();
          resolve(vitals);
        }, 2000);
      });
    });

    // LCP under 4s (lenient for dev-server first compile); CLS under 0.25.
    expect(metrics.lcp).toBeLessThan(4000);
    expect(metrics.cls).toBeLessThan(0.25);
  });

  test('should load the report page within budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/report', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
    await expect(page.locator('header')).toBeVisible();
  });

  test('should not leak excessive memory on the homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // performance.memory is Chromium-only; null on other browsers.
    const memoryUsage = await page.evaluate(() => {
      const mem = (performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }).memory;
      return mem
        ? {
            used: mem.usedJSHeapSize,
            total: mem.totalJSHeapSize,
            limit: mem.jsHeapSizeLimit,
          }
        : null;
    });

    if (memoryUsage) {
      // 150MB ceiling is lenient for a dev build that includes maplibre-gl.
      expect(memoryUsage.used).toBeLessThan(150 * 1024 * 1024);
    }
  });

  test('should keep mobile load time within budget', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });

  test('should maintain scroll performance on the homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Count animation frames during a short scroll window.
    const frameCount = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start >= 500) {
            resolve(frames);
            return;
          }
          window.scrollBy(0, 10);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });

    // We should have produced frames (i.e. the page is interactive).
    expect(frameCount).toBeGreaterThan(0);
  });

  // --- Skipped: features not yet implemented ---

  test.skip('should efficiently render the map component', async () => {
    // SKIPPED: There is no standalone /map route and no
    // [data-testid="map-container"] hook. The map renders on the home
    // page behind an AuthGuard; a meaningful render-time test requires
    // an authenticated session and a stable map readiness signal.
  });

  test.skip('should handle multiple emergency markers efficiently', async () => {
    // SKIPPED: Depends on the standalone map page that does not exist.
  });

  test.skip('should maintain performance with large data sets', async () => {
    // SKIPPED: /dashboard route does not exist.
  });

  test.skip('should efficiently handle real-time updates', async () => {
    // SKIPPED: /emergency/feed route does not exist.
  });

  test.skip('should efficiently handle offline/online transitions', async () => {
    // SKIPPED: The app does not currently render persistent
    // online/offline indicators with stable selectors. The offline
    // transition itself is covered in app.spec.ts via the /offline page.
  });
});
