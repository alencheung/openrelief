# Lighthouse CI Configuration for OpenRelief

This document explains how to use the Lighthouse CI configuration for the OpenRelief project to ensure optimal performance, accessibility, PWA compliance, and SEO standards.

## Overview

The Lighthouse CI configuration (`lighthouserc.json`) is set up to audit the OpenRelief emergency coordination platform across multiple dimensions:

- **Performance**: Core Web Vitals and loading performance
- **Accessibility**: WCAG compliance and screen reader support
- **Best Practices**: Modern web development standards
- **SEO**: Search engine optimization
- **PWA**: Progressive Web App compliance

## Configuration Structure

The configuration includes four distinct test scenarios:

### 1. Default CI Configuration (`ci`)
- **Target**: Standard desktop testing
- **URLs**: Homepage, offline page, emergency page, PWA status page
- **Performance Thresholds**: 80% minimum score
- **Accessibility Thresholds**: 90% minimum score

### 2. Mobile Configuration (`ci:mobile`)
- **Target**: Mobile device emulation (360x640 viewport)
- **Network Throttling**: 3G-like conditions (150ms RTT, 1.6Mbps throughput)
- **CPU Throttling**: 4x slowdown
- **Performance Thresholds**: 70% minimum score (adjusted for mobile)

### 3. Desktop Configuration (`ci:desktop`)
- **Target**: High-performance desktop testing (1350x940 viewport)
- **Network Throttling**: Fast broadband (40ms RTT, 10Mbps throughput)
- **Performance Thresholds**: 90% minimum score
- **Accessibility Thresholds**: 95% minimum score

### 4. PWA Focus Configuration (`ci:pwa-focus`)
- **Target**: PWA-specific testing with emphasis on offline capabilities
- **Categories**: PWA, Performance, and Accessibility only
- **Runs**: 5 iterations for consistency
- **PWA Thresholds**: 90% minimum score

## Audited URLs

The configuration audits these critical pages:

1. **Homepage** (`/`): Main landing page
2. **Offline Page** (`/offline`): Offline functionality
3. **Emergency Page** (`/offline/emergency`): Critical emergency features
4. **PWA Status** (`/pwa-status`): PWA installation and status

## Performance Budgets

### Core Web Vitals Thresholds

#### Mobile
- **First Contentful Paint (FCP)**: ≤ 3.0s
- **Largest Contentful Paint (LCP)**: ≤ 4.0s
- **Cumulative Layout Shift (CLS)**: ≤ 0.1
- **Total Blocking Time (TBT)**: ≤ 600ms
- **Speed Index**: ≤ 4.3s
- **Time to Interactive (TTI)**: ≤ 7.3s

#### Desktop
- **First Contentful Paint (FCP)**: ≤ 1.5s
- **Largest Contentful Paint (LCP)**: ≤ 2.0s
- **Cumulative Layout Shift (CLS)**: ≤ 0.05
- **Total Blocking Time (TBT)**: ≤ 200ms
- **Speed Index**: ≤ 3.0s
- **Time to Interactive (TTI)**: ≤ 3.0s

### Standard Performance Budgets
- **Performance Score**: ≥ 80% (mobile), ≥ 90% (desktop)
- **Accessibility Score**: ≥ 90% (mobile), ≥ 95% (desktop)
- **Best Practices Score**: ≥ 80% (mobile), ≥ 90% (desktop)
- **SEO Score**: ≥ 80%

## PWA-Specific Checks

The configuration enforces these PWA requirements:

### Critical PWA Metrics (Error Level)
- **Installable Manifest**: Valid web app manifest
- **Maskable Icon**: Proper icon for adaptive UI
- **Offline Start URL**: Service worker serves start URL offline
- **Service Worker**: Registered and functional
- **Splash Screen**: Proper splash screen configuration
- **Themed Omnibox**: Theme color properly set
- **Viewport**: Proper meta viewport tag
- **Width**: Responsive design implementation
- **PWA Responsive**: Works across device sizes
- **Works Offline**: Core functionality available offline

### Important PWA Metrics (Warning Level)
- **Load Fast Enough for PWA**: Performance meets PWA standards
- **PWA Installable**: Meets installability criteria
- **PWA Optimized**: Follows PWA best practices
- **PWA Cross Browser**: Compatibility across browsers
- **PWA Each Page Has URL**: Proper routing for each view
- **PWA Full Page Metadata**: Complete page metadata
- **PWA Page Transitions**: Smooth navigation experience

## Accessibility Checks

### Critical Accessibility Requirements (Error Level)
- **ARIA Attributes**: Proper ARIA implementation
- **Button Names**: All buttons have accessible names
- **Document Title**: Each page has a descriptive title
- **HTML Lang**: Language attribute specified
- **Image Alt**: All images have alt text
- **Input Labels**: Form inputs have proper labels
- **Link Names**: All links have descriptive text
- **Meta Viewport**: Proper viewport configuration

