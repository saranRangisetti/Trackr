/**
 * ServiceContainer Unit Tests
 * Comprehensive testing for dependency injection container
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ServiceContainer from '../../core/architecture/ServiceContainer';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('Service Registration', () => {
    it('should register a simple service', () => {
      const service = { name: 'test' };
      container.register('testService', service);
      
      expect(container.has('testService')).toBe(true);
    });

    it('should register a factory service', () => {
      const factory = () => ({ name: 'factory' });
      container.register('factoryService', factory);
      
      expect(container.has('factoryService')).toBe(true);
    });

    it('should throw error when registering duplicate service', () => {
      container.register('duplicate', { name: 'first' });
      
      expect(() => {
        container.register('duplicate', { name: 'second' });
      }).toThrow("Service 'duplicate' is already registered");
    });

    it('should register service with dependencies', () => {
      container.register('dependency', { name: 'dep' });
      container.register('service', { name: 'service' }, ['dependency']);
      
      expect(container.has('service')).toBe(true);
    });
  });

  describe('Service Resolution', () => {
    it('should resolve simple service', () => {
      const service = { name: 'test' };
      container.register('testService', service);
      
      const resolved = container.get('testService');
      expect(resolved).toBe(service);
    });

    it('should resolve factory service', () => {
      const factory = () => ({ name: 'factory' });
      container.register('factoryService', factory);
      
      const resolved = container.get('factoryService');
      expect(resolved).toEqual({ name: 'factory' });
    });

    it('should resolve service with dependencies', () => {
      class Dependency {
        name = 'dependency';
      }
      
      class Service {
        constructor(public dep: Dependency) {}
      }
      
      container.register('dependency', Dependency);
      container.register('service', Service, ['dependency']);
      
      const resolved = container.get('service');
      expect(resolved).toBeInstanceOf(Service);
      expect(resolved.dep).toBeInstanceOf(Dependency);
    });

    it('should throw error when resolving non-existent service', () => {
      expect(() => {
        container.get('nonExistent');
      }).toThrow("Service 'nonExistent' is not registered");
    });

    it('should detect circular dependencies', () => {
      container.register('serviceA', class ServiceA {
        constructor(public dep: any) {}
      }, ['serviceB']);
      
      container.register('serviceB', class ServiceB {
        constructor(public dep: any) {}
      }, ['serviceA']);
      
      expect(() => {
        container.get('serviceA');
      }).toThrow('Circular dependency detected');
    });
  });

  describe('Singleton Behavior', () => {
    it('should return same instance for singleton services', () => {
      const factory = () => ({ id: Math.random() });
      container.register('singleton', factory, [], true);
      
      const instance1 = container.get('singleton');
      const instance2 = container.get('singleton');
      
      expect(instance1).toBe(instance2);
    });

    it('should return new instance for non-singleton services', () => {
      const factory = () => ({ id: Math.random() });
      container.register('transient', factory, [], false);
      
      const instance1 = container.get('transient');
      const instance2 = container.get('transient');
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Service Management', () => {
    it('should remove service', () => {
      container.register('removable', { name: 'test' });
      expect(container.has('removable')).toBe(true);
      
      container.remove('removable');
      expect(container.has('removable')).toBe(false);
    });

    it('should clear all services', () => {
      container.register('service1', { name: 'test1' });
      container.register('service2', { name: 'test2' });
      
      expect(container.getServiceNames()).toHaveLength(2);
      
      container.clear();
      expect(container.getServiceNames()).toHaveLength(0);
    });

    it('should get service names', () => {
      container.register('service1', { name: 'test1' });
      container.register('service2', { name: 'test2' });
      
      const names = container.getServiceNames();
      expect(names).toContain('service1');
      expect(names).toContain('service2');
    });
  });

  describe('Dependency Validation', () => {
    it('should validate all dependencies are satisfied', () => {
      container.register('service', { name: 'test' }, ['missingDep']);
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Service 'service' depends on unregistered service 'missingDep'");
    });

    it('should return valid when all dependencies are satisfied', () => {
      container.register('dependency', { name: 'dep' });
      container.register('service', { name: 'test' }, ['dependency']);
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Dependency Graph', () => {
    it('should return dependency graph', () => {
      container.register('dep1', { name: 'dep1' });
      container.register('dep2', { name: 'dep2' }, ['dep1']);
      container.register('service', { name: 'service' }, ['dep1', 'dep2']);
      
      const graph = container.getDependencyGraph();
      expect(graph).toEqual({
        dep1: [],
        dep2: ['dep1'],
        service: ['dep1', 'dep2']
      });
    });
  });

  describe('Topological Sort', () => {
    it('should return services in dependency order', () => {
      container.register('dep1', { name: 'dep1' });
      container.register('dep2', { name: 'dep2' }, ['dep1']); 
      container.register('service', { name: 'service' }, ['dep2']);
      
      const sorted = container.getTopologicalSort();
      expect(sorted.indexOf('dep1')).toBeLessThan(sorted.indexOf('dep2'));
      expect(sorted.indexOf('dep2')).toBeLessThan(sorted.indexOf('service'));
    });

    it('should throw error for circular dependencies in topological sort', () => {
      container.register('serviceA', { name: 'A' }, ['serviceB']);
      container.register('serviceB', { name: 'B' }, ['serviceA']);
      
      expect(() => {
        container.getTopologicalSort();
      }).toThrow('Circular dependency detected');
    });
  });

  describe('Scoped Container', () => {
    it('should create scoped container with same definitions', () => {
      container.register('service', { name: 'test' });
      
      const scoped = container.createScope();
      expect(scoped.has('service')).toBe(true);
    });

    it('should not share instances between containers', () => {
      const factory = () => ({ id: Math.random() });
      container.register('service', factory, [], true);
      
      const scoped = container.createScope();
      
      const original = container.get('service');
      const scopedInstance = scoped.get('service');
      
      expect(original).not.toBe(scopedInstance);
    });
  });

  describe('Disposal', () => {
    it('should dispose singleton instances', () => {
      const disposeMock = vi.fn();
      const service = { dispose: disposeMock };
      
      container.register('disposable', service, [], true);
      container.get('disposable'); // Create instance
      container.dispose();
      
      expect(disposeMock).toHaveBeenCalled();
    });

    it('should handle disposal errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const service = { 
        dispose: () => { throw new Error('Disposal failed'); }
      };
      
      container.register('failing', service, [], true);
      container.get('failing');
      container.dispose();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error disposing service 'failing':",
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});
