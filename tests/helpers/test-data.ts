/**
 * Test data fixtures for OpenRelief E2E tests
 * 
 * This file contains sample data and utilities for creating
 * test data for emergency reports, users, and other entities.
 */

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
    name: 'Test Admin',
    role: 'admin',
  },
  responder: {
    email: 'responder@test.com',
    password: 'testpassword123',
    name: 'Test Responder',
    role: 'responder',
  },
  civilian: {
    email: 'civilian@test.com',
    password: 'testpassword123',
    name: 'Test Civilian',
    role: 'civilian',
  },
};

export const emergencyReports = {
  medical: {
    type: 'medical',
    description: 'Medical emergency requiring immediate assistance',
    severity: 'high',
    location: {
      lat: 37.7749,
      lng: -122.4194,
      address: '123 Test Street, San Francisco, CA',
    },
    contact: {
      name: 'John Doe',
      phone: '+1234567890',
    },
    timestamp: new Date().toISOString(),
  },
  fire: {
    type: 'fire',
    description: 'Building fire with people trapped inside',
    severity: 'critical',
    location: {
      lat: 37.7849,
      lng: -122.4094,
      address: '456 Fire Avenue, San Francisco, CA',
    },
    contact: {
      name: 'Jane Smith',
      phone: '+1234567891',
    },
    timestamp: new Date().toISOString(),
  },
  flood: {
    type: 'flood',
    description: 'Street flooding due to heavy rain',
    severity: 'medium',
    location: {
      lat: 37.7649,
      lng: -122.4294,
      address: '789 Water Road, San Francisco, CA',
    },
    contact: {
      name: 'Bob Johnson',
      phone: '+1234567892',
    },
    timestamp: new Date().toISOString(),
  },
  earthquake: {
    type: 'earthquake',
    description: 'Building collapse after earthquake',
    severity: 'critical',
    location: {
      lat: 37.7549,
      lng: -122.4394,
      address: '321 Ground Street, San Francisco, CA',
    },
    contact: {
      name: 'Alice Brown',
      phone: '+1234567893',
    },
    timestamp: new Date().toISOString(),
  },
  other: {
    type: 'other',
    description: 'Other type of emergency',
    severity: 'low',
    location: {
      lat: 37.7449,
      lng: -122.4494,
      address: '654 Other Lane, San Francisco, CA',
    },
    contact: {
      name: 'Charlie Wilson',
      phone: '+1234567894',
    },
    timestamp: new Date().toISOString(),
  },
};

export const locations = {
  sanFrancisco: {
    lat: 37.7749,
    lng: -122.4194,
    address: 'San Francisco, CA',
  },
  newYork: {
    lat: 40.7128,
    lng: -74.0060,
    address: 'New York, NY',
  },
  london: {
    lat: 51.5074,
    lng: -0.1278,
    address: 'London, UK',
  },
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    address: 'Tokyo, Japan',
  },
  sydney: {
    lat: -33.8688,
    lng: 151.2093,
    address: 'Sydney, Australia',
  },
};

export const emergencyContacts = {
  usa: [
    { name: 'Emergency Services', number: '911', type: 'emergency' },
    { name: 'Police Department', number: '311', type: 'police' },
    { name: 'Fire Department', number: '311', type: 'fire' },
    { name: 'Medical Services', number: '311', type: 'medical' },
  ],
  uk: [
    { name: 'Emergency Services', number: '999', type: 'emergency' },
    { name: 'Police Department', number: '101', type: 'police' },
    { name: 'Fire Department', number: '101', type: 'fire' },
    { name: 'Medical Services', number: '111', type: 'medical' },
  ],
  japan: [
    { name: 'Emergency Services', number: '119', type: 'emergency' },
    { name: 'Police Department', number: '110', type: 'police' },
    { name: 'Fire Department', number: '119', type: 'fire' },
    { name: 'Medical Services', number: '119', type: 'medical' },
  ],
};

export const testNotifications = {
  emergencyAlert: {
    title: 'Emergency Alert',
    body: 'New emergency reported in your area',
    icon: '/icons/emergency-alert.png',
    tag: 'emergency-alert',
    requireInteraction: true,
  },
  evacuationNotice: {
    title: 'Evacuation Notice',
    body: 'Evacuation ordered for your area',
    icon: '/icons/evacuation.png',
    tag: 'evacuation-notice',
    requireInteraction: true,
  },
  shelterUpdate: {
    title: 'Shelter Update',
    body: 'New shelter opened nearby',
    icon: '/icons/shelter.png',
    tag: 'shelter-update',
    requireInteraction: false,
  },
  systemStatus: {
    title: 'System Status',
    body: 'OpenRelief system is operational',
    icon: '/icons/system.png',
    tag: 'system-status',
    requireInteraction: false,
  },
};

/**
 * Generate a random emergency report for testing
 */
export function generateRandomEmergencyReport() {
  const types = Object.keys(emergencyReports);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const baseReport = emergencyReports[randomType as keyof typeof emergencyReports];
  
  return {
    ...baseReport,
    location: {
      ...baseReport.location,
      lat: baseReport.location.lat + (Math.random() - 0.5) * 0.01,
      lng: baseReport.location.lng + (Math.random() - 0.5) * 0.01,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate multiple emergency reports for testing
 */
export function generateEmergencyReports(count: number) {
  return Array.from({ length: count }, () => generateRandomEmergencyReport());
}

/**
 * Generate a random location for testing
 */
export function generateRandomLocation(centerLat: number, centerLng: number, radius: number = 0.01) {
  return {
    lat: centerLat + (Math.random() - 0.5) * radius * 2,
    lng: centerLng + (Math.random() - 0.5) * radius * 2,
    address: `Random Location ${Math.floor(Math.random() * 1000)}`,
  };
}

/**
 * Generate a random user for testing
 */
export function generateRandomUser() {
  const id = Math.floor(Math.random() * 10000);
  return {
    email: `testuser${id}@test.com`,
    password: 'testpassword123',
    name: `Test User ${id}`,
    role: 'civilian',
  };
}

/**
 * Generate test data for performance testing
 */
export function generatePerformanceTestData(size: 'small' | 'medium' | 'large') {
  const sizes = {
    small: 10,
    medium: 100,
    large: 1000,
  };
  
  return {
    emergencyReports: generateEmergencyReports(sizes[size]),
    users: Array.from({ length: sizes[size] }, () => generateRandomUser()),
    locations: Array.from({ length: sizes[size] }, (_, i) => 
      generateRandomLocation(37.7749, -122.4194, 0.1)
    ),
  };
}