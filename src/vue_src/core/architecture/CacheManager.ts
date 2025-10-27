/**
 * Advanced Cache Manager
 * Enterprise-grade caching with TTL, LRU, and intelligent invalidation
 */

import { CacheEntry } from './types';
import Logger from './Logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  strategy?: 'lru' | 'lfu' | 'fifo'; // Eviction strategy
  tags?: string[]; // Cache tags for invalidation
  persistent?: boolean; // Persist to storage
  compress?: boolean; // Compress large values
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
  byTag: Record<string, number>;
}

export default class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private options = new Map<string, CacheOptions>();
  private statistics = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private logger: Logger;
  private isInitialized = false;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
    this.initializeCache();
  }

  /**
   * Set a cache entry
   */
  set<T = any>(key: string, value: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: options.ttl || 0,
      tags: options.tags || []
    };

    // Compress if needed
    if (options.compress && this.shouldCompress(value)) {
      entry.value = this.compress(value) as T;
      entry.compressed = true;
    }

    this.cache.set(key, entry);
    this.options.set(key, options);

    // Check size limits
    this.enforceSizeLimit();

    this.logger.debug('Cache entry set', { key, ttl: options.ttl, tags: options.tags });
  }

  /**
   * Get a cache entry
   */
  get<T = any>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.statistics.misses++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.options.delete(key);
      this.statistics.misses++;
      return undefined;
    }

    this.statistics.hits++;
    
    // Decompress if needed
    if (entry.compressed) {
      return this.decompress(entry.value) as T;
    }

    return entry.value as T;
  }

  /**
   * Check if cache entry exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.options.delete(key);
    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.options.clear();
    this.logger.info('Cache cleared', { size });
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        this.options.delete(key);
        invalidated++;
      }
    }

    this.logger.info('Cache invalidated by tag', { tag, count: invalidated });
    return invalidated;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        this.options.delete(key);
        invalidated++;
      }
    }

    this.logger.info('Cache invalidated by pattern', { pattern: pattern.toString(), count: invalidated });
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const total = this.statistics.hits + this.statistics.misses;
    const hitRate = total > 0 ? this.statistics.hits / total : 0;
    
    const byTag: Record<string, number> = {};
    let memoryUsage = 0;

    for (const entry of this.cache.values()) {
      // Count by tags
      entry.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });

      // Estimate memory usage
      memoryUsage += this.estimateMemoryUsage(entry);
    }

    return {
      hits: this.statistics.hits,
      misses: this.statistics.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      memoryUsage,
      evictions: this.statistics.evictions,
      byTag
    };
  }

  /**
   * Get cache entries by tag
   */
  getByTag(tag: string): Array<{ key: string; value: any; timestamp: number }> {
    const entries: Array<{ key: string; value: any; timestamp: number }> = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag) && !this.isExpired(entry)) {
        entries.push({
          key,
          value: entry.compressed ? this.decompress(entry.value) : entry.value,
          timestamp: entry.timestamp
        });
      }
    }

    return entries;
  }

  /**
   * Warm up cache
   */
  async warmUp(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.options || {});
    }

    this.logger.info('Cache warmed up', { count: entries.length });
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.options.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cache cleaned up', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Export cache data
   */
  export(): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry)) {
        data[key] = {
          value: entry.compressed ? this.decompress(entry.value) : entry.value,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          tags: entry.tags
        };
      }
    }

    return data;
  }

  /**
   * Import cache data
   */
  import(data: Record<string, any>): void {
    for (const [key, entry] of Object.entries(data)) {
      this.cache.set(key, {
        key,
        value: entry.value,
        timestamp: entry.timestamp || Date.now(),
        ttl: entry.ttl || 0,
        tags: entry.tags || []
      });
    }

    this.logger.info('Cache imported', { count: Object.keys(data).length });
  }

  private initializeCache(): void {
    if (this.isInitialized) return;

    // Setup cleanup interval
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute

    this.isInitialized = true;
    this.logger.info('Cache manager initialized');
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === 0) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private enforceSizeLimit(): void {
    for (const [key, options] of this.options) {
      if (options.maxSize && this.cache.size > options.maxSize) {
        this.evictEntry(key, options.strategy || 'lru');
      }
    }
  }

  private evictEntry(key: string, strategy: 'lru' | 'lfu' | 'fifo'): void {
    let entryToEvict: string | null = null;

    switch (strategy) {
      case 'lru':
        entryToEvict = this.findLRUEntry();
        break;
      case 'lfu':
        entryToEvict = this.findLFUEntry();
        break;
      case 'fifo':
        entryToEvict = this.findFIFOEntry();
        break;
    }

    if (entryToEvict) {
      this.cache.delete(entryToEvict);
      this.options.delete(entryToEvict);
      this.statistics.evictions++;
    }
  }

  private findLRUEntry(): string | null {
    let oldestTime = Date.now();
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFUEntry(): string | null {
    // For simplicity, use LRU as LFU approximation
    // In a real implementation, track access frequency
    return this.findLRUEntry();
  }

  private findFIFOEntry(): string | null {
    // For simplicity, use LRU as FIFO approximation
    // In a real implementation, track insertion order
    return this.findLRUEntry();
  }

  private shouldCompress(value: any): boolean {
    const serialized = JSON.stringify(value);
    return serialized.length > 1024; // Compress if larger than 1KB
  }

  private compress(value: any): string {
    // Simple compression for demo purposes
    // In production, use proper compression like LZ4 or gzip
    return btoa(JSON.stringify(value));
  }

  private decompress(compressedValue: string): any {
    // Simple decompression for demo purposes
    // In production, use proper decompression
    return JSON.parse(atob(compressedValue));
  }

  private estimateMemoryUsage(entry: CacheEntry): number {
    return JSON.stringify(entry).length * 2; // Rough estimate
  }
}
