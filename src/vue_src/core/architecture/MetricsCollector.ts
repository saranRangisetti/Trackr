/**
 * Advanced Metrics Collector
 * Enterprise-grade metrics collection with aggregation and reporting
 */

import { MetricData } from './types';
import Logger from './Logger';

export interface MetricConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  maxMetrics: number;
  flushInterval: number; // milliseconds
  enableAggregation: boolean;
  enablePersistence: boolean;
}

export interface MetricAggregation {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export default class MetricsCollector {
  private config: MetricConfig;
  private metrics = new Map<string, MetricData[]>();
  private aggregations = new Map<string, MetricAggregation>();
  private logger: Logger;
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<MetricConfig> = {}, logger?: Logger) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      maxMetrics: 10000,
      flushInterval: 60000, // 1 minute
      enableAggregation: true,
      enablePersistence: true,
      ...config
    };

    this.logger = logger || new Logger();
    this.initializeMetrics();
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, tags: Record<string, string> = {}): void {
    if (!this.shouldCollect()) return;

    this.addMetric({
      name,
      value: 1,
      timestamp: Date.now(),
      tags,
      type: 'counter'
    });
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.shouldCollect()) return;

    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge'
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.shouldCollect()) return;

    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram'
    });
  }

  /**
   * Record a timer metric
   */
  recordTimer(name: string, duration: number, tags: Record<string, string> = {}): void {
    if (!this.shouldCollect()) return;

    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      tags,
      type: 'timer'
    });
  }

  /**
   * Start a timer
   */
  startTimer(name: string, tags: Record<string, string> = {}): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordTimer(name, duration, tags);
    };
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): MetricData[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string): MetricAggregation | undefined {
    return this.aggregations.get(name);
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalMetrics: number;
    byType: Record<string, number>;
    byName: Record<string, number>;
    memoryUsage: number;
  } {
    const byType: Record<string, number> = {};
    const byName: Record<string, number> = {};
    let totalMetrics = 0;
    let memoryUsage = 0;

    for (const [name, metricList] of this.metrics) {
      byName[name] = metricList.length;
      totalMetrics += metricList.length;

      for (const metric of metricList) {
        byType[metric.type] = (byType[metric.type] || 0) + 1;
        memoryUsage += JSON.stringify(metric).length;
      }
    }

    return {
      totalMetrics,
      byType,
      byName,
      memoryUsage
    };
  }

  /**
   * Clear metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      this.aggregations.delete(name);
    } else {
      this.metrics.clear();
      this.aggregations.clear();
    }

    this.logger.info('Metrics cleared', { name });
  }

  /**
   * Export metrics
   */
  export(): Record<string, MetricData[]> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Import metrics
   */
  import(data: Record<string, MetricData[]>): void {
    for (const [name, metrics] of Object.entries(data)) {
      this.metrics.set(name, metrics);
      if (this.config.enableAggregation) {
        this.updateAggregation(name);
      }
    }

    this.logger.info('Metrics imported', { count: Object.keys(data).length });
  }

  /**
   * Flush metrics
   */
  async flush(): Promise<void> {
    if (!this.config.enabled) return;

    const summary = this.getSummary();
    this.logger.info('Metrics flushed', summary);

    // In a real implementation, this would send metrics to a monitoring service
    // For now, just log them
    for (const [name, metrics] of this.metrics) {
      if (metrics.length > 0) {
        this.logger.debug('Metric data', { name, count: metrics.length, latest: metrics[metrics.length - 1] });
      }
    }

    // Clear metrics after flush
    this.clear();
  }

  private addMetric(metric: MetricData): void {
    if (!this.config.enabled) return;

    const name = metric.name;
    const existing = this.metrics.get(name) || [];
    
    // Add new metric
    existing.push(metric);
    
    // Enforce max metrics limit
    if (existing.length > this.config.maxMetrics) {
      existing.shift(); // Remove oldest
    }
    
    this.metrics.set(name, existing);

    // Update aggregation if enabled
    if (this.config.enableAggregation) {
      this.updateAggregation(name);
    }
  }

  private updateAggregation(name: string): void {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const min = values[0];
    const max = values[count - 1];
    const avg = sum / count;

    // Calculate percentiles
    const p50 = this.calculatePercentile(values, 50);
    const p95 = this.calculatePercentile(values, 95);
    const p99 = this.calculatePercentile(values, 99);

    this.aggregations.set(name, {
      count,
      sum,
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      p50,
      p95,
      p99
    });
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private shouldCollect(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.sampleRate;
  }

  private initializeMetrics(): void {
    if (this.isInitialized) return;

    // Setup flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    this.isInitialized = true;
    this.logger.info('Metrics collector initialized');
  }
}
