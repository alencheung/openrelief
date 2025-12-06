# OpenRelief In-App Help System

## Table of Contents

1. [Overview](#overview)
2. [Help System Architecture](#help-system-architecture)
3. [Contextual Help Implementation](#contextual-help-implementation)
4. [Interactive Tutorials](#interactive-tutorials)
5. [Help Content Management](#help-content-management)
6. [User Assistance Features](#user-assistance-features)
7. [Emergency Help Protocols](#emergency-help-protocols)
8. [Accessibility in Help System](#accessibility-in-help-system)
9. [Analytics and Improvement](#analytics-and-improvement)
10. [Technical Implementation](#technical-implementation)

## Overview

### Purpose of In-App Help System

The OpenRelief in-app help system provides immediate, contextual assistance to users during emergencies when they need it most. This system ensures that:

- **Help is available instantly** without leaving the app
- **Assistance is contextually relevant** to the user's current task
- **Emergency guidance is accessible** during crisis situations
- **Users can self-serve** common issues and questions
- **Support load is reduced** through automated assistance

### Key Features

#### Instant Help Access
- **Question mark button** on every screen
- **Keyboard shortcut** (?) for immediate help
- **Voice command** "Help me" for hands-free assistance
- **Emergency help button** for critical situations

#### Contextual Assistance
- **Screen-specific help** based on current view
- **Task-oriented guidance** for user's current action
- **Progressive disclosure** of detailed information
- **Step-by-step tutorials** for complex processes

#### Multi-Modal Support
- **Text-based help** with clear instructions
- **Visual guides** with screenshots and diagrams
- **Video tutorials** for complex procedures
- **Audio instructions** for accessibility

## Help System Architecture

### System Components

#### Help Engine
```typescript
// Help system core
interface HelpEngine {
  // Help content management
  getHelpContent(context: HelpContext): Promise<HelpContent>;
  searchHelp(query: string): Promise<HelpResult[]>;
  trackHelpUsage(helpId: string, context: HelpContext): void;
  
  // Context awareness
  getCurrentContext(): HelpContext;
  registerContextProvider(provider: ContextProvider): void;
  
  // User assistance
  initiateInteractiveHelp(helpId: string): Promise<void>;
  scheduleHelpReminder(helpId: string, delay: number): void;
}
```

#### Content Management
```typescript
// Help content structure
interface HelpContent {
  id: string;
  title: string;
  content: HelpSection[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  lastUpdated: Date;
  emergencyRelevant: boolean;
}

interface HelpSection {
  type: 'text' | 'image' | 'video' | 'interactive';
  content: string | MediaContent;
  title?: string;
  description?: string;
}
```

#### Context Detection
```typescript
// Context awareness system
interface HelpContext {
  screen: string;
  task: string;
  userAction: string;
  emergencyType?: string;
  severity?: number;
  userRole: 'citizen' | 'responder' | 'coordinator';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  accessibilityMode: boolean;
}
```

### Data Flow Architecture

```
User Action → Context Detection → Help Engine → Content Retrieval → UI Display
     ↓              ↓                ↓              ↓
Usage Tracking → Analytics → Content Improvement → Help Updates
```

## Contextual Help Implementation

### Screen-Specific Help

#### Emergency Reporting Help
```typescript
// Emergency report contextual help
const emergencyReportHelp = {
  screen: 'emergency-report',
  topics: [
    {
      id: 'emergency-types',
      title: 'Understanding Emergency Types',
      content: [
        {
          type: 'text',
          content: 'Emergency types help categorize different situations for appropriate response...'
        },
        {
          type: 'image',
          content: '/help/emergency-types-guide.png',
          description: 'Visual guide to emergency types'
        }
      ],
      triggers: ['emergency-type-selection', 'user-hesitation']
    },
    {
      id: 'location-input',
      title: 'Setting Emergency Location',
      content: [
        {
          type: 'interactive',
          content: 'location-input-tutorial',
          description: 'Interactive tutorial for location input'
        }
      ],
      triggers: ['location-error', 'location-confusion']
    }
  ]
};
```

#### Map Navigation Help
```typescript
// Map navigation contextual help
const mapNavigationHelp = {
  screen: 'emergency-map',
  topics: [
    {
      id: 'map-controls',
      title: 'Map Navigation Controls',
      content: [
        {
          type: 'text',
          content: 'Use +/- buttons to zoom, arrow keys to pan...'
        },
        {
          type: 'video',
          content: '/help/map-navigation-tutorial.mp4',
          duration: 45
        }
      ],
      triggers: ['first-map-use', 'map-navigation-error']
    },
    {
      id: 'emergency-markers',
      title: 'Understanding Emergency Markers',
      content: [
        {
          type: 'image',
          content: '/help/emergency-markers-legend.png',
          description: 'Legend showing different emergency marker types'
        }
      ],
      triggers: ['marker-confusion', 'first-emergency-view']
    }
  ]
};
```

#### Trust System Help
```typescript
// Trust system contextual help
const trustSystemHelp = {
  screen: 'trust-score',
  topics: [
    {
      id: 'trust-explanation',
      title: 'How Trust Scores Work',
      content: [
        {
          type: 'text',
          content: 'Trust scores reflect your reliability in reporting accurate information...'
        },
        {
          type: 'interactive',
          content: 'trust-score-calculator',
          description: 'Interactive tool to understand trust score calculations'
        }
      ],
      triggers: ['trust-score-view', 'trust-score-change']
    },
    {
      id: 'improving-trust',
      title: 'Improving Your Trust Score',
      content: [
        {
          type: 'text',
          content: 'Build trust by reporting accurate emergencies...'
        }
      ],
      triggers: ['low-trust-score', 'trust-decrease']
    }
  ]
};
```

### Trigger-Based Help

#### Error Detection Help
```typescript
// Error-triggered help system
class ErrorHelpSystem {
  private helpEngine: HelpEngine;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.setupErrorListeners();
  }
  
  private setupErrorListeners() {
    // Listen for form validation errors
    document.addEventListener('validation-error', (event) => {
      this.handleValidationError(event.detail);
    });
    
    // Listen for API errors
    document.addEventListener('api-error', (event) => {
      this.handleApiError(event.detail);
    });
    
    // Listen for user confusion indicators
    document.addEventListener('user-confusion', (event) => {
      this.handleUserConfusion(event.detail);
    });
  }
  
  private handleValidationError(error: ValidationError) {
    const helpTopic = this.getHelpForValidationError(error);
    this.helpEngine.showContextualHelp(helpTopic);
  }
  
  private handleApiError(error: ApiError) {
    const helpTopic = this.getHelpForApiError(error);
    this.helpEngine.showContextualHelp(helpTopic);
  }
  
  private handleUserConfusion(context: UserContext) {
    const helpTopic = this.getHelpForContext(context);
    this.helpEngine.showContextualHelp(helpTopic);
  }
}
```

#### Behavioral Help Triggers
```typescript
// User behavior analysis for proactive help
class BehaviorAnalysis {
  private helpEngine: HelpEngine;
  private userActions: UserAction[] = [];
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.startBehaviorTracking();
  }
  
  private startBehaviorTracking() {
    // Track user hesitation
    this.trackHesitationPatterns();
    
    // Track repeated errors
    this.trackRepeatedErrors();
    
    // Track navigation confusion
    this.trackNavigationConfusion();
  }
  
  private trackHesitationPatterns() {
    // Detect when user spends too long on a task
    const hesitationTimer = setTimeout(() => {
      this.suggestHelp('task-hesitation');
    }, 30000); // 30 seconds
    
    // Clear timer on user action
    document.addEventListener('user-action', () => {
      clearTimeout(hesitationTimer);
    });
  }
  
  private trackRepeatedErrors() {
    // Track repeated validation errors
    let errorCount = 0;
    
    document.addEventListener('validation-error', () => {
      errorCount++;
      if (errorCount >= 3) {
        this.suggestHelp('repeated-errors');
        errorCount = 0;
      }
    });
  }
  
  private suggestHelp(reason: string) {
    const helpTopic = this.getHelpForBehavior(reason);
    this.helpEngine.showProactiveHelp(helpTopic);
  }
}
```

## Interactive Tutorials

### Tutorial Framework

#### Step-by-Step Guidance
```typescript
// Interactive tutorial system
class InteractiveTutorial {
  private steps: TutorialStep[];
  private currentStep: number = 0;
  private overlay: HTMLElement;
  
  constructor(steps: TutorialStep[]) {
    this.steps = steps;
    this.createOverlay();
  }
  
  start() {
    this.showOverlay();
    this.showStep(0);
    this.trackProgress();
  }
  
  private showStep(stepIndex: number) {
    const step = this.steps[stepIndex];
    
    // Highlight target elements
    step.elements.forEach(element => {
      this.highlightElement(element);
    });
    
    // Show step instructions
    this.showInstructions(step.instructions);
    
    // Enable step-specific interactions
    this.enableStepInteractions(step);
  }
  
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    } else {
      this.complete();
    }
  }
  
  complete() {
    this.hideOverlay();
    this.recordCompletion();
    this.suggestNextTutorial();
  }
}

interface TutorialStep {
  id: string;
  title: string;
  instructions: string;
  elements: ElementSelector[];
  interactions: InteractionType[];
  validation?: StepValidation;
}

interface ElementSelector {
  selector: string;
  highlightStyle: CSSStyleDeclaration;
  message?: string;
}
```

#### Emergency Reporting Tutorial
```typescript
// Emergency reporting interactive tutorial
const emergencyReportingTutorial = {
  id: 'emergency-reporting-first-time',
  title: 'How to Report an Emergency',
  estimatedTime: 5, // 5 minutes
  difficulty: 'beginner',
  steps: [
    {
      id: 'select-emergency-type',
      title: 'Select Emergency Type',
      instructions: 'Choose the type of emergency you want to report. Each type has specific response procedures.',
      elements: [
        {
          selector: '[data-testid="emergency-type-selector"]',
          highlightStyle: {
            border: '3px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)'
          },
          message: 'Click here to select emergency type'
        }
      ],
      interactions: ['click'],
      validation: {
        type: 'element-selected',
        selector: '[data-testid="emergency-type-selector"]'
      }
    },
    {
      id: 'provide-details',
      title: 'Provide Emergency Details',
      instructions: 'Fill in as much detail as possible about the emergency. Accurate information helps responders.',
      elements: [
        {
          selector: '[data-testid="emergency-title"]',
          highlightStyle: {
            border: '3px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)'
          }
        },
        {
          selector: '[data-testid="emergency-description"]',
          highlightStyle: {
            border: '3px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)'
          }
        }
      ],
      interactions: ['type', 'focus'],
      validation: {
        type: 'form-completed',
        requiredFields: ['title', 'description']
      }
    },
    {
      id: 'set-location',
      title: 'Set Emergency Location',
      instructions: 'Provide the exact location of the emergency. You can use the map or enter an address.',
      elements: [
        {
          selector: '[data-testid="location-input"]',
          highlightStyle: {
            border: '3px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)'
          }
        }
      ],
      interactions: ['click', 'type'],
      validation: {
        type: 'location-set',
        requiredFields: ['latitude', 'longitude']
      }
    },
    {
      id: 'submit-report',
      title: 'Submit Your Report',
      instructions: 'Review your information and submit the emergency report. Your report will be shared with nearby users and emergency services.',
      elements: [
        {
          selector: '[data-testid="submit-emergency"]',
          highlightStyle: {
            border: '3px solid #10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          },
          message: 'Click here to submit your emergency report'
        }
      ],
      interactions: ['click'],
      validation: {
        type: 'form-submitted'
      }
    }
  ]
};
```

#### Map Navigation Tutorial
```typescript
// Map navigation interactive tutorial
const mapNavigationTutorial = {
  id: 'map-navigation-basics',
  title: 'Using the Emergency Map',
  estimatedTime: 3,
  difficulty: 'beginner',
  steps: [
    {
      id: 'understand-markers',
      title: 'Understanding Emergency Markers',
      instructions: 'Different colored markers represent different types of emergencies. Red indicates critical situations.',
      elements: [
        {
          selector: '[data-testid="emergency-marker"]',
          highlightStyle: {
            border: '2px solid #ef4444',
            borderRadius: '50%'
          }
        }
      ],
      interactions: ['hover', 'click']
    },
    {
      id: 'zoom-controls',
      title: 'Zoom Controls',
      instructions: 'Use the + and - buttons to zoom in and out. You can also use mouse wheel or pinch gestures.',
      elements: [
        {
          selector: '[data-testid="zoom-in"]',
          highlightStyle: {
            border: '3px solid #2563eb'
          }
        },
        {
          selector: '[data-testid="zoom-out"]',
          highlightStyle: {
            border: '3px solid #2563eb'
          }
        }
      ],
      interactions: ['click']
    },
    {
      id: 'pan-navigation',
      title: 'Moving Around the Map',
      instructions: 'Use arrow keys or drag to move around the map. Double-click to center on a location.',
      elements: [
        {
          selector: '[data-testid="map-container"]',
          highlightStyle: {
            border: '3px dashed #2563eb'
          }
        }
      ],
      interactions: ['keydown', 'drag']
    }
  ]
};
```

### Progressive Disclosure

#### Help Layer System
```typescript
// Progressive help disclosure
class ProgressiveHelp {
  private helpContainer: HTMLElement;
  private currentLevel: number = 1;
  
  constructor() {
    this.createHelpContainer();
  }
  
  showBasicHelp() {
    this.showHelpLevel(1);
  }
  
  showDetailedHelp() {
    this.showHelpLevel(2);
  }
  
  showAdvancedHelp() {
    this.showHelpLevel(3);
  }
  
  private showHelpLevel(level: number) {
    const content = this.getHelpContent(level);
    this.helpContainer.innerHTML = content;
    this.currentLevel = level;
    
    // Update disclosure buttons
    this.updateDisclosureButtons(level);
  }
  
  private getHelpContent(level: number): string {
    switch (level) {
      case 1:
        return `
          <h3>Quick Help</h3>
          <p>Basic instructions for immediate assistance.</p>
          <button onclick="showDetailedHelp()">More Details</button>
        `;
      case 2:
        return `
          <h3>Detailed Help</h3>
          <p>Comprehensive instructions with examples.</p>
          <button onclick="showAdvancedHelp()">Advanced Options</button>
          <button onclick="showBasicHelp()">Back to Basic</button>
        `;
      case 3:
        return `
          <h3>Advanced Help</h3>
          <p>Technical details and expert guidance.</p>
          <button onclick="showBasicHelp()">Back to Basic</button>
        `;
    }
  }
}
```

## Help Content Management

### Content Structure

#### Help Database Schema
```sql
-- Help content database schema
CREATE TABLE help_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id VARCHAR(100) NOT NULL,
  topic_id VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content JSONB NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'beginner',
  estimated_read_time INTEGER DEFAULT 300, -- seconds
  emergency_relevant BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE help_context_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_topic_id UUID REFERENCES help_topics(id),
  trigger_type VARCHAR(50) NOT NULL,
  trigger_value VARCHAR(200),
  screen_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE help_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_topic_id UUID REFERENCES help_topics(id),
  user_id UUID REFERENCES auth.users(id),
  context JSONB,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_spent INTEGER, -- seconds
  was_helpful BOOLEAN,
  feedback TEXT
);

-- Indexes for performance
CREATE INDEX idx_help_topics_screen ON help_topics(screen_id, is_active);
CREATE INDEX idx_help_topics_priority ON help_topics(priority DESC);
CREATE INDEX idx_help_usage_topic ON help_usage_analytics(help_topic_id, accessed_at);
```

#### Content Management System
```typescript
// Help content management
class HelpContentManager {
  private database: DatabaseConnection;
  private cache: Map<string, HelpContent>;
  
  constructor(database: DatabaseConnection) {
    this.database = database;
    this.loadCache();
  }
  
  async getHelpContent(context: HelpContext): Promise<HelpContent> {
    const cacheKey = this.generateCacheKey(context);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const content = await this.database.query(`
      SELECT * FROM help_topics 
      WHERE screen_id = $1 AND is_active = true
      ORDER BY priority DESC
    `, [context.screen]);
    
    this.cache.set(cacheKey, content);
    return content;
  }
  
  async searchHelp(query: string): Promise<HelpResult[]> {
    const results = await this.database.query(`
      SELECT id, title, screen_id, difficulty, emergency_relevant,
             ts_rank_cd(to_tsvector('english'), plainto_tsquery('english', $1)) as rank
      FROM help_topics 
      WHERE to_tsvector('english') @@ plainto_tsquery('english', $1)
        AND is_active = true
      ORDER BY rank DESC
      LIMIT 10
    `, [query]);
    
    return results.map(row => ({
      id: row.id,
      title: row.title,
      screen: row.screen_id,
      relevance: row.rank,
      difficulty: row.difficulty,
      emergencyRelevant: row.emergency_relevant
    }));
  }
  
  async trackUsage(topicId: string, context: HelpContext, usage: HelpUsage): Promise<void> {
    await this.database.query(`
      INSERT INTO help_usage_analytics 
      (help_topic_id, user_id, context, time_spent, was_helpful, feedback)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [topicId, context.userId, JSON.stringify(context), usage.timeSpent, usage.wasHelpful, usage.feedback]);
    
    // Update help content popularity
    await this.updateTopicPopularity(topicId);
  }
  
  private async updateTopicPopularity(topicId: string): Promise<void> {
    await this.database.query(`
      UPDATE help_topics 
      SET priority = priority + 1 
      WHERE id = $1
    `, [topicId]);
    
    // Clear cache to force refresh
    this.cache.clear();
  }
}
```

### Multi-Language Support

#### Internationalized Help Content
```typescript
// Multi-language help system
class MultiLanguageHelp {
  private currentLanguage: string = 'en';
  private translations: Map<string, HelpContent>;
  
  constructor() {
    this.loadTranslations();
    this.detectUserLanguage();
  }
  
  private async loadTranslations() {
    const languages = ['en', 'es', 'fr', 'ar', 'zh'];
    
    for (const lang of languages) {
      const content = await import(`../help/translations/${lang}.json`);
      this.translations.set(lang, content.default);
    }
  }
  
  private detectUserLanguage() {
    // Detect from browser settings
    const browserLang = navigator.language.split('-')[0];
    
    // Check if translation exists
    if (this.translations.has(browserLang)) {
      this.currentLanguage = browserLang;
    }
    
    // Allow manual language selection
    this.setupLanguageSelector();
  }
  
  getHelpContent(topicId: string): HelpContent {
    const content = this.translations.get(this.currentLanguage);
    return content?.topics[topicId] || this.getFallbackContent(topicId);
  }
  
  private getFallbackContent(topicId: string): HelpContent {
    // Return English content as fallback
    const englishContent = this.translations.get('en');
    return englishContent?.topics[topicId];
  }
}
```

## User Assistance Features

### Help Delivery Methods

#### Help Button System
```typescript
// Help button implementation
class HelpButtonSystem {
  private helpButtons: Map<string, HTMLElement> = new Map();
  private helpEngine: HelpEngine;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.createGlobalHelpButton();
    this.createContextualHelpButtons();
  }
  
  private createGlobalHelpButton() {
    const button = document.createElement('button');
    button.innerHTML = '?';
    button.setAttribute('aria-label', 'Get Help');
    button.setAttribute('data-testid', 'global-help-button');
    button.className = 'help-button global-help';
    
    button.addEventListener('click', () => {
      this.showHelpMenu();
    });
    
    // Position button
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    
    document.body.appendChild(button);
    this.helpButtons.set('global', button);
  }
  
  private createContextualHelpButtons() {
    // Add help buttons to relevant UI elements
    const helpElements = document.querySelectorAll('[data-help-topic]');
    
    helpElements.forEach(element => {
      const topic = element.getAttribute('data-help-topic');
      const button = this.createHelpButton(topic, element);
      
      element.appendChild(button);
      this.helpButtons.set(topic, button);
    });
  }
  
  private createHelpButton(topic: string, targetElement: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.innerHTML = '?';
    button.setAttribute('aria-label', `Get help for ${topic}`);
    button.className = 'help-button contextual-help';
    
    button.addEventListener('click', () => {
      this.showTopicHelp(topic, targetElement);
    });
    
    return button;
  }
  
  private showTopicHelp(topic: string, targetElement: HTMLElement) {
    const context = this.buildContext(targetElement);
    this.helpEngine.showContextualHelp(topic, context);
  }
}
```

#### Voice Help System
```typescript
// Voice-activated help
class VoiceHelpSystem {
  private recognition: SpeechRecognition;
  private helpEngine: HelpEngine;
  private isActive = false;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.setupVoiceRecognition();
  }
  
  private setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        this.handleVoiceCommand(event);
      };
      
      this.recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
      };
    }
  }
  
  private handleVoiceCommand(event: SpeechRecognitionEvent) {
    const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
    
    if (command.includes('help')) {
      this.toggleHelp();
    } else if (command.includes('emergency')) {
      this.showEmergencyHelp();
    } else if (command.includes('tutorial')) {
      this.startInteractiveTutorial();
    }
  }
  
  private toggleHelp() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      this.helpEngine.showHelpMenu();
      this.acknowledgeActivation('Help system activated');
    } else {
      this.helpEngine.hideHelp();
      this.acknowledgeActivation('Help system deactivated');
    }
  }
  
  private acknowledgeActivation(message: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      speechSynthesis.speak(utterance);
    }
  }
}
```

#### Emergency Help Protocol
```typescript
// Emergency-specific help system
class EmergencyHelpProtocol {
  private helpEngine: HelpEngine;
  private emergencyContacts: EmergencyContact[];
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.loadEmergencyContacts();
    this.setupEmergencyHelp();
  }
  
  private setupEmergencyHelp() {
    // Create emergency help button
    const emergencyButton = document.createElement('button');
    emergencyButton.innerHTML = '🆘 Emergency Help';
    emergencyButton.className = 'emergency-help-button';
    emergencyButton.setAttribute('data-testid', 'emergency-help-button');
    
    emergencyButton.addEventListener('click', () => {
      this.showEmergencyHelp();
    });
    
    // Add to prominent position
    const header = document.querySelector('[data-testid="main-header"]');
    if (header) {
      header.appendChild(emergencyButton);
    }
  }
  
  private showEmergencyHelp() {
    const emergencyHelp = {
      screen: 'emergency-assistance',
      priority: 'critical',
      topics: [
        {
          id: 'emergency-contacts',
          title: 'Emergency Contacts',
          content: this.getEmergencyContactsContent(),
          emergencyRelevant: true
        },
        {
          id: 'immediate-actions',
          title: 'Immediate Safety Actions',
          content: this.getImmediateActionsContent(),
          emergencyRelevant: true
        },
        {
          id: 'emergency-procedures',
          title: 'Emergency Procedures',
          content: this.getEmergencyProceduresContent(),
          emergencyRelevant: true
        }
      ]
    };
    
    this.helpEngine.showEmergencyHelp(emergencyHelp);
  }
  
  private getEmergencyContactsContent(): HelpSection[] {
    return [
      {
        type: 'text',
        content: 'In life-threatening emergencies, call your local emergency services immediately:'
      },
      {
        type: 'list',
        content: this.emergencyContacts.map(contact => 
          `${contact.type}: ${contact.number}`
        ).join('\n')
      }
    ];
  }
}
```

## Emergency Help Protocols

### Crisis Mode Help

#### Emergency Help Activation
```typescript
// Emergency help activation system
class EmergencyHelpActivation {
  private isEmergencyMode = false;
  private helpEngine: HelpEngine;
  private emergencyHelpContent: EmergencyHelpContent;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.emergencyHelpContent = new EmergencyHelpContent();
    this.setupEmergencyDetection();
  }
  
  private setupEmergencyDetection() {
    // Detect emergency keywords in user input
    document.addEventListener('input', (event) => {
      const input = (event.target as HTMLInputElement).value.toLowerCase();
      
      const emergencyKeywords = [
        'help emergency', 'emergency help', 'crisis', 
        'danger', 'life threatening', '911', '112'
      ];
      
      const hasEmergencyKeyword = emergencyKeywords.some(keyword => 
        input.includes(keyword)
      );
      
      if (hasEmergencyKeyword) {
        this.activateEmergencyMode();
      }
    });
    
    // Detect panic button patterns
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.hasAttribute('data-emergency-trigger')) {
        this.activateEmergencyMode();
      }
    });
  }
  
  private activateEmergencyMode() {
    this.isEmergencyMode = true;
    
    // Simplify UI for emergency situations
    this.simplifyInterface();
    
    // Show emergency help immediately
    this.emergencyHelpContent.showEmergencyProcedures();
    
    // Notify emergency services if configured
    this.notifyEmergencyServices();
  }
  
  private simplifyInterface() {
    // Remove non-essential UI elements
    const nonEssential = document.querySelectorAll(
      '[data-non-essential="true"]'
    );
    
    nonEssential.forEach(element => {
      element.style.display = 'none';
    });
    
    // Increase contrast and size
    document.body.classList.add('emergency-mode');
    
    // Focus on essential emergency functions
    const essentialElements = document.querySelectorAll(
      '[data-essential="emergency"]'
    );
    
    essentialElements.forEach(element => {
      element.classList.add('emergency-focused');
    });
  }
}
```

#### Emergency Help Content
```typescript
// Emergency-specific help content
class EmergencyHelpContent {
  private helpEngine: HelpEngine;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
  }
  
  showEmergencyProcedures() {
    const emergencyProcedures = {
      screen: 'emergency-procedures',
      topics: [
        {
          id: 'fire-emergency',
          title: 'Fire Emergency Procedures',
          content: [
            {
              type: 'text',
              content: 'If you see a fire:'
            },
            {
              type: 'list',
              content: [
                '1. Evacuate immediately if ordered to do so',
                '2. Feel doors before opening - if hot, find another exit',
                '3. Stay low to avoid smoke inhalation',
                '4. Call emergency services from a safe location',
                '5. Never re-enter a burning building'
              ]
            },
            {
              type: 'video',
              content: '/emergency/fire-safety.mp4',
              duration: 120
            }
          ],
          priority: 1,
          emergencyRelevant: true
        },
        {
          id: 'medical-emergency',
          title: 'Medical Emergency Procedures',
          content: [
            {
              type: 'text',
              content: 'For medical emergencies:'
            },
            {
              type: 'list',
              content: [
                '1. Call emergency services immediately',
                '2. Provide clear information about location and situation',
                '3. Follow operator instructions',
                '4. Do not move injured person unless necessary',
                '5. Stay on the line until told to hang up'
              ]
            }
          ],
          priority: 1,
          emergencyRelevant: true
        },
        {
          id: 'earthquake-safety',
          title: 'Earthquake Safety Procedures',
          content: [
            {
              type: 'text',
              content: 'During an earthquake:'
            },
            {
              type: 'list',
              content: [
                '1. Drop, Cover, and Hold On',
                '2. Stay away from windows and heavy objects',
                '3. If indoors, stay indoors',
                '4. If outdoors, move to open area away from buildings',
                '5. After shaking stops, check for injuries'
              ]
            }
          ],
          priority: 1,
          emergencyRelevant: true
        }
      ]
    };
    
    this.helpEngine.showEmergencyHelp(emergencyProcedures);
  }
}
```

### Accessibility in Emergency Help

#### Screen Reader Emergency Help
```typescript
// Screen reader emergency help
class ScreenReaderEmergencyHelp {
  private helpEngine: HelpEngine;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.setupScreenReaderEmergencyHelp();
  }
  
  private setupScreenReaderEmergencyHelp() {
    // Create emergency help region
    const emergencyRegion = document.createElement('div');
    emergencyRegion.setAttribute('role', 'region');
    emergencyRegion.setAttribute('aria-live', 'assertive');
    emergencyRegion.setAttribute('aria-label', 'Emergency Assistance');
    emergencyRegion.id = 'emergency-help-region';
    
    // Add to page
    document.body.appendChild(emergencyRegion);
    
    // Listen for emergency activation
    document.addEventListener('emergency-mode-activated', () => {
      this.announceEmergencyHelp();
    });
  }
  
  private announceEmergencyHelp() {
    const region = document.getElementById('emergency-help-region');
    
    const emergencyMessage = `
      Emergency assistance activated. 
      Emergency procedures are now available. 
      Use screen reader shortcuts for quick access to emergency information.
      Press Alt+E for emergency contacts.
      Press Alt+S for safety procedures.
      Press Alt+H for immediate help.
    `;
    
    region.textContent = emergencyMessage;
  }
}
```

## Accessibility in Help System

### Help System Accessibility

#### Screen Reader Support
```typescript
// Accessible help system
class AccessibleHelpSystem {
  private helpEngine: HelpEngine;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.setupAccessibilityFeatures();
  }
  
  private setupAccessibilityFeatures() {
    this.setupScreenReaderSupport();
    this.setupKeyboardNavigation();
    this.setupHighContrastMode();
    this.setupVoiceControl();
  }
  
  private setupScreenReaderSupport() {
    // Ensure all help content is screen reader friendly
    const helpContent = document.querySelector('[data-help-content]');
    
    if (helpContent) {
      // Add proper ARIA labels
      helpContent.setAttribute('role', 'main');
      helpContent.setAttribute('aria-label', 'Help Content');
      
      // Ensure proper heading structure
      this.addSemanticStructure(helpContent);
      
      // Announce help content changes
      this.setupLiveRegions(helpContent);
    }
  }
  
  private setupKeyboardNavigation() {
    // Make help system fully keyboard accessible
    document.addEventListener('keydown', (event) => {
      this.handleHelpKeyboardNavigation(event);
    });
  }
  
  private handleHelpKeyboardNavigation(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        this.helpEngine.hideHelp();
        break;
      case 'Tab':
        this.navigateHelpContent(event.shiftKey ? -1 : 1);
        break;
      case 'Enter':
        this.activateHelpItem();
        break;
      case 'ArrowUp':
        this.navigateHelpSections(-1);
        break;
      case 'ArrowDown':
        this.navigateHelpSections(1);
        break;
    }
  }
}
```

#### High Contrast Mode
```css
/* High contrast help system */
.emergency-help-mode {
  /* High contrast colors */
  --help-bg: #000000;
  --help-text: #ffffff;
  --help-accent: #ffff00;
  --help-border: #ffffff;
}

