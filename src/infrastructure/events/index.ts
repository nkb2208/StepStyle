import { randomUUID } from "node:crypto";
import { logger } from "../logger";

/**
 * Event-driven synchronization layer (ready for a broker).
 *
 * Events are published for NON-BLOCKING state synchronization with downstream
 * services (e.g. projections, caches, search indexes). They are NEVER used for
 * synchronous request authorization — authorization always happens at the
 * service boundary against the signed JWT.
 *
 * To switch to RabbitMQ / Kafka / NATS, implement the `EventPublisher`
 * interface with a broker client and register it via `setPublisher()`.
 */
export type AuthEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.role.changed"
  | "user.password.changed";

export interface AuthDomainEvent<T = unknown> {
  id: string;
  type: AuthEventType;
  occurredAt: string;
  data: T;
}

export type EventListener = (event: AuthDomainEvent) => void | Promise<void>;

export interface EventPublisher {
  publish(event: AuthDomainEvent): Promise<void>;
}

class InProcessEventBus {
  private listeners = new Map<AuthEventType | "*", Set<EventListener>>();
  private publisher: EventPublisher = {
    publish: async (event) => {
      logger.info("domain event", { eventId: event.id, eventType: event.type });
    },
  };

  setPublisher(publisher: EventPublisher): void {
    this.publisher = publisher;
  }

  on(type: AuthEventType | "*", listener: EventListener): () => void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
    return () => set.delete(listener);
  }

  async publish<T>(type: AuthEventType, data: T): Promise<AuthDomainEvent<T>> {
    const event: AuthDomainEvent<T> = {
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      data,
    };

    try {
      await this.publisher.publish(event as AuthDomainEvent);
    } catch (error) {
      logger.error("Failed to publish domain event", {
        eventType: type,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    const targeted = [...(this.listeners.get(type) ?? []), ...(this.listeners.get("*") ?? [])];
    for (const listener of targeted) {
      try {
        await listener(event as AuthDomainEvent);
      } catch (error) {
        logger.error("Event listener failed", {
          eventType: type,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return event;
  }
}

export const eventBus = new InProcessEventBus();

export function publishAuthEvent<T>(type: AuthEventType, data: T): void {
  void eventBus.publish(type, data);
}
