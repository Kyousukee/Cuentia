import { Pipe, PipeTransform } from '@angular/core';
import { formatCLP, formatCompact } from '../core/money';

@Pipe({ name: 'clp' })
export class ClpPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'full' | 'compact' | 'signed' = 'full'): string {
    const v = value ?? 0;
    if (mode === 'compact') return formatCompact(v);
    if (mode === 'signed') return (v > 0 ? '+' : v < 0 ? '−' : '') + formatCLP(Math.abs(v));
    return v < 0 ? '−' + formatCLP(-v) : formatCLP(v);
  }
}
