/**
 * Advanced Performance Monitoring System
 * Enterprise-grade performance tracking with metrics, alerts, and optimization
 */

import { PerformanceMetrics, MemoryStats } from './types';
import Logger from './Logger';

export interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableRenderMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  enableUserInteractionMonitoring: boolean;
  memoryThreshold: number; // MB
  renderThreshold: number; // ms
  networkThreshold: number; // ms
  sampleRate: number; // 0-1
  reportInterval: number; // ms
  enableRealUserMonitoring: boolean;
  enableCoreWebVitals: boolean;
}

export interface PerformanceEntry {
  name: string;
  type: 'measure' | 'mark' | 'navigation' | 'resource' | 'paint' | 'layout';
  startTime: number;
  duration: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'render' | 'network' | 'core_web_vitals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

export default class PerformanceMonitor {
  private config: PerformanceConfig;
  private logger: Logger;
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
    networkLatency: 0,
    errorRate: 0
  };
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private reportTimer?: NodeJS.Timeout;
  private isMonitoring = false;
  private performanceEntries: PerformanceEntry[] = [];
  private coreWebVitals: Partial<CoreWebVitals> = {};
  private alertHandlers: Array<(alert: PerformanceAlert) => void> = [];

  constructor(config: Partial<PerformanceConfig> = {}, logger: Logger) {
    this.config = {
      enableMemoryMonitoring: true,
      enableRenderMonitoring: true,
      enableNetworkMonitoring: true,
      enableUserInteractionMonitoring: true,
      memoryThreshold: 100, // 100MB
      renderThreshold: 16, // 16ms (60fps)
      networkThreshold: 1000, // 1s
      sampleRate: 0.1, // 10%
      reportInterval: 30000, // 30s
      enableRealUserMonitoring: true,
      enableCoreWebVitals: true,
      ...config
    };

    this.logger = logger;
    this.initializeMonitoring();
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupObservers();
    this.startReporting();
    this.logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.cleanupObservers();
    this.stopReporting();
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Mark a performance point
   */
  mark(name: string, metadata: Record<string, any> = {}): void {
    if (!this.isMonitoring) return;

    performance.mark(name);
    this.performanceEntries.push({
      name,
      type: 'mark',
      startTime: performance.now(),
      duration: 0,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Measure performance between two marks
   */
  measure(name: string, startMark: string, endMark?: string, metadata: Record<string, any> = {}): number {
    if (!this.isMonitoring) return 0;

    try {
      const measureName = endMark ? `${startMark}-${endMark}` : `${startMark}-${name}`;
      performance.measure(measureName, startMark, endMark);
      
      const measures = performance.getEntriesByName(measureName, 'measure');
      const duration = measures.length > 0 ? measures[measures.length - 1].duration : 0;

      this.performanceEntries.push({
        name,
        type: 'measure',
        startTime: performance.now() - duration,
        duration,
        timestamp: Date.now(),
        metadata
      });

      return duration;
    } catch (error) {
      this.logger.error('Failed to measure performance', { name, startMark, endMark, error });
      return 0;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): Partial<CoreWebVitals> {
    return { ...this.coreWebVitals };
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get performance entries
   */
  getPerformanceEntries(filter?: { type?: string; name?: string; since?: number }): PerformanceEntry[] {
    let entries = [...this.performanceEntries];

    if (filter) {
      if (filter.type) {
        entries = entries.filter(entry => entry.type === filter.type);
      }
      if (filter.name) {
        entries = entries.filter(entry => entry.name.includes(filter.name!));
      }
      if (filter.since) {
        entries = entries.filter(entry => entry.timestamp > filter.since!);
      }
    }

    return entries;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    if (!this.config.enableMemoryMonitoring || !('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize / (1024 * 1024); // MB
    const total = memory.totalJSHeapSize / (1024 * 1024); // MB

    return {
      used,
      total,
      percentage: (used / total) * 100,
      heap: {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      },
      external: memory.jsHeapSizeLimit - memory.totalJSHeapSize,
      arrayBuffers: 0 // Not available in all browsers
    };
  }

  /**
   * Add performance alert handler
   */
  addAlertHandler(handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    coreWebVitals: Partial<CoreWebVitals>;
    alerts: PerformanceAlert[];
    memoryStats: MemoryStats | null;
    topSlowOperations: PerformanceEntry[];
    recommendations: string[];
  } {
    const topSlowOperations = this.performanceEntries
      .filter(entry => entry.type === 'measure')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const recommendations = this.generateRecommendations();

    return {
      metrics: this.getMetrics(),
      coreWebVitals: this.getCoreWebVitals(),
      alerts: this.getAlerts(),
      memoryStats: this.getMemoryStats(),
      topSlowOperations,
      recommendations
    };
  }

  private initializeMonitoring(): void {
    if (this.config.enableCoreWebVitals) {
      this.setupCoreWebVitals();
    }

    if (this.config.enableRealUserMonitoring) {
      this.setupRealUserMonitoring();
    }
  }

  private setupObservers(): void {
    if (this.config.enableMemoryMonitoring) {
      this.setupMemoryObserver();
    }

    if (this.config.enableRenderMonitoring) {
      this.setupRenderObserver();
    }

    if (this.config.enableNetworkMonitoring) {
      this.setupNetworkObserver();
    }

    if (this.config.enableUserInteractionMonitoring) {
      this.setupUserInteractionObserver();
    }
  }

  private setupMemoryObserver(): void {
    const checkMemory = () => {
      const memoryStats = this.getMemoryStats();
      if (memoryStats && memoryStats.percentage > this.config.memoryThreshold) {
        this.createAlert('memory', 'high', 
          `High memory usage: ${memoryStats.percentage.toFixed(1)}%`, 
          memoryStats.percentage, 
          this.config.memoryThreshold
        );
      }
    };

    setInterval(checkMemory, 5000);
  }

  private setupRenderObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.duration > this.config.renderThreshold) {
            this.createAlert('render', 'medium',
              `Slow operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`,
              entry.duration,
              this.config.renderThreshold
            );
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
      this.observers.push(observer);
    } catch (error) {
      this.logger.error('Failed to setup render observer', { error });
    }
  }

  private setupNetworkObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            const duration = resourceEntry.responseEnd - resourceEntry.requestStart;

            if (duration > this.config.networkThreshold) {
              this.createAlert('network', 'medium',
                `Slow network request: ${resourceEntry.name} took ${duration.toFixed(2)}ms`,
                duration,
                this.config.networkThreshold
              );
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      this.logger.error('Failed to setup network observer', { error });
    }
  }

  private setupUserInteractionObserver(): void {
    const interactionTypes = ['click', 'keydown', 'scroll', 'resize'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        if (Math.random() < this.config.sampleRate) {
          this.mark(`user-interaction-${type}`, {
            type,
            target: (event.target as Element)?.tagName,
            timestamp: Date.now()
          });
        }
      }, { passive: true });
    });
  }

  private setupCoreWebVitals(): void {
    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.coreWebVitals.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        this.logger.warn('LCP observer not supported', { error });
      }
    }

    // FID - First Input Delay
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.coreWebVitals.fid = (entry as any).processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        this.logger.warn('FID observer not supported', { error });
      }
    }

    // CLS - Cumulative Layout Shift
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.coreWebVitals.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        this.logger.warn('CLS observer not supported', { error });
      }
    }
  }

  private setupRealUserMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.coreWebVitals.fcp = navigation.responseEnd - navigation.fetchStart;
          this.coreWebVitals.ttfb = navigation.responseStart - navigation.fetchStart;
        }
      }, 0);
    });
  }

  private updateMetrics(): void {
    const memoryStats = this.getMemoryStats();
    if (memoryStats) {
      this.metrics.memoryUsage = memoryStats.percentage;
    }

    // Calculate render time from recent measures
    const recentMeasures = this.performanceEntries
      .filter(entry => entry.type === 'measure' && entry.timestamp > Date.now() - 60000)
      .slice(-10);
    
    if (recentMeasures.length > 0) {
      this.metrics.renderTime = recentMeasures.reduce((sum, entry) => sum + entry.duration, 0) / recentMeasures.length;
    }

    // Calculate error rate
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > Date.now() - 60000);
    this.metrics.errorRate = recentAlerts.length / 60; // errors per minute
  }

  private createAlert(
    type: 'memory' | 'render' | 'network' | 'core_web_vitals',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.push(alert);
    this.logger.warn(`Performance alert: ${message}`, { alert });

    // Notify alert handlers
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        this.logger.error('Error in alert handler', { error });
      }
    });
  }

  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);
  }

  private stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  private generateReport(): void {
    const report = this.getPerformanceReport();
    this.logger.info('Performance report generated', { report });
  }

  private cleanupObservers(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.getPerformanceReport();

    if (report.memoryStats && report.memoryStats.percentage > 80) {
      recommendations.push('Consider optimizing memory usage - current usage is high');
    }

    if (report.metrics.renderTime > 16) {
      recommendations.push('Consider optimizing rendering performance - average render time is above 16ms');
    }

    if (report.coreWebVitals.lcp && report.coreWebVitals.lcp > 2500) {
      recommendations.push('LCP is above 2.5s - consider optimizing largest contentful paint');
    }

    if (report.coreWebVitals.fid && report.coreWebVitals.fid > 100) {
      recommendations.push('FID is above 100ms - consider reducing JavaScript execution time');
    }

    if (report.coreWebVitals.cls && report.coreWebVitals.cls > 0.1) {
      recommendations.push('CLS is above 0.1 - consider stabilizing layout shifts');
    }

    return recommendations;
  }
}
