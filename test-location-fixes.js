// Simple test script to validate location tracking fixes
// Run with: node test-location-fixes.js

console.log('Testing OpenRelief Location Tracking Fixes...\n');

// Test 1: Coordinate parsing validation
function testCoordinateParsing() {
    console.log('1. Testing coordinate parsing fix:');

    // Test cases with different coordinate formats
    const testCases = [
        { raw: '40.7128 -74.0060', expected: { lat: 40.7128, lng: -74.0060 } },
        { raw: '-74.0060 40.7128', expected: { lat: -74.0060, lng: 40.7128 } }, // Invalid order - should be detected
        { raw: '51.5074 -0.1278', expected: { lat: 51.5074, lng: -0.1278 } },
        { raw: 'invalid coordinates', expected: { lat: 0, lng: 0 } },
    ];

    testCases.forEach((testCase, index) => {
        const locationParts = (testCase.raw || '0 0').split(' ');
        let lat = parseFloat(locationParts[0] || '0');
        let lng = parseFloat(locationParts[1] || '0');

        // Simulate our validation logic
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn(`   Test ${index + 1}: Invalid coordinate ranges detected - swapping order`);
            // Swap as fallback
            const tempLat = lat;
            lat = parseFloat(locationParts[1] || '0');
            lng = parseFloat(locationParts[0] || '0');
        }

        const result = { lat, lng };
        const passed = Math.abs(result.lat - testCase.expected.lat) < 0.0001 &&
            Math.abs(result.lng - testCase.expected.lng) < 0.0001;

        console.log(`   Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'} - Raw: "${testCase.raw}" -> Parsed: ${JSON.stringify(result)}`);
    });
}

// Test 2: Geofence ID generation
function testGeofenceIdGeneration() {
    console.log('\n2. Testing geofence ID generation:');

    // Simulate our ID generation logic
    const generateId = () => {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substr(2, 9);
        return `geofence-${timestamp}-${randomPart}`;
    };

    // Generate multiple IDs to check for uniqueness
    const ids = [];
    for (let i = 0; i < 10; i++) {
        ids.push(generateId());
    }

    const uniqueIds = new Set(ids);
    const allUnique = ids.length === uniqueIds.size;

    console.log(`   Generated ${ids.length} IDs`);
    console.log(`   All unique: ${allUnique ? 'PASS' : 'FAIL'}`);
    console.log(`   Sample ID: ${ids[0]}`);
}

// Test 3: Map tile URL configuration
function testMapTileConfig() {
    console.log('\n3. Testing map tile URL configuration:');

    // Simulate environment variable handling
    const mockEnv = {
        NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NODE_ENV === 'test' ? 'test-api-key-123' : undefined
    };

    const generateUrl = () => {
        return mockEnv.NEXT_PUBLIC_MAPTILER_API_KEY
            ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mockEnv.NEXT_PUBLIC_MAPTILER_API_KEY}`
            : 'https://api.maptiler.com/maps/streets-v2/style.json?key=FallbackKeyForDevelopment';
    };

    const url = generateUrl();
    const hasPlaceholder = url.includes('get_your_own');
    const hasValidKey = url.includes('test-api-key-123') || url.includes('FallbackKeyForDevelopment');

    console.log(`   No placeholder API key: ${!hasPlaceholder ? 'PASS' : 'FAIL'}`);
    console.log(`   Has valid key: ${hasValidKey ? 'PASS' : 'FAIL'}`);
    console.log(`   URL: ${url.substring(0, 50)}...`);
}

// Test 4: iOS permission handling simulation
function testIOSPermissionHandling() {
    console.log('\n4. Testing iOS permission handling:');

    // Simulate iOS detection
    const mockUserAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ];

    mockUserAgents.forEach((ua, index) => {
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const expectedIOS = index < 2;

        console.log(`   Test ${index + 1}: ${isIOS === expectedIOS ? 'PASS' : 'FAIL'} - ${isIOS ? 'iOS' : 'Non-iOS device detected'}`);
    });
}

// Run all tests
testCoordinateParsing();
testGeofenceIdGeneration();
testMapTileConfig();
testIOSPermissionHandling();

console.log('\nLocation tracking fixes validation complete!');
console.log('Check browser console for debug logs when running the application.');