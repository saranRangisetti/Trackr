/**
 * Advanced State Manager
 * Enterprise-grade state management with persistence, validation, and reactivity
 */

import { StateSnapshot } from './types';
import Logger from './Logger';
import { EventBus } from './EventBus';

export interface StateChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  source: string;
}

export interface StateValidator {
  (value: any): boolean;
}

export interface StateOptions {
  persistent?: boolean;
  validator?: StateValidator;
  defaultValue?: any;
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export default class StateManager {
  private state = new Map<string, any>();
  private options = new Map<string, StateOptions>();
  private snapshots: StateSnapshot[] = [];
  private logger: Logger;
  private eventBus: EventBus;
  private isInitialized = false;

  constructor(logger?: Logger, eventBus?: EventBus) {
    this.logger = logger || new Logger();
    this.eventBus = eventBus || new EventBus();
    this.initializeState();
  }

  /**
   * Set a state value
   */
  set(key: string, value: any, source: string = 'unknown'): void {
    const oldValue = this.state.get(key);
    const options = this.options.get(key);

    // Validate value
    if (options?.validator && !options.validator(value)) {
      throw new Error(`Invalid value for state key '${key}'`);
    }

    // Check TTL
    if (options?.ttl && this.isExpired(key)) {
      this.state.delete(key);
      this.options.delete(key);
      return;
    }

    // Set new value
    this.state.set(key, value);

    // Persist if needed
    if (options?.persistent) {
      this.persistState(key, value, options.encrypt);
    }

    // Emit change event
    this.eventBus.emit('state:changed', {
      key,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
      source
    } as StateChangeEvent);

    this.logger.debug('State updated', { key, oldValue, newValue: value, source });
  }

  /**
   * Get a state value
   */
  get<T = any>(key: string): T | undefined {
    const options = this.options.get(key);

    // Check TTL
    if (options?.ttl && this.isExpired(key)) {
      this.state.delete(key);
      this.options.delete(key);
      return undefined;
    }

    return this.state.get(key);
  }

  /**
   * Check if state key exists
   */
  has(key: string): boolean {
    return this.state.has(key) && !this.isExpired(key);
  }

  /**
   * Delete a state value
   */
  delete(key: string): boolean {
    const existed = this.state.has(key);
    
    if (existed) {
      const oldValue = this.state.get(key);
      this.state.delete(key);
      this.options.delete(key);
      
      // Remove from persistent storage
      this.removePersistentState(key);
      
      // Emit change event
      this.eventBus.emit('state:changed', {
        key,
        oldValue,
        newValue: undefined,
        timestamp: Date.now(),
        source: 'delete'
      } as StateChangeEvent);
    }

    return existed;
  }

  /**
   * Get all state keys
   */
  keys(): string[] {
    return Array.from(this.state.keys()).filter(key => !this.isExpired(key));
  }

  /**
   * Get all state values
   */
  values(): any[] {
    return Array.from(this.state.values());
  }

  /**
   * Get all state entries
   */
  entries(): Array<[string, any]> {
    return Array.from(this.state.entries()).filter(([key]) => !this.isExpired(key));
  }

  /**
   * Clear all state
   */
  clear(): void {
    const keys = Array.from(this.state.keys());
    
    this.state.clear();
    this.options.clear();
    this.clearPersistentState();
    
    // Emit clear event
    this.eventBus.emit('state:cleared', {
      keys,
      timestamp: Date.now()
    });

    this.logger.info('State cleared', { keyCount: keys.length });
  }

  /**
   * Configure state options
   */
  configure(key: string, options: StateOptions): void {
    this.options.set(key, options);
    
    // Set default value if provided
    if (options.defaultValue !== undefined && !this.state.has(key)) {
      this.set(key, options.defaultValue, 'default');
    }

    this.logger.debug('State configured', { key, options });
  }

  /**
   * Create a snapshot
   */
  createSnapshot(version: string = 'manual'): string {
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      data: Object.fromEntries(this.state),
      version
    };

    this.snapshots.push(snapshot);
    
    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }

