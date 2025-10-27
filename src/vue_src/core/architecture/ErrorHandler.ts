/**
 * Advanced Error Handling System
 * Enterprise-grade error management with retry, circuit breaker, and monitoring
 */

import { ErrorContext, RetryConfig, CircuitBreakerConfig } from './types';
import Logger from './Logger';
import MetricsCollector from './MetricsCollector';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  EXTERNAL_SERVICE = 'external_service'
}

export interface ErrorReport {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  context: ErrorContext;
  stack?: string;
  timestamp: number;
  resolved: boolean;
  retryCount: number;
  metadata: Record<string, any>;
}

export default class ErrorHandler {
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorReports = new Map<string, ErrorReport>();
  private retryConfigs = new Map<string, RetryConfig>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorThresholds = new Map<ErrorCategory, number>();
  private alertHandlers: Array<(report: ErrorReport) => void> = [];

  constructor(logger: Logger, metrics: MetricsCollector) {
    this.logger = logger;
    this.metrics = metrics;
    this.initializeDefaultConfigs();
  }

  /**
   * Handle error with comprehensive processing
   */
  async handleError(
    error: Error,
    context: Partial<ErrorContext>,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM
  ): Promise<ErrorReport> {
    const errorId = this.generateErrorId();
    const fullContext = this.buildErrorContext(context);
    
    const report: ErrorReport = {
      id: errorId,
      severity,
      category,
      message: error.message,
      context: fullContext,
      stack: error.stack,
      timestamp: Date.now(),
      resolved: false,
      retryCount: 0,
      metadata: this.extractMetadata(error, fullContext)
    };

    // Store error report
    this.errorReports.set(errorId, report);

    // Log error
    await this.logError(report);

    // Collect metrics
    this.metrics.incrementCounter('errors_total', {
      severity,
      category,
      component: fullContext.component
    });

    // Check error thresholds
    await this.checkErrorThresholds(category);

    // Send alerts for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      await this.sendAlerts(report);
    }

    return report;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = this.getRetryConfig(operationName, customConfig);
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        const circuitBreaker = this.circuitBreakers.get(operationName);
        if (circuitBreaker) {
          circuitBreaker.recordSuccess();
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (!config.retryCondition(lastError) || attempt === config.maxAttempts) {
          throw lastError;
        }

        // Calculate delay with jitter
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);

        // Record retry attempt
        this.metrics.incrementCounter('retry_attempts_total', {
          operation: operationName,
          attempt: attempt.toString()
        });
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation with circuit breaker
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: CircuitBreakerConfig
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(operationName);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(operationName, config || this.getDefaultCircuitBreakerConfig());
      this.circuitBreakers.set(operationName, circuitBreaker);
    }

    return circuitBreaker.execute(operation);
  }

  /**
   * Validate and sanitize input
   */
  validateInput(data: any, rules: Array<{ field: string; validator: (value: any) => boolean; message: string }>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      if (!rule.validator(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Add error alert handler
   */
  addAlertHandler(handler: (report: ErrorReport) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recentErrors: ErrorReport[];
    errorRate: number;
  } {
    const reports = Array.from(this.errorReports.values());
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const bySeverity = reports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byCategory = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const recentErrors = reports
      .filter(report => report.timestamp > oneHourAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      total: reports.length,
      bySeverity,
      byCategory,
      recentErrors,
      errorRate: recentErrors.length / 60 // errors per minute
    };
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    for (const [id, report] of this.errorReports) {
      if (report.resolved) {
        this.errorReports.delete(id);
      }
    }
  }

  private initializeDefaultConfigs(): void {
    // Default retry configs
    this.retryConfigs.set('default', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => !this.isFatalError(error)
    });

    this.retryConfigs.set('network', {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryCondition: (error) => this.isNetworkError(error)
    });

    // Error thresholds
    this.errorThresholds.set(ErrorCategory.NETWORK, 10);
    this.errorThresholds.set(ErrorCategory.SECURITY, 1);
    this.errorThresholds.set(ErrorCategory.SYSTEM, 5);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildErrorContext(context: Partial<ErrorContext>): ErrorContext {
    return {
      component: context.component || 'unknown',
      action: context.action || 'unknown',
      userId: context.userId,
      sessionId: context.sessionId || this.generateSessionId(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: context.stack
    };
  }

  private extractMetadata(error: Error, context: ErrorContext): Record<string, any> {
    return {
      errorName: error.name,
      userAgent: context.userAgent,
      url: context.url,
      timestamp: context.timestamp,
      component: context.component,
      action: context.action
    };
  }

  private async logError(report: ErrorReport): Promise<void> {
    const logLevel = this.getLogLevel(report.severity);
    await this.logger.log(logLevel, report.message, {
      errorId: report.id,
      severity: report.severity,
      category: report.category,
      context: report.context,
      stack: report.stack,
      metadata: report.metadata
    });
  }

  private getLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'debug';
      case ErrorSeverity.MEDIUM: return 'info';
      case ErrorSeverity.HIGH: return 'warn';
      case ErrorSeverity.CRITICAL: return 'error';
      default: return 'error';
    }
  }

  private async checkErrorThresholds(category: ErrorCategory): Promise<void> {
    const threshold = this.errorThresholds.get(category);
    if (!threshold) return;

    const recentErrors = Array.from(this.errorReports.values())
      .filter(report => 
        report.category === category && 
        report.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
      );

    if (recentErrors.length >= threshold) {
      await this.sendThresholdAlert(category, recentErrors.length, threshold);
    }
  }

  private async sendAlerts(report: ErrorReport): Promise<void> {
    for (const handler of this.alertHandlers) {
      try {
        await handler(report);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    }
  }

  private async sendThresholdAlert(category: ErrorCategory, count: number, threshold: number): Promise<void> {
    const alertReport: ErrorReport = {
      id: this.generateErrorId(),
      severity: ErrorSeverity.HIGH,
      category,
      message: `Error threshold exceeded for ${category}: ${count}/${threshold}`,
      context: {
        component: 'ErrorHandler',
        action: 'threshold_check',
        sessionId: this.generateSessionId(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      timestamp: Date.now(),
      resolved: false,
      retryCount: 0,
      metadata: { count, threshold, category }
    };

    await this.sendAlerts(alertReport);
  }

  private getRetryConfig(operationName: string, customConfig?: Partial<RetryConfig>): RetryConfig {
    const baseConfig = this.retryConfigs.get(operationName) || this.retryConfigs.get('default')!;
    return { ...baseConfig, ...customConfig };
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      const jitter = Math.random() * 0.1 * delay;
      return delay + jitter;
    }

    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isFatalError(error: Error): boolean {
    const fatalErrors = [
      'TypeError',
      'ReferenceError',
      'SyntaxError'
    ];
    return fatalErrors.includes(error.name);
  }

  private isNetworkError(error: Error): boolean {
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('fetch');
  }

  private getDefaultCircuitBreakerConfig(): CircuitBreakerConfig {
    return {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
      halfOpenMaxCalls: 3
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker HALF_OPEN call limit exceeded for ${this.name}`);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.halfOpenCalls = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.halfOpenCalls++;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}
