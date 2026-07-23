import { logger } from "../logging/logger";
import type { DomainEvent, DomainEventName, EventOf } from "./catalog";

type Handler<N extends DomainEventName> = (event: EventOf<N>) => void | Promise<void>;

/**
 * Bus d'événements domaine in-process (synchrone dans la requête).
 * Les réactions lourdes ne s'exécutent PAS ici : elles enfilent un job (async-first).
 * Un handler qui échoue n'interrompt pas les autres ni la requête.
 */
class EventBus {
  private readonly handlers = new Map<DomainEventName, Set<(e: DomainEvent) => void | Promise<void>>>();

  on<N extends DomainEventName>(name: N, handler: Handler<N>): () => void {
    const set = this.handlers.get(name) ?? new Set();
    set.add(handler as (e: DomainEvent) => void | Promise<void>);
    this.handlers.set(name, set);
    return () => set.delete(handler as (e: DomainEvent) => void | Promise<void>);
  }

  async emit(event: DomainEvent): Promise<void> {
    const set = this.handlers.get(event.name);
    if (!set) return;
    await Promise.all(
      [...set].map(async (h) => {
        try {
          await h(event);
        } catch (cause) {
          logger.error("event_handler_error", { event: event.name, cause: String(cause) });
        }
      }),
    );
  }
}

export const eventBus = new EventBus();
