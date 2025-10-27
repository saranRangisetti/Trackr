/**
 * Enterprise Type Definitions
 * Comprehensive type system for type safety and maintainability
 */

export interface ServiceDefinition {
  name: string;
  instance: any;
  dependencies: string[];
  singleton: boolean;
  factory?: () => any;
}

export interface ServiceContainer {
  register<T>(name: string, service: T, dependencies?: string[]): void;
  get<T>(name: string): T;
  has(name: string): boolean;
  remove(name: string): void;
  clear(): void;
}

export interface EventHandler {
  (payload: any): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once?: boolean;
  priority?: number;
}

export interface StateSnapshot {
  timestamp: number;
  data: Record<string, any>;
  version: string;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: number;
  context: Record<string, any>;
  stack?: string;
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition: (error: Error) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface SecurityPolicy {
  csp: string;
  allowedOrigins: string[];
  maxFileSize: number;
  allowedFileTypes: string[];
  sanitizeInput: boolean;
  encryptSensitiveData: boolean;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  renderTime: number;
  networkLatency: number;
  errorRate: number;
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default: any;
    required: boolean;
    validation?: (value: any) => boolean;
    description: string;
  };
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions: Record<string, any>;
  description: string;
}

export interface Command<T = any, R = any> {
  execute(payload: T): Promise<R>;
  canExecute(payload: T): boolean;
  undo?(payload: T): Promise<void>;
}

export interface Observer<T = any> {
  update(data: T): void;
  getId(): string;
}

export interface Strategy<T = any, R = any> {
  execute(context: T): R;
  getName(): string;
  canHandle(context: T): boolean;
}

export interface Factory<T = any> {
  create(config: any): T;
  getType(): string;
  validate(config: any): boolean;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  userAgent: string;
  url: string;
  stack?: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'url' | 'number' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

export interface SanitizationRule {
  field: string;
  type: 'html' | 'sql' | 'xss' | 'path' | 'custom';
  options?: Record<string, any>;
  customSanitizer?: (value: any) => any;
}

export interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
  };
  external: number;
  arrayBuffers: number;
}

export interface DebounceConfig {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface I18nConfig {
  locale: string;
  fallbackLocale: string;
  messages: Record<string, Record<string, string>>;
  pluralizationRules?: Record<string, (n: number) => number>;
}

export interface AccessibilityConfig {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusManagement: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  ipAddress?: string;
  userAgent: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'error';
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: number;
  lastActive: number;
  status: 'active' | 'inactive' | 'suspended';
}

export interface ComplianceConfig {
  gdpr: boolean;
  ccpa: boolean;
  sox: boolean;
  hipaa: boolean;
  dataRetentionDays: number;
  auditLogging: boolean;
  encryptionRequired: boolean;
}

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
  retryAttempts: number;
  fallbackModel?: string;
}

export interface JobSiteConfig {
  name: string;
  url: string;
  selectors: Record<string, string>;
  formFields: Record<string, string>;
  validationRules: ValidationRule[];
  rateLimit: {
    requests: number;
    window: number;
  };
  retryConfig: RetryConfig;
  features: string[];
}

export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  permissions: string[];
  contentScripts: Array<{
    matches: string[];
    js: string[];
    css?: string[];
    runAt: 'document_start' | 'document_end' | 'document_idle';
  }>;
  background?: {
    service_worker: string;
  };
  web_accessible_resources?: Array<{
    resources: string[];
    matches: string[];
  }>;
  host_permissions?: string[];
  optional_permissions?: string[];
}
