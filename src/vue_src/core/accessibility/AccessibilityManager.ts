/**
 * Advanced Accessibility Manager
 * Enterprise-grade accessibility with WCAG 2.1 AA compliance and screen reader support
 */

import { AccessibilityConfig } from '../architecture/types';
import Logger from '../architecture/Logger';
import { EventBus } from '../architecture/EventBus';

export interface A11yAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

export interface A11yFocusTrap {
  element: HTMLElement;
  firstFocusable: HTMLElement | null;
  lastFocusable: HTMLElement | null;
  previousActiveElement: HTMLElement | null;
}

export interface A11yKeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  element?: HTMLElement;
}

export default class AccessibilityManager {
  private config: AccessibilityConfig;
  private logger: Logger;
  private eventBus: EventBus;
  private announcements: A11yAnnouncement[] = [];
  private focusTraps = new Map<string, A11yFocusTrap>();
  private keyboardShortcuts = new Map<string, A11yKeyboardShortcut>();
  private skipLinks: HTMLElement[] = [];
  private landmarkElements: HTMLElement[] = [];
  private isInitialized = false;

  constructor(config: AccessibilityConfig, logger: Logger, eventBus: EventBus) {
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  initializeAccessibility(): void {
    if (this.isInitialized) return;

    this.setupAnnouncementRegion();
    this.setupSkipLinks();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.setupHighContrastMode();
    this.setupReducedMotion();
    this.setupLandmarks();

    this.isInitialized = true;
    this.logger.info('Accessibility features initialized');
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement: A11yAnnouncement = {
      message,
      priority,
      timestamp: Date.now()
    };

    this.announcements.push(announcement);
    this.updateAnnouncementRegion(announcement);

    this.logger.debug('Accessibility announcement', { message, priority });
  }

  /**
   * Create focus trap
   */
  createFocusTrap(id: string, element: HTMLElement): void {
    const focusableElements = this.getFocusableElements(element);
    const firstFocusable = focusableElements[0] || null;
    const lastFocusable = focusableElements[focusableElements.length - 1] || null;

    const trap: A11yFocusTrap = {
      element,
      firstFocusable,
      lastFocusable,
      previousActiveElement: document.activeElement as HTMLElement
    };

    this.focusTraps.set(id, trap);
    this.setupFocusTrapListeners(id);

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    this.logger.debug('Focus trap created', { id, elementCount: focusableElements.length });
  }

  /**
   * Remove focus trap
   */
  removeFocusTrap(id: string): void {
    const trap = this.focusTraps.get(id);
    if (trap) {
      // Restore focus to previous element
      if (trap.previousActiveElement) {
        trap.previousActiveElement.focus();
      }

      this.focusTraps.delete(id);
      this.logger.debug('Focus trap removed', { id });
    }
  }

  /**
   * Add keyboard shortcut
   */
  addKeyboardShortcut(shortcut: A11yKeyboardShortcut): void {
    const key = this.generateShortcutKey(shortcut);
    this.keyboardShortcuts.set(key, shortcut);
    this.logger.debug('Keyboard shortcut added', { key, description: shortcut.description });
  }

  /**
   * Remove keyboard shortcut
   */
  removeKeyboardShortcut(key: string): void {
    this.keyboardShortcuts.delete(key);
    this.logger.debug('Keyboard shortcut removed', { key });
  }

  /**
   * Set ARIA attributes
   */
  setAriaAttributes(element: HTMLElement, attributes: Record<string, string | boolean>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        element.setAttribute(`aria-${key}`, value.toString());
      } else {
        element.setAttribute(`aria-${key}`, value);
      }
    });

    this.logger.debug('ARIA attributes set', { element: element.tagName, attributes });
  }

  /**
   * Create accessible button
   */
  createAccessibleButton(
    text: string,
    onClick: () => void,
    options: {
      disabled?: boolean;
      pressed?: boolean;
      expanded?: boolean;
      controls?: string;
      describedBy?: string;
    } = {}
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);

    // Set ARIA attributes
    const ariaAttributes: Record<string, string | boolean> = {};
    if (options.disabled) ariaAttributes.disabled = true;
    if (options.pressed !== undefined) ariaAttributes.pressed = options.pressed;
    if (options.expanded !== undefined) ariaAttributes.expanded = options.expanded;
    if (options.controls) ariaAttributes.controls = options.controls;
    if (options.describedBy) ariaAttributes.describedby = options.describedBy;

    this.setAriaAttributes(button, ariaAttributes);

    return button;
  }

  /**
   * Create accessible form field
   */
  createAccessibleFormField(
    type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url',
    label: string,
    options: {
      required?: boolean;
      placeholder?: string;
      describedBy?: string;
      invalid?: boolean;
      errorMessage?: string;
    } = {}
  ): { input: HTMLInputElement; label: HTMLLabelElement; error?: HTMLDivElement } {
    const input = document.createElement('input');
    input.type = type;
    input.id = this.generateId();
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.htmlFor = input.id;

    // Set ARIA attributes
    const ariaAttributes: Record<string, string | boolean> = {};
    if (options.required) ariaAttributes.required = true;
    if (options.describedBy) ariaAttributes.describedby = options.describedBy;
    if (options.invalid) ariaAttributes.invalid = true;

    this.setAriaAttributes(input, ariaAttributes);

    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }

    const result: { input: HTMLInputElement; label: HTMLLabelElement; error?: HTMLDivElement } = {
      input,
      label: labelElement
    };

    // Add error message if provided
    if (options.errorMessage) {
      const error = document.createElement('div');
      error.id = `${input.id}-error`;
      error.textContent = options.errorMessage;
      error.setAttribute('role', 'alert');
      error.setAttribute('aria-live', 'polite');
      
      input.setAttribute('aria-describedby', error.id);
      result.error = error;
    }

    return result;
  }

  /**
   * Create accessible modal
   */
  createAccessibleModal(
    title: string,
    content: HTMLElement,
    options: {
      closable?: boolean;
      focusable?: boolean;
    } = {}
  ): HTMLElement {
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.className = 'modal';

    const titleElement = document.createElement('h2');
    titleElement.id = 'modal-title';
    titleElement.textContent = title;

    const closeButton = this.createAccessibleButton('Close', () => {
      this.closeModal(modal);
    }, {
      controls: modal.id
    });

    modal.appendChild(titleElement);
    modal.appendChild(content);
    if (options.closable !== false) {
      modal.appendChild(closeButton);
    }

    // Create focus trap
    const modalId = this.generateId();
    modal.id = modalId;
    this.createFocusTrap(modalId, modal);

    return modal;
  }

  /**
   * Close modal
   */
  closeModal(modal: HTMLElement): void {
    const modalId = modal.id;
    this.removeFocusTrap(modalId);
    modal.remove();
    this.announce('Modal closed');
  }

  /**
   * Check color contrast
   */
  checkColorContrast(foreground: string, background: string): {
    ratio: number;
    aa: boolean;
    aaa: boolean;
  } {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: ratio >= 4.5,
      aaa: ratio >= 7
    };
  }

  /**
   * Get accessibility violations
   */
  getAccessibilityViolations(): Array<{
    element: HTMLElement;
    violation: string;
    severity: 'error' | 'warning';
    wcagLevel: 'A' | 'AA' | 'AAA';
  }> {
    const violations: Array<{
      element: HTMLElement;
      violation: string;
      severity: 'error' | 'warning';
      wcagLevel: 'A' | 'AA' | 'AAA';
    }> = [];

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        violations.push({
          element: img as HTMLElement,
          violation: 'Missing alt text',
          severity: 'error',
          wcagLevel: 'A'
        });
      }
    });

    // Check for missing form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.id;
      const label = document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      
      if (!label && !ariaLabel) {
        violations.push({
          element: input as HTMLElement,
          violation: 'Missing form label',
          severity: 'error',
          wcagLevel: 'A'
        });
      }
    });

    // Check for missing heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        violations.push({
          element: heading as HTMLElement,
          violation: 'Heading level skipped',
          severity: 'warning',
          wcagLevel: 'AA'
        });
      }
      lastLevel = level;
    });

    return violations;
  }

  private setupAnnouncementRegion(): void {
    const region = document.createElement('div');
    region.id = 'a11y-announcements';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
  }

  private updateAnnouncementRegion(announcement: A11yAnnouncement): void {
    const region = document.getElementById('a11y-announcements');
    if (region) {
      region.setAttribute('aria-live', announcement.priority);
      region.textContent = announcement.message;
    }
  }

  private setupSkipLinks(): void {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' }
    ];

    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-link';
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.href);
        if (target) {
          (target as HTMLElement).focus();
        }
      });
      
      document.body.insertBefore(skipLink, document.body.firstChild);
      this.skipLinks.push(skipLink);
    });
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (e) => {
      // Handle keyboard shortcuts
      const shortcutKey = this.generateShortcutKey({
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        action: () => {},
        description: ''
      });

      const shortcut = this.keyboardShortcuts.get(shortcutKey);
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }

      // Handle focus trap navigation
      if (e.key === 'Tab') {
        this.handleFocusTrapNavigation(e);
      }

      // Handle escape key
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
  }

  private setupFocusManagement(): void {
    // Track focus changes
    document.addEventListener('focusin', (e) => {
      const element = e.target as HTMLElement;
      this.announce(`Focused on ${this.getElementDescription(element)}`);
    });

    // Handle focus loss
    document.addEventListener('focusout', (e) => {
      const element = e.target as HTMLElement;
      if (!element.contains(document.activeElement)) {
        this.announce(`Left ${this.getElementDescription(element)}`);
      }
    });
  }

  private setupScreenReaderSupport(): void {
    // Add screen reader only text
    const style = document.createElement('style');
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
      }
      
      .skip-link:focus {
        top: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  private setupHighContrastMode(): void {
    if (this.config.highContrast) {
      document.body.classList.add('high-contrast');
    }

    // Listen for system high contrast changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          document.body.classList.add('high-contrast');
        } else {
          document.body.classList.remove('high-contrast');
        }
      });
    }
  }

  private setupReducedMotion(): void {
    if (this.config.reducedMotion) {
      document.body.classList.add('reduced-motion');
    }

    // Listen for system reduced motion preference
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          document.body.classList.add('reduced-motion');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
    }
  }

  private setupLandmarks(): void {
    // Add landmark roles to common elements
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      this.landmarkElements.push(main as HTMLElement);
    }

    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (nav) {
      this.landmarkElements.push(nav as HTMLElement);
    }

    const header = document.querySelector('header') || document.querySelector('[role="banner"]');
    if (header) {
      this.landmarkElements.push(header as HTMLElement);
    }

    const footer = document.querySelector('footer') || document.querySelector('[role="contentinfo"]');
    if (footer) {
      this.landmarkElements.push(footer as HTMLElement);
    }
  }

  private setupFocusTrapListeners(id: string): void {
    const trap = this.focusTraps.get(id);
    if (!trap) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === trap.firstFocusable) {
            e.preventDefault();
            trap.lastFocusable?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === trap.lastFocusable) {
            e.preventDefault();
            trap.firstFocusable?.focus();
          }
        }
      }
    };

    trap.element.addEventListener('keydown', handleKeyDown);
  }

  private handleFocusTrapNavigation(e: KeyboardEvent): void {
    for (const trap of this.focusTraps.values()) {
      if (trap.element.contains(document.activeElement)) {
        if (e.shiftKey) {
          if (document.activeElement === trap.firstFocusable) {
            e.preventDefault();
            trap.lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === trap.lastFocusable) {
            e.preventDefault();
            trap.firstFocusable?.focus();
          }
        }
        break;
      }
    }
  }

  private handleEscapeKey(): void {
    // Close any open modals or focus traps
    for (const [id, trap] of this.focusTraps) {
      this.removeFocusTrap(id);
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const elements = container.querySelectorAll(focusableSelectors.join(', '));
    return Array.from(elements) as HTMLElement[];
  }

  private generateShortcutKey(shortcut: A11yKeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.metaKey) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  private generateId(): string {
    return `a11y-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getElementDescription(element: HTMLElement): string {
    const label = element.getAttribute('aria-label') || 
                 element.getAttribute('title') || 
                 element.textContent?.trim() ||
                 element.tagName.toLowerCase();
    
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    return `${role}: ${label}`;
  }

  private getLuminance(color: string): number {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const [rs, gs, bs] = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
}
