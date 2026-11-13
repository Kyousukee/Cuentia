const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

/** `12345` → `$12.345` */
export function formatCLP(value: number): string {
  // Normaliza el signo menos y espacios que algunos motores agregan.
  return clp.format(Math.round(value)).replace(/\s/g, '');
}

/** `12345` → `12.345` (sin símbolo) */
export function formatNumber(value: number): string {
  return plain.format(Math.round(value));
}

/** Formato compacto para ejes: `$1,2M`, `$350k`. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}$${v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',').replace(',0', '')}M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/** Extrae un monto entero de un texto como `"$12.345"` o `"12345"`. */
export function parseCLP(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}