.help-container {
  background-color: var(--help-bg);
  color: var(--help-text);
  border: 2px solid var(--help-border);
}

.help-button {
  background-color: var(--help-accent);
  color: var(--help-bg);
  border: 2px solid var(--help-border);
}

/* Emergency mode specific styles */
.emergency-help-mode .help-content {
  font-size: 1.2em;
  font-weight: bold;
  line-height: 1.5;
}

.emergency-help-mode .help-button {
  min-width: 44px;
  min-height: 44px;
  font-size: 1.1em;
}
```

#### Voice Control Integration
```typescript
// Voice-controlled help system
class VoiceControlledHelp {
  private helpEngine: HelpEngine;
  private voiceRecognition: SpeechRecognition;
  
  constructor(helpEngine: HelpEngine) {
    this.helpEngine = helpEngine;
    this.setupVoiceControl();
  }
  
  private setupVoiceControl() {
    if ('webkitSpeechRecognition' in window) {
      this.voiceRecognition = new (window as any).webkitSpeechRecognition();
      this.voiceRecognition.continuous = true;
      this.voiceRecognition.interimResults = false;
      
      this.voiceRecognition.onresult = (event) => {
        this.handleVoiceCommand(event);
      };
    }
  }
  
  private handleVoiceCommand(event: SpeechRecognitionEvent) {
    const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
    
    // Help-specific voice commands
    if (command.includes('help me') || command.includes('show help')) {
      this.helpEngine.showHelpMenu();
    } else if (command.includes('close help')) {
      this.helpEngine.hideHelp();
    } else if (command.includes('emergency help')) {
      this.helpEngine.showEmergencyHelp();
    } else if (command.includes('search help')) {
      const query = command.replace('search help', '').trim();
      this.helpEngine.searchHelp(query);
    }
  }
}
```

## Analytics and Improvement

### Help Usage Analytics

#### Tracking System
```typescript
// Help analytics system
class HelpAnalytics {
  private analytics: AnalyticsService;
  private usageData: HelpUsageData[] = [];
  
