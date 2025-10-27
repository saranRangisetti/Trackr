/**
 * Advanced Internationalization Manager
 * Enterprise-grade i18n with pluralization, formatting, and dynamic loading
 */

import { I18nConfig } from '../architecture/types';
import Logger from '../architecture/Logger';
import { EventBus } from '../architecture/EventBus';

export interface Translation {
  key: string;
  value: string;
  context?: string;
  plural?: Record<string, string>;
  variables?: string[];
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
}

export interface FormatOptions {
  date?: Intl.DateTimeFormatOptions;
  time?: Intl.DateTimeFormatOptions;
  number?: Intl.NumberFormatOptions;
  currency?: Intl.NumberFormatOptions;
  relative?: boolean;
}

export default class I18nManager {
  private config: I18nConfig;
  private logger: Logger;
  private eventBus: EventBus;
  private currentLocale: string;
  private translations = new Map<string, Map<string, Translation>>();
  private loadedLocales = new Set<string>();
  private pluralizationRules = new Map<string, (n: number) => number>();
  private formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
  private fallbackChain: string[] = [];

  constructor(config: I18nConfig, logger: Logger, eventBus: EventBus) {
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.currentLocale = config.locale;
    this.fallbackChain = this.buildFallbackChain(config.locale, config.fallbackLocale);
    
    this.initializePluralizationRules();
    this.loadLocale(config.locale);
  }

  /**
   * Translate a key with optional variables
   */
  t(key: string, variables: Record<string, any> = {}, options: { 
    locale?: string; 
    context?: string;
    count?: number;
  } = {}): string {
    const locale = options.locale || this.currentLocale;
    const translation = this.getTranslation(key, locale, options.context);
    
    if (!translation) {
      this.logger.warn('Translation not found', { key, locale, context: options.context });
      return key; // Return key as fallback
    }

    let value = this.selectPluralForm(translation, options.count || 1);
    value = this.interpolateVariables(value, variables);
    
    return value;
  }

  /**
   * Translate with pluralization
   */
  tc(key: string, count: number, variables: Record<string, any> = {}): string {
    return this.t(key, variables, { count });
  }

  /**
   * Check if translation exists
   */
  te(key: string, locale?: string): boolean {
    return this.getTranslation(key, locale || this.currentLocale) !== null;
  }

  /**
   * Format date
   */
  d(value: Date | string | number, options: FormatOptions = {}): string {
    const date = new Date(value);
    const locale = this.currentLocale;
    
    if (options.relative) {
      return this.formatRelativeTime(date);
    }

    const formatter = this.getDateFormatter(locale, options.date);
    return formatter.format(date);
  }

  /**
   * Format number
   */
  n(value: number, options: FormatOptions = {}): string {
    const locale = this.currentLocale;
    const formatter = this.getNumberFormatter(locale, options.number || options.currency);
    return formatter.format(value);
  }

  /**
   * Format currency
   */
  c(value: number, currency: string = 'USD'): string {
    const locale = this.currentLocale;
    const formatter = this.getCurrencyFormatter(locale, currency);
    return formatter.format(value);
  }

  /**
   * Set current locale
   */
  async setLocale(locale: string): Promise<void> {
    if (locale === this.currentLocale) return;

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;
    this.fallbackChain = this.buildFallbackChain(locale, this.config.fallbackLocale);

    // Load locale if not already loaded
    if (!this.loadedLocales.has(locale)) {
      await this.loadLocale(locale);
    }

    // Update document direction
    this.updateDocumentDirection(locale);

    // Emit change event
    this.eventBus.emit('locale:changed', {
      oldLocale,
      newLocale: locale,
      timestamp: Date.now()
    });

    this.logger.info('Locale changed', { oldLocale, newLocale: locale });
  }

  /**
   * Get current locale
   */
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * Get available locales
   */
  getAvailableLocales(): string[] {
    return Array.from(this.loadedLocales);
  }

  /**
   * Get locale information
   */
  getLocaleInfo(locale: string): LocaleInfo | null {
    const localeData = this.getLocaleData(locale);
    return localeData ? this.buildLocaleInfo(locale, localeData) : null;
  }

  /**
   * Add translation
   */
  addTranslation(locale: string, translation: Translation): void {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }

