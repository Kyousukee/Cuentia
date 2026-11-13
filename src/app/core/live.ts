import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';

export interface LiveSignal<T> {
  value: Signal<T>;
  loaded: Signal<boolean>;
}

/**
 * Convierte una consulta de Dexie en un signal que se actualiza solo
 * cada vez que cambian las tablas involucradas (incluso desde otra pestaña).
 */
export function liveSignal<T>(query: () => T | Promise<T>, initial: T): LiveSignal<T> {
  const value = signal<T>(initial);
  const loaded = signal(false);
  const sub = liveQuery(query).subscribe({
    next: (v) => {
      value.set(v);
      loaded.set(true);
    },
    error: (err) => console.error('[Cuentia] Error leyendo datos', err),
  });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  return { value: value.asReadonly(), loaded: loaded.asReadonly() };
}
