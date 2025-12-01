# OpenRelief PWA Debugging Guide

## Issues Identified and Solutions Applied

### 1. Primary Issue: Hydration Mismatch ✅ FIXED

**Root Cause**: Browser extension interference (password managers/form fillers) injecting `data-sharkid` attributes into form elements during SSR, causing mismatch with client-side React.

**Solutions Applied**:
- Created `NoSSRProvider` component to prevent hydration mismatches
- Updated `useNetworkStatus` hook to use consistent server/client state initialization
- Wrapped application with NoSSRProvider in `Providers.tsx`

**Additional Debugging Steps**:
1. Test in incognito mode (extensions disabled) to confirm fix
2. Use React DevTools Profiler to identify hydration boundaries
3. Add `suppressHydrationWarning={true}` temporarily to see specific mismatches

### 2. PWA Precaching Failure ✅ FIXED

**Root Cause**: Missing `_next/app-build-manifest.json` file in precache manifest

**Solutions Applied**:
- Added `include: ['_next/app-build-manifest.json']` to PWA configuration
- Added NetworkFirst caching strategy for build manifest fallback
- Enhanced error handling for missing manifest files

**Verification**:
```bash
# Check if manifest is generated
ls -la .next/app-build-manifest.json

# Test service worker registration
npm run build && npm run start
# Open DevTools > Application > Service Workers > CacheStorage
```

### 3. API 404 Errors ✅ FIXED

**Root Cause**: Missing `/api/health` endpoint causing repeated failed requests

**Solutions Applied**:
- Created `/src/app/api/health/route.ts` with proper health check response
- Added appropriate cache headers for health endpoint
- Enhanced error handling in `useNetworkStatus` hook

**Health Endpoint Features**:
- Returns server status, uptime, environment info
- Proper cache control headers
- Error handling with appropriate status codes

### 4. Permissions-Policy Header Warning ✅ FIXED

**Root Cause**: Invalid `notifications` feature in Permissions-Policy header

**Solutions Applied**:
- Removed `notifications=(self)` from Permissions-Policy header
- Kept essential permissions: camera, microphone, geolocation

**Note**: Notifications are handled through Service Worker API, not Permissions-Policy

## Testing Strategy

### 1. Hydration Testing
```bash
# Test in different environments
npm run dev
# 1. Normal browser
# 2. Incognito mode
# 3. Mobile device
# 4. With extensions enabled/disabled
```

### 2. PWA Functionality Testing
```bash
# Build and test PWA features
npm run build
npm run start

# Test:
# - Service worker registration
# - Offline functionality
# - Install prompts
# - Cache behavior
```

### 3. Network Status Testing
```bash
# Test network status handling
# 1. Disconnect network
# 2. Reconnect network
# 3. Check health endpoint responses
# 4. Verify offline indicators
```

## Monitoring and Logging

### 1. Browser Console Monitoring
- Check for hydration warnings
- Monitor service worker registration
- Verify API responses
- Watch for permission errors

### 2. Network Tab Monitoring
- Health endpoint responses (should be 200)
- Service worker caching behavior
- Offline fallback requests
- PWA manifest loading

### 3. Application Tab Monitoring
- Service worker status
- Cache storage contents
- Manifest validation
- Push notification permissions

## Performance Considerations

### 1. Hydration Performance
- NoSSRProvider adds minimal overhead
- Client-side initialization is optimized
- State updates are batched

### 2. PWA Performance
- Build manifest is properly cached
- Network-first strategy for critical files
- Cache-first for static assets

### 3. Network Monitoring
- Health checks are throttled (30 seconds)
- Graceful degradation on failures
- Efficient state management

## Troubleshooting Checklist

### Before Deployment
- [ ] Test in multiple browsers
- [ ] Verify PWA installation
- [ ] Check offline functionality
- [ ] Validate service worker
- [ ] Test network scenarios

### After Deployment
- [ ] Monitor console errors
- [ ] Check service worker registration
- [ ] Verify API endpoints
- [ ] Test on mobile devices
- [ ] Validate caching behavior

## Common Issues and Solutions

### 1. Hydration Mismatches
**Issue**: Server/client HTML differences
**Solution**: Use NoSSRProvider, check for browser extensions

### 2. Service Worker Issues
**Issue**: Registration failures, caching problems
**Solution**: Check manifest paths, clear cache, verify headers

### 3. Network Status Problems
**Issue**: Incorrect online/offline detection
**Solution**: Verify health endpoint, check browser API support

### 4. PWA Installation Issues
**Issue**: Install prompts not showing
**Solution**: Check HTTPS, verify manifest, test on different devices

## Next Steps

1. **Monitor**: Set up error tracking and performance monitoring
2. **Test**: Comprehensive testing across devices and browsers
3. **Optimize**: Further performance improvements based on usage patterns
4. **Document**: Update user documentation with troubleshooting steps

## Emergency Rollback Plan

If issues persist after deployment:
1. Disable PWA features temporarily
2. Revert to basic network detection
3. Remove NoSSRProvider if needed
4. Clear service worker cache
5. Re-deploy with minimal changes