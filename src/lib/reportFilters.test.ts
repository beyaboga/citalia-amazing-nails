import { describe, it, expect } from 'vitest';
import { today, thisWeek, thisMonth, lastMonth, rangeForPreset } from './reportFilters';

describe('today', () => {
  it('devuelve la misma fecha en from y to', () => {
    expect(today(new Date(2026, 6, 15))).toEqual({ from: '2026-07-15', to: '2026-07-15' });
  });
});

describe('thisWeek', () => {
  it('semana inicia lunes: miércoles cae dentro de la semana que empezó el lunes anterior', () => {
    // 2026-07-01 es miércoles -> semana: lunes 2026-06-29 a domingo 2026-07-05.
    expect(thisWeek(new Date(2026, 6, 1))).toEqual({ from: '2026-06-29', to: '2026-07-05' });
  });

  it('domingo pertenece a la semana que ya empezó (no a la siguiente)', () => {
    // 2026-07-05 es domingo -> misma semana que el miércoles anterior.
    expect(thisWeek(new Date(2026, 6, 5))).toEqual({ from: '2026-06-29', to: '2026-07-05' });
  });

  it('lunes es el propio inicio de semana', () => {
    expect(thisWeek(new Date(2026, 6, 6))).toEqual({ from: '2026-07-06', to: '2026-07-12' });
  });
});

describe('thisMonth', () => {
  it('devuelve el mes calendario completo', () => {
    expect(thisMonth(new Date(2026, 6, 15))).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('respeta meses cortos (febrero)', () => {
    expect(thisMonth(new Date(2026, 1, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('lastMonth', () => {
  it('devuelve el mes calendario anterior', () => {
    expect(lastMonth(new Date(2026, 6, 15))).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });

  it('enero -> diciembre del año anterior', () => {
    expect(lastMonth(new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
});

describe('rangeForPreset', () => {
  it('CUSTOM devuelve el rango personalizado tal cual', () => {
    const custom = { from: '2026-01-05', to: '2026-01-20' };
    expect(rangeForPreset('CUSTOM', custom)).toEqual(custom);
  });

  it('MONTH ignora el rango personalizado y usa el mes actual real', () => {
    const result = rangeForPreset('MONTH', { from: '2020-01-01', to: '2020-01-02' });
    expect(result.from).not.toBe('2020-01-01');
  });
});
