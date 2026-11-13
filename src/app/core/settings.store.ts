import { Injectable, effect, signal } from '@angular/core';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'cuentia.theme';

/** Preferencias por dispositivo (tema). Se guardan en localStorage porque son de comodidad. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly theme = signal<ThemePref>(this.read());

  constructor() {
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

  private read(): ThemePref {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