  constructor(analyticsService: AnalyticsService) {
    this.analytics = analyticsService;
    this.setupTracking();
  }
  
  private setupTracking() {
    // Track help topic views
    document.addEventListener('help-topic-viewed', (event) => {
      this.trackTopicView(event.detail);
    });
    
    // Track help search queries
    document.addEventListener('help-search', (event) => {
      this.trackSearch(event.detail);
    });
    
    // Track tutorial completions
    document.addEventListener('tutorial-completed', (event) => {
      this.trackTutorialCompletion(event.detail);
    });
    
    // Track help effectiveness
    document.addEventListener('help-feedback', (event) => {
      this.trackHelpFeedback(event.detail);
    });
  }
  
  private trackTopicView(data: HelpTopicViewData) {
    this.analytics.track('help_topic_viewed', {
      topicId: data.topicId,
      screen: data.screen,
      context: data.context,
      timestamp: new Date().toISOString()
    });
  }
  
  private trackSearch(data: HelpSearchData) {
    this.analytics.track('help_search', {
      query: data.query,
      resultsCount: data.resultsCount,
      selectedResult: data.selectedResult,
      timestamp: new Date().toISOString()
    });
  }
  
  generateHelpEffectivenessReport(): HelpEffectivenessReport {
    const report = {
      mostViewedTopics: this.getMostViewedTopics(),
      searchSuccessRate: this.getSearchSuccessRate(),
      tutorialCompletionRate: this.getTutorialCompletionRate(),
      userSatisfactionScore: this.getUserSatisfactionScore(),
      improvementSuggestions: this.generateImprovementSuggestions()
    };
    
    return report;
  }
}
```

#### Help Content Optimization

#### Content Performance Analysis
```typescript
// Help content optimization
class HelpContentOptimizer {
  private helpEngine: HelpEngine;
  private analytics: HelpAnalytics;
  
