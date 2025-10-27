/**
 * Advanced Testing Setup
 * Enterprise-grade testing configuration with comprehensive coverage
 */

import { config } from '@vue/test-utils';
import { vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  }
};

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock crypto API
const mockCrypto = {
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    generateKey: vi.fn(),
    importKey: vi.fn(),
    deriveKey: vi.fn()
  }
};

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
});

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
});

// Mock MutationObserver
const mockMutationObserver = vi.fn();
mockMutationObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn()
});

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn()
});

// Setup global mocks
Object.defineProperty(window, 'chrome', {
  value: mockChrome,
  writable: true
});

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

Object.defineProperty(window, 'IntersectionObserver', {
  value: mockIntersectionObserver,
  writable: true
});

Object.defineProperty(window, 'ResizeObserver', {
  value: mockResizeObserver,
  writable: true
});

Object.defineProperty(window, 'MutationObserver', {
  value: mockMutationObserver,
  writable: true
});

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true
});

// Mock console methods for testing
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Mock URL and URLSearchParams
global.URL = class URL {
  constructor(public href: string) {}
  toString() { return this.href; }
} as any;

global.URLSearchParams = class URLSearchParams {
  private params = new Map();
  constructor(init?: string) {
    if (init) {
      init.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        this.params.set(key, value);
      });
    }
  }
  get(name: string) { return this.params.get(name); }
  set(name: string, value: string) { this.params.set(name, value); }
  has(name: string) { return this.params.has(name); }
  delete(name: string) { this.params.delete(name); }
  toString() {
    return Array.from(this.params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }
} as any;

// Mock File and FileReader
global.File = class File {
  constructor(
    public content: any[],
    public name: string,
    public options: any = {}
  ) {}
} as any;

global.FileReader = class FileReader {
  result: string | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,' + btoa('test content');
      this.onload?.({ target: this });
    }, 0);
  }
} as any;

// Mock FormData
global.FormData = class FormData {
  private data = new Map();
  append(name: string, value: any) {
    this.data.set(name, value);
  }
  get(name: string) {
    return this.data.get(name);
  }
  has(name: string) {
    return this.data.has(name);
  }
  delete(name: string) {
    this.data.delete(name);
  }
} as any;

// Mock Blob
global.Blob = class Blob {
  constructor(public content: any[], public options: any = {}) {}
  size = 0;
  type = '';
} as any;

// Mock AbortController
global.AbortController = class AbortController {
  signal = { aborted: false };
  abort() {
    this.signal.aborted = true;
  }
} as any;

// Mock TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
  encode(input: string) {
    return new Uint8Array(Buffer.from(input, 'utf8'));
  }
} as any;

global.TextDecoder = class TextDecoder {
  decode(input: Uint8Array) {
    return Buffer.from(input).toString('utf8');
  }
} as any;

// Mock btoa/atob
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock setTimeout/setInterval with fake timers
vi.useFakeTimers();

// Setup Vue Test Utils
config.global.mocks = {
  $t: (key: string) => key,
  $tc: (key: string) => key,
  $te: (key: string) => true,
  $d: (value: any) => value,
  $n: (value: any) => value
};

// Mock Vue Router
config.global.mocks.$route = {
  path: '/',
  name: 'home',
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {}
};

config.global.mocks.$router = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn()
};

// Mock Vuex store
config.global.mocks.$store = {
  state: {},
  getters: {},
  commit: vi.fn(),
  dispatch: vi.fn()
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
  mockChrome.storage.local.clear();
  mockChrome.storage.sync.clear();
});

// Restore console after tests
afterAll(() => {
  global.console = originalConsole;
});

export {
  mockChrome,
  mockPerformance,
  mockCrypto,
  localStorageMock,
  sessionStorageMock,
  mockIntersectionObserver,
  mockResizeObserver,
  mockMutationObserver,
  mockPerformanceObserver
};
