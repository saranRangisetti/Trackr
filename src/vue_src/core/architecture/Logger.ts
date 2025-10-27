/**
 * Advanced Logging System
 * Enterprise-grade logging with structured data, filtering, and multiple outputs
 */

import { LogEntry } from './types';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
  enablePerformance: boolean;
  enableUserTracking: boolean;
  sensitiveFields: string[];
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: any;
}

export default class Logger {
  private config: LogConfig;
  private logBuffer: LogEntry[] = [];
  private performanceMarks = new Map<string, number>();
  private flushTimer?: NodeJS.Timeout;
  private isEnabled = true;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxStorageEntries: 1000,
      batchSize: 10,
      flushInterval: 5000,
      enablePerformance: true,
      enableUserTracking: false,
      sensitiveFields: ['password', 'token', 'key', 'secret'],
      ...config
    };

    this.initializeFlushTimer();
    this.setupErrorHandling();
  }

  /**
   * Log debug message
   */
  debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context: LogContext = {}): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context: LogContext = {}): void {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.isEnabled || level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level: this.getLevelName(level),
      message,
      timestamp: Date.now(),
      context: this.sanitizeContext(context),
      stack: level >= LogLevel.ERROR ? this.getStackTrace() : undefined
    };

    this.addToBuffer(entry);
    this.outputLog(entry);
  }

  /**
   * Start performance measurement
   */
  startPerformance(name: string): void {
    if (!this.config.enablePerformance) return;
    this.performanceMarks.set(name, performance.now());
  }

  /**
   * End performance measurement and log
   */
  endPerformance(name: string, context: LogContext = {}): void {
    if (!this.config.enablePerformance) return;
    
    const startTime = this.performanceMarks.get(name);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      this.performanceMarks.delete(name);
      
      this.info(`Performance: ${name}`, {
        ...context,
        duration: `${duration.toFixed(2)}ms`,
        performanceName: name
      });
    }
  }

  /**
   * Log structured data
   */
  logStructured(level: LogLevel, data: Record<string, any>, context: LogContext = {}): void {
    this.log(level, 'Structured log data', {
      ...context,
      structuredData: data
    });
  }

  /**
   * Log user action
   */
  logUserAction(action: string, details: Record<string, any> = {}): void {
    if (!this.config.enableUserTracking) return;
    
    this.info(`User action: ${action}`, {
      action,
      ...details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API call
   */
  logApiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context: LogContext = {}
  ): void {
    this.info(`API Call: ${method} ${url}`, {
      ...context,
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration: `${duration}ms`,
      success: statusCode >= 200 && statusCode < 300
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, details: Record<string, any> = {}): void {
    this.warn(`Security event: ${event}`, {
      securityEvent: event,
      ...details,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    recentLogs: LogEntry[];
    errorRate: number;
    averageLogSize: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentLogs = this.logBuffer.filter(log => log.timestamp > oneHourAgo);
    const byLevel = recentLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorCount = (byLevel.error || 0) + (byLevel.fatal || 0);
    const errorRate = recentLogs.length > 0 ? errorCount / recentLogs.length : 0;

    const averageLogSize = recentLogs.length > 0 
      ? recentLogs.reduce((sum, log) => sum + JSON.stringify(log).length, 0) / recentLogs.length
      : 0;

    return {
      totalLogs: this.logBuffer.length,
      byLevel,
      recentLogs: recentLogs.slice(-10),
      errorRate,
      averageLogSize
    };
  }

  /**
   * Clear old logs
   */
  clearOldLogs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.logBuffer = this.logBuffer.filter(log => log.timestamp > cutoff);
  }

  /**
   * Export logs
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.flushInterval !== this.config.flushInterval) {
      this.initializeFlushTimer();
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length > this.config.maxStorageEntries) {
      this.logBuffer.shift();
    }
  }

  private outputLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    if (this.config.enableStorage) {
      this.outputToStorage(entry);
    }

    if (this.config.enableRemote) {
      this.outputToRemote(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const timestamp = new Date(entry.timestamp).toISOString();
    const message = `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(`%c${message}`, style, entry.context);
    } else {
      console.log(`%c${message}`, style);
    }
  }

  private outputToStorage(entry: LogEntry): void {
    try {
      const existingLogs = this.getStoredLogs();
      const updatedLogs = [...existingLogs, entry].slice(-this.config.maxStorageEntries);
      localStorage.setItem('trackr_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  private async outputToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to remote:', error);
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('trackr_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getConsoleStyle(level: string): string {
    const styles = {
      debug: 'color: #6c757d; font-style: italic;',
      info: 'color: #17a2b8; font-weight: bold;',
      warn: 'color: #ffc107; font-weight: bold;',
      error: 'color: #dc3545; font-weight: bold; background: #f8d7da;',
      fatal: 'color: #ffffff; font-weight: bold; background: #721c24;'
    };
    return styles[level as keyof typeof styles] || styles.info;
  }

  private getLevelName(level: LogLevel): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    const names = ['debug', 'info', 'warn', 'error', 'fatal'];
    return names[level] as 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };
    
    for (const field of this.config.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2).join('\n') : '';
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('token') || urlObj.searchParams.has('key')) {
        urlObj.searchParams.set('token', '[REDACTED]');
        urlObj.searchParams.set('key', '[REDACTED]');
      }
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private getClientIP(): string {
    // This would typically come from a server-side header
    // For client-side, we can't reliably get the IP
    return 'client-side';
  }

  private initializeFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);
  }

  private flushLogs(): void {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = this.logBuffer.splice(0, this.config.batchSize);
    
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.batchSendToRemote(logsToFlush);
    }
  }

  private async batchSendToRemote(logs: LogEntry[]): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      console.error('Failed to batch send logs to remote:', error);
    }
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private exportAsCSV(): string {
    if (this.logBuffer.length === 0) return '';

    const headers = ['timestamp', 'level', 'message', 'context'];
    const rows = this.logBuffer.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.context).replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
