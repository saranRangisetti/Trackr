/**
 * Advanced Event Bus
 * Enterprise-grade event system with priority, filtering, and lifecycle management
 */

export interface EventHandler {
  (payload: any): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once?: boolean;
  priority?: number;
  filter?: (payload: any) => boolean;
}

export default class EventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private wildcardSubscriptions = new Set<EventSubscription>();
  private isEmitting = false;
  private emitQueue: Array<{ event: string; payload: any }> = [];

  /**
   * Subscribe to an event
   */
  on(
    event: string, 
    handler: EventHandler, 
    options: {
      priority?: number;
      once?: boolean;
      filter?: (payload: any) => boolean;
    } = {}
  ): () => void {
    const subscription: EventSubscription = {
      id: this.generateId(),
      event,
      handler,
      once: options.once || false,
      priority: options.priority || 0,
      filter: options.filter
    };

    if (event === '*') {
      this.wildcardSubscriptions.add(subscription);
    } else {
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, []);
      }
      this.subscriptions.get(event)!.push(subscription);
      this.sortSubscriptions(event);
    }

    // Return unsubscribe function
    return () => this.off(subscription.id);
  }

  /**
   * Subscribe to an event once
   */
  once(event: string, handler: EventHandler, priority: number = 0): () => void {
    return this.on(event, handler, { once: true, priority });
  }

  /**
   * Unsubscribe from an event
   */
  off(subscriptionId: string): void {
    // Remove from specific event subscriptions
    for (const [event, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        break;
      }
    }

    // Remove from wildcard subscriptions
    for (const subscription of this.wildcardSubscriptions) {
      if (subscription.id === subscriptionId) {
        this.wildcardSubscriptions.delete(subscription);
        break;
      }
    }
  }

  /**
   * Emit an event
   */
  async emit(event: string, payload: any = {}): Promise<void> {
    if (this.isEmitting) {
      this.emitQueue.push({ event, payload });
      return;
    }

    this.isEmitting = true;

    try {
      // Get subscriptions for this event
      const eventSubscriptions = this.subscriptions.get(event) || [];
      
      // Process event subscriptions
      for (const subscription of eventSubscriptions) {
        await this.processSubscription(subscription, payload);
      }

      // Process wildcard subscriptions
      for (const subscription of this.wildcardSubscriptions) {
        await this.processSubscription(subscription, payload);
      }

      // Process queued emissions
      while (this.emitQueue.length > 0) {
        const queued = this.emitQueue.shift()!;
        await this.emit(queued.event, queued.payload);
      }

    } finally {
      this.isEmitting = false;
    }
  }

  /**
   * Emit an event synchronously
   */
  emitSync(event: string, payload: any = {}): void {
    const eventSubscriptions = this.subscriptions.get(event) || [];
    
    for (const subscription of eventSubscriptions) {
      if (subscription.filter && !subscription.filter(payload)) {
        continue;
      }

      try {
        subscription.handler(payload);
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
      }

      if (subscription.once) {
        this.off(subscription.id);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.clear();
      this.wildcardSubscriptions.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    const eventSubscriptions = this.subscriptions.get(event) || [];
    return eventSubscriptions.length;
  }

  /**
   * Get all event names
   */
  eventNames(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Create a namespaced event bus
   */
  namespace(prefix: string): EventBus {
    const namespacedBus = new EventBus();
    
    // Forward events with namespace prefix
    this.on(`${prefix}:*`, (payload) => {
      const event = payload.event.replace(`${prefix}:`, '');
      namespacedBus.emit(event, payload.data);
    });

    // Forward events to parent bus
    const originalEmit = namespacedBus.emit.bind(namespacedBus);
    namespacedBus.emit = async (event: string, payload: any) => {
      await originalEmit(event, payload);
      await this.emit(`${prefix}:${event}`, { event, data: payload });
    };

    return namespacedBus;
  }

  private async processSubscription(subscription: EventSubscription, payload: any): Promise<void> {
    if (subscription.filter && !subscription.filter(payload)) {
      return;
    }

    try {
      await subscription.handler(payload);
    } catch (error) {
      console.error(`Error in event handler for '${subscription.event}':`, error);
    }

    if (subscription.once) {
      this.off(subscription.id);
    }
  }

  private sortSubscriptions(event: string): void {
    const subscriptions = this.subscriptions.get(event);
    if (subscriptions) {
      subscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  }

  private generateId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
