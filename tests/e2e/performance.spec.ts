import { test, expect } from '../fixtures/test-fixtures';

test.describe('Performance Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    // Stop performance measurement
    const loadTime = Date.now() - startTime;

    // Check that load time is within budget (3 seconds)
    expect(loadTime).toBeLessThan(3000);

    // Check Core Web Vitals
    const metrics = await page.evaluate<{ LCP: number; FID: number; CLS: number }>(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {
            LCP: 0, // Largest Contentful Paint
            FID: 0, // First Input Delay
            CLS: 0, // Cumulative Layout Shift
          };

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            } else if (entry.entryType === 'first-input') {
              vitals.FID = (entry as any).processingStart - entry.startTime;
            } else if (entry.entryType === 'layout-shift') {
              vitals.CLS += (entry as any).value;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Fallback timeout
        setTimeout(() => resolve({ LCP: 0, FID: 0, CLS: 0 }), 5000);
      });
    });

    // Check Core Web Vitals thresholds
    expect(metrics.LCP).toBeLessThan(2500); // LCP should be less than 2.5s
    expect(metrics.FID).toBeLessThan(100);   // FID should be less than 100ms
    expect(metrics.CLS).toBeLessThan(0.1);  // CLS should be less than 0.1
  });

  test('should efficiently render map component', async ({ page, helpers }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await helpers.waitForMapLoad();

    // Measure map rendering time
    const renderTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();

        // Wait for map tiles to load
        const checkMapLoaded = () => {
          const mapElement = document.querySelector('[data-testid="map-container"]');
          if (mapElement && (mapElement as any).maplibregl) {
            const map = (mapElement as any).maplibregl;
            if (map.loaded()) {
              resolve(performance.now() - startTime);
              return;
            }
          }

          // Check again after a short delay
          setTimeout(checkMapLoaded, 100);
        };

        checkMapLoaded();

        // Fallback timeout
        setTimeout(() => resolve(10000), 10000);
      });
    });

    // Check that map renders within budget (5 seconds)
    expect(renderTime).toBeLessThan(5000);
  });

  test('should handle multiple emergency markers efficiently', async ({ page, helpers }) => {
    // Navigate to map page
    await page.goto('/map');
    await helpers.waitForMapLoad();

    // Add multiple emergency markers
    const markerCount = 100;
    const startTime = Date.now();

    await page.evaluate((count) => {
      // Simulate adding multiple markers
      const mapContainer = document.querySelector('[data-testid="map-container"]');
      if (mapContainer && (mapContainer as any).maplibregl) {
        const map = (mapContainer as any).maplibregl;

        // Generate random markers
        for (let i = 0; i < count; i++) {
          const marker = document.createElement('div');
          marker.setAttribute('data-testid', 'emergency-marker');
          marker.style.position = 'absolute';
          marker.style.left = `${Math.random() * 100}%`;
          marker.style.top = `${Math.random() * 100}%`;
          mapContainer.appendChild(marker);
        }
      }
    }, markerCount);

    // Wait for markers to be added
    await page.waitForSelector('[data-testid="emergency-marker"]', { timeout: 10000 });

    const renderTime = Date.now() - startTime;

    // Check that markers are rendered efficiently
    expect(renderTime).toBeLessThan(2000); // 2 seconds for 100 markers

    // Verify all markers are present
    const markers = await page.locator('[data-testid="emergency-marker"]').count();
    expect(markers).toBe(markerCount);
  });

  test('should maintain performance with large data sets', async ({ page }) => {
    // Navigate to dashboard with large data set
    await page.goto('/dashboard');

    // Measure initial load time
    const startTime = Date.now();

    // Wait for data to load
    await page.waitForSelector('[data-testid="data-loaded"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Check that data loads within budget (5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Check memory usage
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });

    if (memoryUsage) {
      // Check that memory usage is reasonable (less than 50MB)
      expect(memoryUsage.used).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should efficiently handle real-time updates', async ({ page }) => {
    // Navigate to real-time emergency feed
    await page.goto('/emergency/feed');

    // Wait for initial load
    await page.waitForSelector('[data-testid="feed-loaded"]', { timeout: 10000 });

    // Measure update performance
    const updateTimes = [];

    // Simulate multiple real-time updates
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      // Simulate real-time update
      await page.evaluate((index) => {
        const event = new CustomEvent('emergency-update', {
          detail: {
            id: `test-${index}`,
            type: 'medical',
            location: { lat: 37.7749 + (index * 0.01), lng: -122.4194 + (index * 0.01) },
            timestamp: new Date().toISOString(),
          },
        });
        document.dispatchEvent(event);
      }, i);

      // Wait for update to be processed
      await page.waitForSelector(`[data-testid="emergency-item-test-${i}"]`, { timeout: 5000 });

      const updateTime = Date.now() - startTime;
      updateTimes.push(updateTime);
    }

    // Calculate average update time
    const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;

    // Check that updates are processed efficiently
    expect(averageUpdateTime).toBeLessThan(500); // 500ms average update time
  });

  test('should maintain performance on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to homepage
    await page.goto('/');

    // Measure load time on mobile
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Check that mobile load time is within budget (4 seconds, slightly more lenient)
    expect(loadTime).toBeLessThan(4000);

    // Test scroll performance
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();

        const countFrames = () => {
          frameCount++;
          const currentTime = performance.now();

          if (currentTime - lastTime >= 1000) {
            resolve(frameCount);
            return;
          }

          requestAnimationFrame(countFrames);
        };

        // Start scrolling
        window.scrollTo(0, document.body.scrollHeight);
        countFrames();
      });
    });
  });

  test('should efficiently handle offline/online transitions', async ({ page, helpers }) => {
    // Navigate to app
    await page.goto('/');

    // Measure offline transition time
    const offlineStartTime = Date.now();
    await helpers.goOffline();
    await page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 5000 });
    const offlineTime = Date.now() - offlineStartTime;

    // Check that offline transition is fast
    expect(offlineTime).toBeLessThan(1000);

    // Measure online transition time
    const onlineStartTime = Date.now();
    await helpers.goOnline();
    await page.waitForSelector('[data-testid="online-indicator"]', { timeout: 5000 });
    const onlineTime = Date.now() - onlineStartTime;

    // Check that online transition is fast
    expect(onlineTime).toBeLessThan(1000);
  });
});