  constructor(helpEngine: HelpEngine, analytics: HelpAnalytics) {
    this.helpEngine = helpEngine;
    this.analytics = analytics;
  }
  
  async optimizeHelpContent() {
    const report = this.analytics.generateHelpEffectivenessReport();
    
    // Identify underperforming content
    const underperformingTopics = this.identifyUnderperformingTopics(report);
    
    // Suggest improvements
    for (const topic of underperformingTopics) {
      const suggestions = await this.generateContentImprovements(topic);
      await this.implementContentImprovements(topic, suggestions);
    }
  }
  
  private identifyUnderperformingTopics(report: HelpEffectivenessReport): string[] {
    const underperforming = [];
    
    // Topics with low view rates
    report.mostViewedTopics.forEach(topic => {
      if (topic.viewRate < 0.1) { // Less than 10% of users view
        underperforming.push(topic.id);
      }
    });
    
    // Topics with low satisfaction
    if (report.userSatisfactionScore < 3.0) { // On 1-5 scale
      underperforming.push(...this.getLowSatisfactionTopics());
    }
    
    return [...new Set(underperforming)]; // Remove duplicates
  }
  
  private async generateContentImprovements(topicId: string): Promise<ContentImprovement[]> {
    const topic = await this.helpEngine.getHelpTopic(topicId);
    const improvements = [];
    
    // Check content clarity
    if (topic.averageReadTime > topic.estimatedReadTime * 2) {
      improvements.push({
        type: 'clarity',
        suggestion: 'Content appears unclear - simplify language and structure',
        priority: 'high'
      });
    }
    
    // Check searchability
    if (topic.searchFailRate > 0.5) {
      improvements.push({
        type: 'searchability',
        suggestion: 'Topic not found in searches - improve keywords and synonyms',
        priority: 'medium'
      });
    }
    
    return improvements;
  }
}
```

## Technical Implementation

### Frontend Implementation

#### React Components
```typescript
// Help system React components
import React, { useState, useEffect, useCallback } from 'react';
import { HelpEngine, HelpContext } from '../help';

