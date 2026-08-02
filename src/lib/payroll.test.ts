import { describe, it, expect } from 'vitest';
import {
  salaryForPeriod,
  defaultPeriod,
  monthPeriod,
  previousCalendarMonth,
  formatMonthYear,
  formatLempiras,
  formatCommissionValue,
  schemeHasSalary,
  schemeHasCommission,
} from './payroll';

describe('salaryForPeriod', () => {
  it('devuelve el sueldo completo para MONTHLY', () => {
    expect(salaryForPeriod(4000, 'MONTHLY')).toBe(4000);
  });

  it('devuelve la mitad para BIWEEKLY', () => {
    expect(salaryForPeriod(4000, 'BIWEEKLY')).toBe(2000);
  });

  it('redondea a 2 decimales', () => {
    expect(salaryForPeriod(1000.005, 'BIWEEKLY')).toBe(500);
    expect(salaryForPeriod(999, 'BIWEEKLY')).toBe(499.5);
  });
});

describe('defaultPeriod', () => {
  it('MONTHLY: devuelve el mes calendario completo de ref', () => {
    expect(defaultPeriod('MONTHLY', new Date(2026, 6, 15))).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('BIWEEKLY: día <= 15 -> primera quincena', () => {
    expect(defaultPeriod('BIWEEKLY', new Date(2026, 6, 15))).toEqual({ from: '2026-07-01', to: '2026-07-15' });
  });

  it('BIWEEKLY: día > 15 -> segunda quincena hasta fin de mes', () => {
    expect(defaultPeriod('BIWEEKLY', new Date(2026, 6, 16))).toEqual({ from: '2026-07-16', to: '2026-07-31' });
  });

  it('BIWEEKLY respeta meses de distinta longitud (febrero)', () => {
    expect(defaultPeriod('BIWEEKLY', new Date(2026, 1, 20))).toEqual({ from: '2026-02-16', to: '2026-02-28' });
  });
});

describe('monthPeriod', () => {
  it('calcula el rango de un mes específico sin depender de "hoy"', () => {
    expect(monthPeriod(2026, 7)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('maneja diciembre (cruce de año)', () => {
    expect(monthPeriod(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('maneja febrero bisiesto vs no bisiesto', () => {
    expect(monthPeriod(2024, 2).to).toBe('2024-02-29');
    expect(monthPeriod(2026, 2).to).toBe('2026-02-28');
  });
});

describe('previousCalendarMonth', () => {
  it('mes normal: resta un mes, mismo año', () => {
    expect(previousCalendarMonth(new Date(2026, 7, 2))).toEqual({ year: 2026, month: 7 });
  });

  it('enero: retrocede a diciembre del año anterior', () => {
    expect(previousCalendarMonth(new Date(2026, 0, 15))).toEqual({ year: 2025, month: 12 });
  });
});

describe('formatMonthYear', () => {
  it('arma "Mes Año" con la primera letra en mayúscula', () => {
    const label = formatMonthYear(7, 2026);
    expect(label.startsWith('J')).toBe(true);
    expect(label).toContain('2026');
  });
});

describe('formatLempiras', () => {
  it('formatea con dos decimales y prefijo L', () => {
    expect(formatLempiras(45680)).toBe('L 45,680.00');
  });

  it('trata null/undefined como cero', () => {
    // @ts-expect-error prueba deliberada del fallback en runtime
    expect(formatLempiras(null)).toBe('L 0.00');
  });

  it('redondea correctamente a dos decimales', () => {
    expect(formatLempiras(100.005)).toBe('L 100.01');
  });
});

describe('formatCommissionValue', () => {
  it('porcentaje se muestra con %', () => {
    expect(formatCommissionValue('percentage', 15)).toBe('15%');
  });

  it('monto fijo se muestra en lempiras', () => {
    expect(formatCommissionValue('fixed_amount', 150)).toBe('L 150.00');
  });
});

describe('schemeHasSalary / schemeHasCommission', () => {
  it('FIXED: solo sueldo', () => {
    expect(schemeHasSalary('FIXED')).toBe(true);
    expect(schemeHasCommission('FIXED')).toBe(false);
  });

  it('FIXED_PLUS_COMMISSION: ambos', () => {
    expect(schemeHasSalary('FIXED_PLUS_COMMISSION')).toBe(true);
    expect(schemeHasCommission('FIXED_PLUS_COMMISSION')).toBe(true);
  });

  it('COMMISSION_ONLY: solo comisión', () => {
    expect(schemeHasSalary('COMMISSION_ONLY')).toBe(false);
    expect(schemeHasCommission('COMMISSION_ONLY')).toBe(true);
  });
});
