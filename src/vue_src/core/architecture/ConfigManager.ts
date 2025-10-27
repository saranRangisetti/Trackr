/**
 * Advanced Configuration Manager
 * Enterprise-grade configuration with validation, hot-reloading, and environment support
 */

import { ConfigSchema, FeatureFlag } from './types';
import Logger from './Logger';
import { EventBus } from './EventBus';

export interface ConfigValue {
  value: any;
  source: 'default' | 'environment' | 'user' | 'runtime';
  timestamp: number;
  validated: boolean;
}

export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: string;
  timestamp: number;
}

export default class ConfigManager {
  private config = new Map<string, ConfigValue>();
  private schema: ConfigSchema;
  private logger: Logger;
  private eventBus: EventBus;
  private watchers = new Map<string, Set<(value: any) => void>>();
  private isInitialized = false;

  constructor(schema: ConfigSchema, logger: Logger, eventBus: EventBus) {
    this.schema = schema;
    this.logger = logger;
    this.eventBus = eventBus;
    this.initializeConfig();
  }

  /**
   * Get configuration value
   */
  get<T = any>(key: string): T {
    if (!this.config.has(key)) {
      throw new Error(`Configuration key '${key}' not found`);
    }

    const configValue = this.config.get(key)!;
    return configValue.value as T;
  }

  /**
   * Set configuration value
   */
  set(key: string, value: any, source: 'user' | 'runtime' = 'user'): void {
    if (!this.schema[key]) {
      throw new Error(`Configuration key '${key}' not defined in schema`);
    }

    const oldValue = this.config.get(key)?.value;
    
    // Validate value
    if (!this.validateValue(key, value)) {
      throw new Error(`Invalid value for configuration key '${key}'`);
    }

    // Set new value
    this.config.set(key, {
      value,
      source,
      timestamp: Date.now(),
      validated: true
    });

    // Notify watchers
    this.notifyWatchers(key, value);

    // Emit change event
    this.eventBus.emit('config:changed', {
      key,
      oldValue,
      newValue: value,
      source,
      timestamp: Date.now()
    } as ConfigChangeEvent);

    this.logger.debug('Configuration updated', { key, value, source });
  }

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Get all configuration keys
   */
  keys(): string[] {
    return Array.from(this.config.keys());
  }

  /**
   * Get configuration with metadata
   */
  getWithMetadata(key: string): ConfigValue | undefined {
    return this.config.get(key);
  }