interface HelpButtonProps {
  topicId?: string;
  className?: string;
  children?: React.ReactNode;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  topicId,
  className,
  children
}) => {
  const { showHelp, hideHelp } = React.useContext(HelpContext);
  const [isVisible, setIsVisible] = useState(false);
  
  const handleClick = useCallback(() => {
    if (topicId) {
      showHelp(topicId);
    } else {
      showHelp();
    }
    setIsVisible(true);
  }, [showHelp, topicId]);
  
  return (
    <button
      className={`help-button ${className || ''}`}
      onClick={handleClick}
      aria-label={children ? `Help for ${children}` : 'Get help'}
      data-testid={topicId ? `help-button-${topicId}` : 'help-button'}
    >
      {children || '?'}
    </button>
  );
};

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  topicId?: string;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({
  isOpen,
  onClose,
  topicId
}) => {
  const [content, setContent] = useState<HelpContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen && topicId) {
      loadHelpContent(topicId);
    }
  }, [isOpen, topicId]);
  
  const loadHelpContent = async (id: string) => {
    try {
      const helpContent = await fetchHelpContent(id);
      setContent(helpContent);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load help content:', error);
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="help-overlay" data-testid="help-overlay">
      <div className="help-overlay-backdrop" onClick={onClose} />
      <div className="help-overlay-content">
        <div className="help-overlay-header">
          <h2>Help</h2>
          <button
            className="help-close-button"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        </div>
        
        <div className="help-overlay-body">
          {isLoading ? (
            <div className="help-loading">Loading help content...</div>
          ) : content ? (
            <HelpContentRenderer content={content} />
          ) : (
            <div className="help-error">
              Failed to load help content. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### Help Context Provider
```typescript
// Help system context provider
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface HelpContextValue {
  showHelp: (topicId?: string) => void;
  hideHelp: () => void;
  isHelpVisible: boolean;
  currentTopic: string | null;
}

const HelpContext = createContext<HelpContextValue | null>(null);

interface HelpState {
  isVisible: boolean;
  currentTopic: string | null;
}

type HelpAction = 
  | { type: 'SHOW_HELP'; payload: string | undefined }
  | { type: 'HIDE_HELP' };

const helpReducer = (state: HelpState, action: HelpAction): HelpState => {
  switch (action.type) {
    case 'SHOW_HELP':
      return {
        isVisible: true,
        currentTopic: action.payload
      };
    case 'HIDE_HELP':
      return {
        isVisible: false,
        currentTopic: null
      };
    default:
      return state;
  }
};

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(helpReducer, {
    isVisible: false,
    currentTopic: null
  });
  
  const showHelp = useCallback((topicId?: string) => {
    dispatch({ type: 'SHOW_HELP', payload: topicId });
  }, []);
  
  const hideHelp = useCallback(() => {
    dispatch({ type: 'HIDE_HELP' });
  }, []);
  
  const contextValue: HelpContextValue = {
    showHelp,
    hideHelp,
    isHelpVisible: state.isVisible,
    currentTopic: state.currentTopic
  };
  
  return (
    <HelpContext.Provider value={contextValue}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};
```

### Backend Implementation

#### Help API Endpoints
```typescript
// Help system API endpoints
import { Router } from 'express';

const helpRouter = Router();

// Get help content by topic
helpRouter.get('/topics/:topicId', async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const userId = req.user?.id;
    const context = {
      screen: req.query.screen as string,
      emergencyType: req.query.emergencyType as string
    };
    
    const content = await helpService.getHelpContent(topicId, userId, context);
    
    // Track usage
    await helpService.trackUsage(topicId, userId, context);
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search help content
helpRouter.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const userId = req.user?.id;
    
    const results = await helpService.searchHelp(query, userId);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit help feedback
helpRouter.post('/feedback', async (req, res) => {
  try {
    const { topicId, wasHelpful, feedback } = req.body;
    const userId = req.user?.id;
    
    await helpService.recordFeedback(topicId, userId, wasHelpful, feedback);
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default helpRouter;
```

#### Help Service Implementation
```typescript
// Help service backend implementation
class HelpService {
  private database: DatabaseConnection;
  private cache: Map<string, HelpContent>;
  
  constructor(database: DatabaseConnection) {
    this.database = database;
    this.cache = new Map();
  }
  
  async getHelpContent(
    topicId: string, 
    userId?: string, 
    context?: HelpContext
  ): Promise<HelpContent> {
    // Check cache first
    const cacheKey = `${topicId}:${userId || 'anonymous'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Query database
    const result = await this.database.query(`
      SELECT ht.*, 
             CASE WHEN uh.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked
      FROM help_topics ht
      LEFT JOIN user_help_bookmarks uh ON ht.id = uh.help_topic_id AND uh.user_id = $1
      WHERE ht.id = $2 AND ht.is_active = true
    `, [userId, topicId]);
    
    const content = result.rows[0] ? this.formatHelpContent(result.rows[0]) : null;
    
    if (content) {
      this.cache.set(cacheKey, content);
    }
    
    return content;
  }
  
  async searchHelp(query: string, userId?: string): Promise<HelpResult[]> {
    const results = await this.database.query(`
      SELECT id, title, screen_id, difficulty, emergency_relevant,
             ts_rank_cd(to_tsvector('english'), plainto_tsquery('english', $1)) as rank,
             similarity(to_tsvector('english'), plainto_tsquery('english', $1)) as similarity
      FROM help_topics 
      WHERE to_tsvector('english') @@ plainto_tsquery('english', $1)
        AND is_active = true
      ORDER BY rank DESC, similarity DESC
      LIMIT 10
    `, [query]);
    
    return results.rows.map(row => ({
      id: row.id,
      title: row.title,
      screen: row.screen_id,
      relevance: row.rank,
      difficulty: row.difficulty,
      emergencyRelevant: row.emergency_relevant
    }));
  }
  
  async trackUsage(
    topicId: string, 
    userId?: string, 
    context?: HelpContext
  ): Promise<void> {
    await this.database.query(`
      INSERT INTO help_usage_analytics 
      (help_topic_id, user_id, context, accessed_at)
      VALUES ($1, $2, $3, NOW())
    `, [topicId, userId, JSON.stringify(context)]);
    
    // Update topic popularity
    await this.database.query(`
      UPDATE help_topics 
      SET priority = priority + 1 
      WHERE id = $1
    `, [topicId]);
  }
  
  private formatHelpContent(row: any): HelpContent {
    return {
      id: row.id,
      title: row.title,
      content: JSON.parse(row.content),
      difficulty: row.difficulty,
      estimatedReadTime: row.estimated_read_time,
      emergencyRelevant: row.emergency_relevant,
      isBookmarked: row.is_bookmarked,
      lastUpdated: new Date(row.updated_at)
    };
  }
}
```

---

This in-app help system documentation provides comprehensive guidance for implementing contextual help within the OpenRelief application. For additional technical support or questions about implementation, please contact the development team.

Remember: In emergency situations, clear and accessible help can be life-saving. Ensure your help system is thoroughly tested and optimized for crisis scenarios.