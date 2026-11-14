import { Injectable, effect, signal } from '@angular/core';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'cuentia.theme';
const PROJECTION_VARIABLE_KEY = 'cuentia.projection.variable';

/** Preferencias por dispositivo (tema). Se guardan en localStorage porque son de comodidad. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly theme = signal<ThemePref>(this.read());

  /** Proyección: incluir el gasto habitual (promedio de 3 meses). */
  readonly projectionVariable = signal<boolean>(this.readProjectionVariable());

  constructor() {
    effect(() => {
      const v = this.projectionVariable();
      try {
        localStorage.setItem(PROJECTION_VARIABLE_KEY, v ? '1' : '0');
      } catch {
        /* almacenamiento bloqueado: se ignora */
      }
    });

    effect(() => {
      const t = this.theme();
      const root = document.documentElement;
      if (t === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', t);
      try {
        localStorage.setItem(KEY, t);
      } catch {
        /* almacenamiento bloqueado: se ignora */
      }
    });
  }

  private readProjectionVariable(): boolean {
    try {
      return localStorage.getItem(PROJECTION_VARIABLE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private read(): ThemePref {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