### Important Accessibility Requirements (Warning Level)
- **Color Contrast**: Sufficient contrast ratios
- **Heading Order**: Proper heading hierarchy
- **List Structure**: Proper list markup
- **Tap Targets**: Adequate touch target sizes (44px minimum)

## SEO Checks

### Critical SEO Requirements (Error Level)
- **HTTP Status Code**: Proper 200 status for content pages
- **Is Crawlable**: Search engines can crawl the site
- **Lang**: HTML lang attribute present
- **Viewport**: Meta viewport tag present

### Important SEO Requirements (Warning Level)
- **Canonical**: Canonical URL specified
- **Font Size**: Readable font sizes (16px minimum)
- **Image Alt**: Images have descriptive alt text
- **Image Size Responsive**: Responsive images
- **Inline Link Text**: Descriptive link text
- **Meta Description**: Page descriptions present
- **Robots.txt**: Search engine instructions
- **Text Compression**: Gzip/Brotli compression enabled
- **Tap Targets**: Adequate touch target sizes

## Usage

### Installation

Install the required dependencies:

```bash
npm install --save-dev @lhci/cli lighthouse
```

### Running Tests

#### Full Lighthouse CI Suite
```bash
npm run test:lighthouse
```

#### Mobile-Only Testing
```bash
npm run test:lighthouse:mobile
```

#### Desktop-Only Testing
```bash
npm run test:lighthouse:desktop
```

#### PWA-Focused Testing
```bash
npm run test:lighthouse:pwa
```

#### Individual Operations
```bash
# Collect data only
npm run test:lighthouse:collect

# Assert against thresholds only
npm run test:lighthouse:assert

# Start Lighthouse CI server for viewing results
npm run test:lighthouse:server
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Build and Start Application
  run: |
    npm run build
    npm start &
  sleep 10

- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli@0.12.x
    lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Run Lighthouse Tests**:
   ```bash
   npm run test:lighthouse
   ```

3. **Review Results**:
   - Check terminal output for scores
   - Start server for detailed reports: `npm run test:lighthouse:server`
   - Visit `http://localhost:9009` for detailed reports

4. **Fix Issues**:
   - Address failed assertions
   - Re-run tests to verify improvements

## Output and Reports

### Report Locations
- **SQLite Database**: `./lighthouse-results.db`
- **Server**: `http://localhost:9009` (when running server)
- **Temporary Public Storage**: Default upload target

### Report Contents
- Performance metrics and Core Web Vitals
- Accessibility audit results
- PWA compliance status
- SEO optimization analysis
- Best practices evaluation
- Historical comparisons (when using database storage)

## Customization

### Adding New URLs
Update the `collect.url` array in the configuration:

```json
"url": [
  "http://localhost:3000/",
  "http://localhost:3000/new-page"
]
```

### Adjusting Thresholds
Modify the `assertions` values in the configuration:

```json
"assertions": {
  "categories:performance": ["warn", {"minScore": 0.85}]
}
```

### Custom Settings
Add custom Chrome flags or Lighthouse settings:

```json
"settings": {
  "chromeFlags": "--no-sandbox --headless --disable-dev-shm-usage",
  "preset": "desktop"
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the development server is running on port 3000
2. **Timeout Errors**: Increase timeout values or reduce the number of URLs
3. **Memory Issues**: Reduce `numberOfRuns` or run tests sequentially
4. **Chrome Sandbox Issues**: Use `--no-sandbox` flag (included in config)

### Debug Mode
Run with verbose output:

```bash
DEBUG=* npm run test:lighthouse
```

### Headless Mode Issues
If headless mode causes problems, run with visible browser:

```json
"settings": {
  "chromeFlags": "--no-sandbox --disable-dev-shm-usage"
}
```

## Best Practices

1. **Regular Testing**: Run tests regularly in CI/CD pipeline
2. **Performance Budgets**: Monitor budgets and prevent regressions
3. **Accessibility First**: Fix accessibility issues before merging
4. **PWA Compliance**: Ensure offline functionality works
5. **Mobile-First**: Prioritize mobile performance metrics
6. **Historical Tracking**: Use database storage to track trends

## Integration with Other Tools

### Playwright Integration
Combine with Playwright for comprehensive testing:

```bash
npm run test:e2e:playwright
npm run test:lighthouse
```

### Bundle Analysis
Use with Next.js bundle analyzer:

```bash
npm run analyze
npm run test:lighthouse
```

### Performance Monitoring
Set up regular performance monitoring with the Lighthouse CI server.

## References

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals](https://web.dev/vitals/)
- [PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)