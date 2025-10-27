/**
 * Advanced Application Bootstrap
 * Enterprise-grade application initialization with all advanced features
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../App.vue';

// Core Architecture
import ServiceContainer from './architecture/ServiceContainer';
import EventBus from './architecture/EventBus';
import StateManager from './architecture/StateManager';
import CacheManager from './architecture/CacheManager';
import Logger from './architecture/Logger';
import MetricsCollector from './architecture/MetricsCollector';
import ErrorHandler from './architecture/ErrorHandler';
import PerformanceMonitor from './architecture/PerformanceMonitor';
import SecurityManager from './architecture/SecurityManager';
import ConfigManager, { FeatureFlagsManager } from './architecture/ConfigManager';

// AI Integration
import AIManager from './ai/AIManager';

// Internationalization
import I18nManager from './i18n/I18nManager';

// Accessibility
import AccessibilityManager from './accessibility/AccessibilityManager';

// Types
import { 
  ServiceDefinition, 
  ConfigSchema, 
  I18nConfig, 
  AccessibilityConfig,
  SecurityPolicy 
} from './architecture/types';

export default class Application {
  private app: any;
  private services: ServiceContainer;
  private isInitialized = false;

  constructor() {
    this.services = new ServiceContainer();
    this.setupServices();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize core services
      await this.initializeCoreServices();
      
      // Initialize AI services
      await this.initializeAIServices();
      
      // Initialize i18n
      await this.initializeI18n();
      
      // Initialize accessibility
      await this.initializeAccessibility();
      
      // Initialize Vue app
      await this.initializeVueApp();
      
      // Initialize monitoring
      await this.initializeMonitoring();
      
      // Initialize security
      await this.initializeSecurity();
      
      this.isInitialized = true;
      
      const logger = this.services.get<Logger>('logger');
      logger.info('Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Get service instance
   */
  getService<T>(name: string): T {
    return this.services.get<T>(name);
  }

  /**
   * Get Vue app instance
   */
  getApp(): any {
    return this.app;
  }

  private setupServices(): void {
    // Register core services
    this.services.register('eventBus', new EventBus());
    this.services.register('logger', new Logger({
      level: 1, // INFO
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxStorageEntries: 1000,
      batchSize: 10,
      flushInterval: 5000,
      enablePerformance: true,
      enableUserTracking: true,
      sensitiveFields: ['password', 'token', 'key', 'secret']
    }));
    
    this.services.register('metrics', new MetricsCollector());
    this.services.register('errorHandler', new ErrorHandler(
      this.services.get<Logger>('logger'),
      this.services.get<MetricsCollector>('metrics')
    ));
    
    this.services.register('performanceMonitor', new PerformanceMonitor({
      enableMemoryMonitoring: true,
      enableRenderMonitoring: true,
      enableNetworkMonitoring: true,
      enableUserInteractionMonitoring: true,
      memoryThreshold: 100,
      renderThreshold: 16,
      networkThreshold: 1000,
      sampleRate: 0.1,
      reportInterval: 30000,
      enableRealUserMonitoring: true,
      enableCoreWebVitals: true
    }, this.services.get<Logger>('logger')));
    
    this.services.register('securityManager', new SecurityManager(
      this.services.get<Logger>('logger'),
      this.getSecurityPolicy()
    ));
    
    this.services.register('configManager', new ConfigManager(
      this.getConfigSchema(),
      this.services.get<Logger>('logger'),
      this.services.get<EventBus>('eventBus')
    ));
    
    this.services.register('featureFlags', new FeatureFlagsManager(
      this.services.get<Logger>('logger'),
      this.services.get<EventBus>('eventBus')
    ));
    
    this.services.register('stateManager', new StateManager());
    this.services.register('cacheManager', new CacheManager());
  }

  private async initializeCoreServices(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const errorHandler = this.services.get<ErrorHandler>('errorHandler');
    const performanceMonitor = this.services.get<PerformanceMonitor>('performanceMonitor');
    
    // Start performance monitoring
    performanceMonitor.start();
    
    // Setup global error handling
    this.setupGlobalErrorHandling();
    
    logger.info('Core services initialized');
  }

  private async initializeAIServices(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const errorHandler = this.services.get<ErrorHandler>('errorHandler');
    
    this.services.register('aiManager', new AIManager({
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      timeout: 30000,
      retryAttempts: 3,
      fallbackModel: 'gpt-3.5-turbo'
    }, logger, errorHandler));
    
    logger.info('AI services initialized');
  }

  private async initializeI18n(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const eventBus = this.services.get<EventBus>('eventBus');
    
    const i18nConfig: I18nConfig = {
      locale: 'en',
      fallbackLocale: 'en',
      messages: {
        en: {
          'app.title': 'Trackr - Your AI-Powered Career Co-Pilot',
          'app.description': 'Intelligent job search and application management',
          'common.save': 'Save',
          'common.cancel': 'Cancel',
          'common.loading': 'Loading...',
          'common.error': 'An error occurred',
          'common.success': 'Success!',
          'relative.seconds': '{{count}} second ago',
          'relative.minutes': '{{count}} minute ago',
          'relative.hours': '{{count}} hour ago',
          'relative.days': '{{count}} day ago'
        }
      }
    };
    
    this.services.register('i18n', new I18nManager(i18nConfig, logger, eventBus));
    
    logger.info('Internationalization initialized');
  }

  private async initializeAccessibility(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const eventBus = this.services.get<EventBus>('eventBus');
    
    const accessibilityConfig: AccessibilityConfig = {
      highContrast: false,
      reducedMotion: false,
      screenReader: true,
      keyboardNavigation: true,
      focusManagement: true
    };
    
    this.services.register('accessibility', new AccessibilityManager(
      accessibilityConfig, 
      logger, 
      eventBus
    ));
    
    logger.info('Accessibility features initialized');
  }

  private async initializeVueApp(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    
    // Create Vue app
    this.app = createApp(App);
    
    // Create Pinia store
    const pinia = createPinia();
    this.app.use(pinia);
    
    // Provide services to Vue app
    this.app.provide('services', this.services);
    
    // Mount the app
    this.app.mount('#app');
    
    logger.info('Vue application initialized');
  }

  private async initializeMonitoring(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const performanceMonitor = this.services.get<PerformanceMonitor>('performanceMonitor');
    
    // Setup performance alerts
    performanceMonitor.addAlertHandler((alert) => {
      logger.warn('Performance alert', { alert });
    });
    
    // Setup error monitoring
    const errorHandler = this.services.get<ErrorHandler>('errorHandler');
    errorHandler.addAlertHandler((report) => {
      logger.error('Error alert', { report });
    });
    
    logger.info('Monitoring initialized');
  }

  private async initializeSecurity(): Promise<void> {
    const logger = this.services.get<Logger>('logger');
    const securityManager = this.services.get<SecurityManager>('securityManager');
    
    // Setup security monitoring
    this.setupSecurityMonitoring();
    
    logger.info('Security initialized');
  }

  private setupGlobalErrorHandling(): void {
    const errorHandler = this.services.get<ErrorHandler>('errorHandler');
    
    // Global error handler
    window.addEventListener('error', (event) => {
      errorHandler.handleError(
        new Error(event.message),
        {
          component: 'Global',
          action: 'unhandled_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleError(
        new Error(event.reason),
        {
          component: 'Global',
          action: 'unhandled_promise_rejection'
        }
      );
    });
  }

  private setupSecurityMonitoring(): void {
    const securityManager = this.services.get<SecurityManager>('securityManager');
    const logger = this.services.get<Logger>('logger');
    
    // Monitor for suspicious activity
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('a[href^="javascript:"]') || 
          target.matches('a[href^="data:"]')) {
        securityManager.logSecurityEvent('Suspicious link clicked', {
          href: target.getAttribute('href'),
          target: target.tagName
        });
      }
    });
    
    // Monitor form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      
      // Check for potential XSS
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string' && this.containsSuspiciousContent(value)) {
          securityManager.logSecurityEvent('Potential XSS detected', {
            field: key,
            value: value.substring(0, 100)
          });
        }
      }
    });
  }

  private containsSuspiciousContent(value: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(value));
  }

  private getConfigSchema(): ConfigSchema {
    return {
      'ai.enabled': {
        type: 'boolean',
        default: true,
        required: true,
        description: 'Enable AI features'
      },
      'ai.model': {
        type: 'string',
        default: 'gpt-4',
        required: true,
        description: 'AI model to use'
      },
      'ai.temperature': {
        type: 'number',
        default: 0.7,
        required: true,
        validation: (value) => value >= 0 && value <= 2,
        description: 'AI temperature setting'
      },
      'ui.theme': {
        type: 'string',
        default: 'light',
        required: true,
        validation: (value) => ['light', 'dark', 'auto'].includes(value),
        description: 'UI theme'
      },
      'ui.language': {
        type: 'string',
        default: 'en',
        required: true,
        description: 'UI language'
      },
      'privacy.analytics': {
        type: 'boolean',
        default: true,
        required: true,
        description: 'Enable analytics'
      },
      'privacy.crashReporting': {
        type: 'boolean',
        default: true,
        required: true,
        description: 'Enable crash reporting'
      }
    };
  }

  private getSecurityPolicy(): SecurityPolicy {
    return {
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.openai.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com;",
      allowedOrigins: [
        'https://*.workday.com',
        'https://*.greenhouse.io',
        'https://*.lever.co',
        'https://*.dover.com',
        'https://api.openai.com'
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
      sanitizeInput: true,
      encryptSensitiveData: true
    };
  }
}

// Export singleton instance
export const app = new Application();