    this.logger.info('State snapshot created', { version, keyCount: this.state.size });
    return version;
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(version: string): boolean {
    const snapshot = this.snapshots.find(s => s.version === version);
    if (!snapshot) {
      this.logger.warn('Snapshot not found', { version });
      return false;
    }

    this.state.clear();
    for (const [key, value] of Object.entries(snapshot.data)) {
      this.state.set(key, value);
    }

    this.logger.info('State restored from snapshot', { version, keyCount: this.state.size });
    return true;
  }

  /**
   * Get available snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Watch state changes
   */
  watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void {
    return this.eventBus.on('state:changed', (event: StateChangeEvent) => {
      if (event.key === key) {
        callback(event.newValue, event.oldValue);
      }
    });
  }

  /**
   * Get state statistics
   */
  getStatistics(): {
    totalKeys: number;
    persistentKeys: number;
    encryptedKeys: number;
    expiredKeys: number;
    memoryUsage: number;
  } {
    let persistentKeys = 0;
    let encryptedKeys = 0;
    let expiredKeys = 0;

    for (const [key, options] of this.options) {
      if (options.persistent) persistentKeys++;
      if (options.encrypt) encryptedKeys++;
      if (options.ttl && this.isExpired(key)) expiredKeys++;
    }

    const memoryUsage = JSON.stringify(Object.fromEntries(this.state)).length;

    return {
      totalKeys: this.state.size,
      persistentKeys,
      encryptedKeys,
      expiredKeys,
      memoryUsage
    };
  }

  private initializeState(): void {
    if (this.isInitialized) return;

    // Load persistent state
    this.loadPersistentState();
    
    // Setup cleanup interval
    setInterval(() => {
      this.cleanupExpiredKeys();
    }, 60000); // Every minute

    this.isInitialized = true;
    this.logger.info('State manager initialized');
  }

  private isExpired(key: string): boolean {
    const options = this.options.get(key);
    if (!options?.ttl) return false;

    const value = this.state.get(key);
    if (!value || typeof value !== 'object' || !value._timestamp) return false;

    return Date.now() - value._timestamp > options.ttl;
  }

  private cleanupExpiredKeys(): void {
    const expiredKeys: string[] = [];
    
    for (const key of this.state.keys()) {
      if (this.isExpired(key)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.state.delete(key);
      this.options.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.logger.debug('Expired keys cleaned up', { count: expiredKeys.length });
    }
  }

  private persistState(key: string, value: any, encrypt: boolean = false): void {
    try {
      const data = {
        value: encrypt ? this.encrypt(JSON.stringify(value)) : value,
        timestamp: Date.now(),
        encrypted: encrypt
      };
      
      localStorage.setItem(`trackr_state_${key}`, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Failed to persist state', { key, error });
    }
  }

  private loadPersistentState(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('trackr_state_'));
      
      for (const storageKey of keys) {
        const stateKey = storageKey.replace('trackr_state_', '');
        const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        if (data.encrypted) {
          try {
            const decrypted = this.decrypt(data.value);
            this.state.set(stateKey, JSON.parse(decrypted));
          } catch (error) {
            this.logger.warn('Failed to decrypt state', { key: stateKey, error });
          }
        } else {
          this.state.set(stateKey, data.value);
        }
      }
      
      this.logger.info('Persistent state loaded', { keyCount: keys.length });
    } catch (error) {
      this.logger.error('Failed to load persistent state', { error });
    }
  }

  private removePersistentState(key: string): void {
    try {
      localStorage.removeItem(`trackr_state_${key}`);
    } catch (error) {
      this.logger.error('Failed to remove persistent state', { key, error });
    }
  }

  private clearPersistentState(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('trackr_state_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      this.logger.error('Failed to clear persistent state', { error });
    }
  }

  private encrypt(data: string): string {
    // Simple encryption for demo purposes
    // In production, use proper encryption
    return btoa(data);
  }

  private decrypt(encryptedData: string): string {
    // Simple decryption for demo purposes
    // In production, use proper decryption
    return atob(encryptedData);
  }
}