    this.translations.get(locale)!.set(translation.key, translation);
    this.logger.debug('Translation added', { locale, key: translation.key });
  }

  /**
   * Add multiple translations
   */
  addTranslations(locale: string, translations: Translation[]): void {
    translations.forEach(translation => {
      this.addTranslation(locale, translation);
    });
  }

  /**
   * Load locale from external source
   */
  async loadLocale(locale: string): Promise<void> {
    if (this.loadedLocales.has(locale)) return;

    try {
      // Try to load from external source
      const translations = await this.fetchTranslations(locale);
      this.addTranslations(locale, translations);
      this.loadedLocales.add(locale);
      
      this.logger.info('Locale loaded', { locale, translationCount: translations.length });
    } catch (error) {
      this.logger.error('Failed to load locale', { locale, error });
      
      // Fallback to built-in messages
      if (this.config.messages[locale]) {
        this.loadBuiltInMessages(locale);
        this.loadedLocales.add(locale);
      }
    }
  }

  /**
   * Get translation statistics
   */
  getTranslationStats(): {
    totalKeys: number;
    byLocale: Record<string, number>;
    missingKeys: string[];
    coverage: number;
  } {
    const allKeys = new Set<string>();
    const byLocale: Record<string, number> = {};
    const missingKeys: string[] = [];

    // Collect all keys
    for (const [locale, translations] of this.translations) {
      byLocale[locale] = translations.size;
      for (const key of translations.keys()) {
        allKeys.add(key);
      }
    }

    // Find missing keys
    for (const key of allKeys) {
      for (const locale of this.loadedLocales) {
        if (!this.te(key, locale)) {
          missingKeys.push(`${key}@${locale}`);
        }
      }
    }

    const totalKeys = allKeys.size;
    const coverage = totalKeys > 0 ? (totalKeys - missingKeys.length) / totalKeys : 1;

    return {
      totalKeys,
      byLocale,
      missingKeys,
      coverage
    };
  }

  private getTranslation(key: string, locale: string, context?: string): Translation | null {
    // Try exact locale first
    let translation = this.findTranslation(key, locale, context);
    if (translation) return translation;

    // Try fallback chain
    for (const fallbackLocale of this.fallbackChain) {
      if (fallbackLocale === locale) continue;
      
      translation = this.findTranslation(key, fallbackLocale, context);
      if (translation) return translation;
    }

    return null;
  }

  private findTranslation(key: string, locale: string, context?: string): Translation | null {
    const localeTranslations = this.translations.get(locale);
    if (!localeTranslations) return null;

    // Try with context first
    if (context) {
      const contextualKey = `${key}@${context}`;
      const translation = localeTranslations.get(contextualKey);
      if (translation) return translation;
    }

    // Try without context
    return localeTranslations.get(key) || null;
  }

  private selectPluralForm(translation: Translation, count: number): string {
    if (!translation.plural || Object.keys(translation.plural).length === 0) {
      return translation.value;
    }

    const rule = this.pluralizationRules.get(this.currentLocale);
    if (!rule) {
      return translation.value;
    }

    const form = rule(count);
    const formKey = form.toString();
    
    return translation.plural[formKey] || translation.value;
  }

  private interpolateVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return this.t('relative.days', { count: days });
    } else if (hours > 0) {
      return this.t('relative.hours', { count: hours });
    } else if (minutes > 0) {
      return this.t('relative.minutes', { count: minutes });
    } else {
      return this.t('relative.seconds', { count: seconds });
    }
  }

  private getDateFormatter(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `date_${locale}_${JSON.stringify(options || {})}`;
    
    if (!this.formatters.has(key)) {
      const formatter = new Intl.DateTimeFormat(locale, options);
      this.formatters.set(key, formatter);
    }

    return this.formatters.get(key) as Intl.DateTimeFormat;
  }

  private getNumberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `number_${locale}_${JSON.stringify(options || {})}`;
    
    if (!this.formatters.has(key)) {
      const formatter = new Intl.NumberFormat(locale, options);
      this.formatters.set(key, formatter);
    }

    return this.formatters.get(key) as Intl.NumberFormat;
  }

  private getCurrencyFormatter(locale: string, currency: string): Intl.NumberFormat {
    const key = `currency_${locale}_${currency}`;
    
    if (!this.formatters.has(key)) {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      });
      this.formatters.set(key, formatter);
    }

    return this.formatters.get(key) as Intl.NumberFormat;
  }

  private buildFallbackChain(locale: string, fallbackLocale: string): string[] {
    const chain = [locale];
    
    // Add language without region (e.g., en-US -> en)
    const language = locale.split('-')[0];
    if (language !== locale) {
      chain.push(language);
    }

    // Add fallback locale
    if (fallbackLocale && !chain.includes(fallbackLocale)) {
      chain.push(fallbackLocale);
    }

    return chain;
  }

  private updateDocumentDirection(locale: string): void {
    const localeInfo = this.getLocaleInfo(locale);
    if (localeInfo) {
      document.documentElement.dir = localeInfo.direction;
      document.documentElement.lang = locale;
    }
  }

  private initializePluralizationRules(): void {
    // English pluralization rule
    this.pluralizationRules.set('en', (n) => n === 1 ? 0 : 1);
    
    // Add more rules as needed
    this.pluralizationRules.set('es', (n) => n === 1 ? 0 : 1);
    this.pluralizationRules.set('fr', (n) => n <= 1 ? 0 : 1);
    this.pluralizationRules.set('de', (n) => n === 1 ? 0 : 1);
  }

  private async fetchTranslations(locale: string): Promise<Translation[]> {
    // In a real implementation, this would fetch from a server
    // For now, return empty array
    return [];
  }

  private loadBuiltInMessages(locale: string): void {
    const messages = this.config.messages[locale];
    if (!messages) return;

    const translations: Translation[] = Object.entries(messages).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    }));

    this.addTranslations(locale, translations);
  }

  private getLocaleData(locale: string): any {
    // This would typically come from a locale data library
    // For now, return basic data
    return {
      name: locale,
      nativeName: locale,
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'HH:mm',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '$'
      }
    };
  }

  private buildLocaleInfo(locale: string, data: any): LocaleInfo {
    return {
      code: locale,
      name: data.name,
      nativeName: data.nativeName,
      direction: data.direction,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      numberFormat: data.numberFormat
    };
  }
}