  /**
   * Watch configuration changes
   */
  watch(key: string, callback: (value: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    this.watchers.get(key)!.add(callback);

    // Return unwatch function
    return () => {
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.delete(callback);
        if (watchers.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * Reset configuration to defaults
   */
  reset(key?: string): void {
    if (key) {
      this.resetKey(key);
    } else {
      this.config.clear();
      this.initializeConfig();
    }

    this.logger.info('Configuration reset', { key });
  }

  /**
   * Export configuration
   */
  export(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    for (const [key, configValue] of this.config) {
      if (configValue.source === 'user' || configValue.source === 'runtime') {
        exported[key] = configValue.value;
      }
    }

    return exported;
  }

  /**
   * Import configuration
   */
  import(configData: Record<string, any>): void {
    for (const [key, value] of Object.entries(configData)) {
      if (this.schema[key]) {
        this.set(key, value, 'user');
      }
    }

    this.logger.info('Configuration imported', { keys: Object.keys(configData) });
  }

  /**
   * Validate all configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, configValue] of this.config) {
      if (!this.validateValue(key, configValue.value)) {
        errors.push(`Invalid value for '${key}': ${configValue.value}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration schema
   */
  getSchema(): ConfigSchema {
    return { ...this.schema };
  }

  /**
   * Update schema
   */
  updateSchema(newSchema: Partial<ConfigSchema>): void {
    this.schema = { ...this.schema, ...newSchema };
    this.logger.info('Configuration schema updated', { keys: Object.keys(newSchema) });
  }

  private initializeConfig(): void {
    for (const [key, definition] of Object.entries(this.schema)) {
      let value = definition.default;
      let source: 'default' | 'environment' | 'user' | 'runtime' = 'default';

      // Check environment variable
      const envKey = `TRACKR_${key.toUpperCase()}`;
      if (process.env[envKey] !== undefined) {
        value = this.parseEnvironmentValue(process.env[envKey]!, definition.type);
        source = 'environment';
      }

      // Check user storage
      const stored = this.getStoredValue(key);
      if (stored !== null) {
        value = stored;
        source = 'user';
      }

      this.config.set(key, {
        value,
        source,
        timestamp: Date.now(),
        validated: this.validateValue(key, value)
      });
    }

    this.isInitialized = true;
    this.logger.info('Configuration initialized', { 
      keys: this.config.size,
      sources: this.getSourceDistribution()
    });
  }

  private validateValue(key: string, value: any): boolean {
    const definition = this.schema[key];
    if (!definition) return false;

    // Check required
    if (definition.required && (value === null || value === undefined)) {
      return false;
    }

    // Check type
    if (!this.checkType(value, definition.type)) {
      return false;
    }

    // Check custom validation
    if (definition.validation && !definition.validation(value)) {
      return false;
    }

    return true;
  }

  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private parseEnvironmentValue(value: string, type: string): any {
    switch (type) {
      case 'string':
        return value;
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'object':
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private getStoredValue(key: string): any {
    try {
      const stored = localStorage.getItem(`trackr_config_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeValue(key: string, value: any): void {
    try {
      localStorage.setItem(`trackr_config_${key}`, JSON.stringify(value));
    } catch (error) {
      this.logger.error('Failed to store configuration', { key, error });
    }
  }

  private resetKey(key: string): void {
    const definition = this.schema[key];
    if (definition) {
      this.config.set(key, {
        value: definition.default,
        source: 'default',
        timestamp: Date.now(),
        validated: true
      });

      // Remove from storage
      localStorage.removeItem(`trackr_config_${key}`);
    }
  }

  private notifyWatchers(key: string, value: any): void {
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          this.logger.error('Error in configuration watcher', { key, error });
        }
      });
    }
  }

  private getSourceDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const configValue of this.config.values()) {
      distribution[configValue.source] = (distribution[configValue.source] || 0) + 1;
    }

    return distribution;
  }
}

/**
 * Feature Flags Manager
 */
export class FeatureFlagsManager {
  private flags = new Map<string, FeatureFlag>();
  private logger: Logger;
  private eventBus: EventBus;

  constructor(logger: Logger, eventBus: EventBus) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.initializeFlags();
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(flagName: string, context: Record<string, any> = {}): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      this.logger.warn('Feature flag not found', { flagName });
      return false;
    }

    // Check if globally enabled
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (Math.random() * 100 > flag.rolloutPercentage) {
      return false;
    }

    // Check conditions
    return this.evaluateConditions(flag.conditions, context);
  }

  /**
   * Add feature flag
   */
  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.name, flag);
    this.logger.info('Feature flag added', { name: flag.name, enabled: flag.enabled });
  }

  /**
   * Update feature flag
   */
  updateFlag(name: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(name);
    if (flag) {
      const updated = { ...flag, ...updates };
      this.flags.set(name, updated);
      
      this.eventBus.emit('feature:changed', { name, flag: updated });
      this.logger.info('Feature flag updated', { name, updates });
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  private initializeFlags(): void {
    // Default feature flags
    this.addFlag({
      name: 'ai_optimization',
      enabled: true,
      rolloutPercentage: 100,
      conditions: {},
      description: 'Enable AI-powered resume optimization'
    });

    this.addFlag({
      name: 'advanced_analytics',
      enabled: false,
      rolloutPercentage: 50,
      conditions: { userTier: 'premium' },
      description: 'Advanced analytics and insights'
    });

    this.addFlag({
      name: 'team_collaboration',
      enabled: false,
      rolloutPercentage: 0,
      conditions: {},
      description: 'Team collaboration features'
    });
  }

  private evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key];
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    return true;
  }
}
