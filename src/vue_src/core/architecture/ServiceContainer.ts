/**
 * Advanced Service Container with Dependency Injection
 * Enterprise-grade IoC container with lifecycle management
 */

import { ServiceDefinition, ServiceContainer as IServiceContainer } from './types';

export default class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private circularDependencyCheck = new Set<string>();

  /**
   * Register a service with dependency injection
   */
  register<T>(
    name: string, 
    service: T | (() => T), 
    dependencies: string[] = [],
    singleton: boolean = true
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const definition: ServiceDefinition = {
      name,
      instance: typeof service === 'function' ? service : service,
      dependencies,
      singleton,
      factory: typeof service === 'function' ? service : undefined
    };

    this.services.set(name, definition);
  }

  /**
   * Get a service instance with dependency resolution
   */
  get<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    const definition = this.services.get(name)!;

    // Return existing instance for singletons
    if (definition.singleton && this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Check for circular dependencies
    if (this.circularDependencyCheck.has(name)) {
      throw new Error(`Circular dependency detected for service '${name}'`);
    }

    this.circularDependencyCheck.add(name);

    try {
      // Resolve dependencies
      const resolvedDependencies = definition.dependencies.map(dep => this.get(dep));

      // Create instance
      let instance: T;
      if (definition.factory) {
        instance = definition.factory(...resolvedDependencies);
      } else if (typeof definition.instance === 'function') {
        instance = new (definition.instance as any)(...resolvedDependencies);
      } else {
        instance = definition.instance;
      }

      // Store instance for singletons
      if (definition.singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      this.circularDependencyCheck.delete(name);
    }
  }

  /**
   * Check if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Remove a service
   */
  remove(name: string): void {
    this.services.delete(name);
    this.instances.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.circularDependencyCheck.clear();
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service definition
   */
  getDefinition(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }

  /**
   * Validate all dependencies are satisfied
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [name, definition] of this.services) {
      for (const dependency of definition.dependencies) {
        if (!this.services.has(dependency)) {
          errors.push(`Service '${name}' depends on unregistered service '${dependency}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    for (const [name, definition] of this.services) {
      graph[name] = definition.dependencies;
    }

    return graph;
  }

  /**
   * Get topological sort of services
   */
  getTopologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving '${name}'`);
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const definition = this.services.get(name);
      if (definition) {
        for (const dependency of definition.dependencies) {
          visit(dependency);
        }
      }
      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of this.services.keys()) {
      if (!visited.has(name)) {
        visit(name);
      }
    }

    return result;
  }

  /**
   * Create a scoped container
   */
  createScope(): ServiceContainer {
    const scopedContainer = new ServiceContainer();
    
    // Copy service definitions but not instances
    for (const [name, definition] of this.services) {
      scopedContainer.services.set(name, { ...definition });
    }

    return scopedContainer;
  }

  /**
   * Dispose of all singleton instances
   */
  dispose(): void {
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.error(`Error disposing service '${name}':`, error);
        }
      }
    }
    this.instances.clear();
  }
}
