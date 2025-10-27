/**
 * Enterprise Architecture Core
 * Advanced patterns for scalable, maintainable Chrome extension
 * 
 * @author Trackr Team
 * @version 2.0.0
 */

// Core Services
export { default as ServiceContainer } from './ServiceContainer';
export { default as EventBus } from './EventBus';
export { default as StateManager } from './StateManager';
export { default as CacheManager } from './CacheManager';
export { default as Logger } from './Logger';
export { default as MetricsCollector } from './MetricsCollector';

// Advanced Patterns
export { default as DependencyInjection } from './DependencyInjection';
export { default as CommandPattern } from './CommandPattern';
export { default as ObserverPattern } from './ObserverPattern';
export { default as StrategyPattern } from './StrategyPattern';
export { default as FactoryPattern } from './FactoryPattern';

// Error Handling
export { default as ErrorHandler } from './ErrorHandler';
export { default as RetryManager } from './RetryManager';
export { default as CircuitBreaker } from './CircuitBreaker';

// Security
export { default as SecurityManager } from './SecurityManager';
export { default as InputValidator } from './InputValidator';
export { default as Sanitizer } from './Sanitizer';

// Performance
export { default as PerformanceMonitor } from './PerformanceMonitor';
export { default as MemoryManager } from './MemoryManager';
export { default as DebounceManager } from './DebounceManager';

// Configuration
export { default as ConfigManager } from './ConfigManager';
export { default as FeatureFlags } from './FeatureFlags';

// Types
export * from './types';
