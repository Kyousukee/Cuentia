import { formatCLP, formatCompact, parseCLP } from './money';
import { ClpPipe } from '../shared/clp.pipe';

describe('money (CLP)', () => {
  it('formatea sin decimales con punto de miles', () => {
    expect(formatCLP(12345)).toBe('$12.345');
    expect(formatCLP(1500000)).toBe('$1.500.000');
    expect(formatCLP(0)).toBe('$0');
    expect(formatCLP(999.6)).toBe('$1.000');
  });

  it('formato compacto para ejes', () => {
    expect(formatCompact(350_000)).toBe('$350k');
    expect(formatCompact(1_000_000)).toBe('$1M');
    expect(formatCompact(1_500_000)).toBe('$1,5M');
    expect(formatCompact(12_300_000)).toBe('$12M');
    expect(formatCompact(800)).toBe('$800');
  });

  it('parsea texto a entero', () => {
    expect(parseCLP('$12.345')).toBe(12345);
    expect(parseCLP('abc')).toBe(0);
  });

  it('pipe con signo', () => {
    const p = new ClpPipe();
    expect(p.transform(5000, 'signed')).toBe('+$5.000');
    expect(p.transform(-5000, 'signed')).toBe('−$5.000');
    expect(p.transform(-5000)).toBe('−$5.000');
  });
});
