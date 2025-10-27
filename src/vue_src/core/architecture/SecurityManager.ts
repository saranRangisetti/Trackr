/**
 * Advanced Security Manager
 * Enterprise-grade security with CSP, input validation, and secure storage
 */

import { SecurityPolicy, ValidationRule, SanitizationRule } from './types';
import Logger from './Logger';

export default class SecurityManager {
  private logger: Logger;
  private policy: SecurityPolicy;
  private validationRules = new Map<string, ValidationRule[]>();
  private sanitizationRules = new Map<string, SanitizationRule[]>();
  private blockedOrigins = new Set<string>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  constructor(logger: Logger, policy: Partial<SecurityPolicy> = {}) {
    this.logger = logger;
    this.policy = {
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      allowedOrigins: ['https://*.workday.com', 'https://*.greenhouse.io'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['.pdf', '.doc', '.docx'],
      sanitizeInput: true,
      encryptSensitiveData: true,
      ...policy
    };

    this.initializeSecurity();
  }

  /**
   * Validate and sanitize input data
   */
  validateAndSanitize(data: any, context: string): any {
    if (!this.policy.sanitizeInput) return data;

    const sanitized = this.deepClone(data);
    this.applySanitizationRules(sanitized, context);
    return sanitized;
  }

  /**
   * Validate file upload
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.policy.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.policy.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.policy.allowedFileTypes.includes(extension)) {
      errors.push(`File type ${extension} is not allowed`);
    }

    // Check file name for malicious patterns
    if (this.containsMaliciousPattern(file.name)) {
      errors.push('File name contains potentially malicious content');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Encrypt sensitive data
   */
  async encryptSensitiveData(data: string): Promise<string> {
    if (!this.policy.encryptSensitiveData) return data;

    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(data);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );

      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...result));
    } catch (error) {
      this.logger.error('Failed to encrypt sensitive data', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encryptedData: string): Promise<string> {
    try {
      const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);

      const key = await this.getEncryptionKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt sensitive data', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(identifier);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (limit.count >= maxRequests) {
      this.logger.warn('Rate limit exceeded', { identifier, count: limit.count });
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Validate origin
   */
  validateOrigin(origin: string): boolean {
    if (this.blockedOrigins.has(origin)) {
      return false;
    }

    return this.policy.allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
  }

  /**
   * Add validation rule
   */
  addValidationRule(context: string, rule: ValidationRule): void {
    if (!this.validationRules.has(context)) {
      this.validationRules.set(context, []);
    }
    this.validationRules.get(context)!.push(rule);
  }

  /**
   * Add sanitization rule
   */
  addSanitizationRule(context: string, rule: SanitizationRule): void {
    if (!this.sanitizationRules.has(context)) {
      this.sanitizationRules.set(context, []);
    }
    this.sanitizationRules.get(context)!.push(rule);
  }

  private initializeSecurity(): void {
    this.setupCSP();
    this.setupDefaultRules();
    this.setupEventListeners();
  }

  private setupCSP(): void {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = this.policy.csp;
    document.head.appendChild(meta);
  }

  private setupDefaultRules(): void {
    // Email validation
    this.addValidationRule('email', {
      field: 'email',
      type: 'pattern',
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    });

    // Phone validation
    this.addValidationRule('phone', {
      field: 'phone',
      type: 'pattern',
      value: /^[\d\s\-\+\(\)]+$/,
      message: 'Invalid phone format'
    });

    // XSS sanitization
    this.addSanitizationRule('html', {
      field: 'content',
      type: 'xss',
      options: { allowedTags: ['b', 'i', 'em', 'strong'] }
    });
  }

  private setupEventListeners(): void {
    // Prevent XSS through innerHTML
    document.addEventListener('DOMContentLoaded', () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.sanitizeElement(node as Element);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  private applySanitizationRules(data: any, context: string): void {
    const rules = this.sanitizationRules.get(context) || [];
    
    rules.forEach(rule => {
      const value = this.getNestedValue(data, rule.field);
      if (value !== undefined) {
        const sanitized = this.sanitizeValue(value, rule);
        this.setNestedValue(data, rule.field, sanitized);
      }
    });
  }

  private sanitizeValue(value: any, rule: SanitizationRule): any {
    if (typeof value !== 'string') return value;

    switch (rule.type) {
      case 'html':
        return this.sanitizeHTML(value, rule.options);
      case 'xss':
        return this.sanitizeXSS(value, rule.options);
      case 'sql':
        return this.sanitizeSQL(value);
      case 'path':
        return this.sanitizePath(value);
      case 'custom':
        return rule.customSanitizer ? rule.customSanitizer(value) : value;
      default:
        return value;
    }
  }

  private sanitizeHTML(html: string, options: any = {}): string {
    const allowedTags = options.allowedTags || [];
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;
    
    return html.replace(tagPattern, (match, tag) => {
      if (allowedTags.includes(tag.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  private sanitizeXSS(input: string, options: any = {}): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private sanitizeSQL(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  private sanitizePath(input: string): string {
    return input
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .replace(/[<>:"|?*]/g, '');
  }

  private containsMaliciousPattern(filename: string): boolean {
    const maliciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid characters
      /\.(exe|bat|cmd|scr|pif|com)$/i,  // Executable files
      /javascript:/i,  // JavaScript protocol
      /data:/i,  // Data protocol
      /vbscript:/i  // VBScript protocol
    ];

    return maliciousPatterns.some(pattern => pattern.test(filename));
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    const keyName = 'trackr-encryption-key';
    
    try {
      // Try to get existing key
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyName),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new TextEncoder().encode('trackr-salt'), iterations: 100000, hash: 'SHA-256' },
        key,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      // Generate new key if import fails
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      return key;
    }
  }

  private sanitizeElement(element: Element): void {
    // Remove script tags
    const scripts = element.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Sanitize attributes
    const attributes = ['onclick', 'onload', 'onerror', 'onmouseover'];
    attributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // Sanitize href attributes
    const links = element.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('javascript:') || href.startsWith('data:'))) {
        link.removeAttribute('href');
      }
    });
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
