import { describe, it, expect } from 'vitest';
import { classifyCustomer, type ClassifiableCustomer } from './customerSegments';

/** Fecha 'YYYY-MM-DD' hace N días, relativa a hoy (las pruebas no deben depender de una fecha fija). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const base: ClassifiableCustomer = {
  registrationDate: daysAgo(400),
  firstVisit: daysAgo(400),
  lastVisit: daysAgo(10),
  visitCount: 5,
  totalSpent: 2000,
  recentVisitCount: 1,
};

describe('classifyCustomer', () => {
  it('cliente sin visitas, registrada hace <= 30 días -> NUEVA', () => {
    expect(classifyCustomer({ ...base, visitCount: 0, registrationDate: daysAgo(5), lastVisit: null })).toBe('NUEVA');
  });

  it('cliente sin visitas, registrada hace > 30 días -> INACTIVA', () => {
    expect(classifyCustomer({ ...base, visitCount: 0, registrationDate: daysAgo(60), lastVisit: null })).toBe('INACTIVA');
  });

  it('última visita hace > 90 días -> INACTIVA, sin importar gasto o frecuencia previa', () => {
    expect(
      classifyCustomer({ ...base, lastVisit: daysAgo(91), totalSpent: 50000, recentVisitCount: 10 })
    ).toBe('INACTIVA');
  });

  it('última visita hace exactamente 90 días -> NO inactiva (límite inclusivo)', () => {
    expect(classifyCustomer({ ...base, lastVisit: daysAgo(90) })).not.toBe('INACTIVA');
  });

  it('gasto total >= 10000 y activa -> VIP', () => {
    expect(classifyCustomer({ ...base, totalSpent: 10000 })).toBe('VIP');
    expect(classifyCustomer({ ...base, totalSpent: 15000 })).toBe('VIP');
  });

  it('VIP tiene prioridad sobre frecuente', () => {
    expect(classifyCustomer({ ...base, totalSpent: 20000, recentVisitCount: 5 })).toBe('VIP');
  });

  it('3+ visitas en los últimos 90 días (sin ser VIP) -> FRECUENTE', () => {
    expect(classifyCustomer({ ...base, recentVisitCount: 3, totalSpent: 500 })).toBe('FRECUENTE');
  });

  it('primera visita hace <= 30 días (sin ser VIP ni frecuente) -> NUEVA', () => {
    expect(
      classifyCustomer({ ...base, firstVisit: daysAgo(20), recentVisitCount: 1, totalSpent: 500, visitCount: 1 })
    ).toBe('NUEVA');
  });

  it('nueva (por primera visita) tiene prioridad sobre "sin clasificar" pero no sobre VIP/frecuente', () => {
    expect(
      classifyCustomer({ ...base, firstVisit: daysAgo(5), recentVisitCount: 3, totalSpent: 500 })
    ).toBe('FRECUENTE');
  });

  it('cliente activa sin calificar en ningún segmento -> REGULAR', () => {
    expect(
      classifyCustomer({ ...base, firstVisit: daysAgo(400), recentVisitCount: 1, totalSpent: 500 })
    ).toBe('REGULAR');
  });

  it('registrationDate vacía en cliente sin visitas no revienta (Infinity -> INACTIVA)', () => {
    expect(classifyCustomer({ ...base, visitCount: 0, registrationDate: '', lastVisit: null })).toBe('INACTIVA');
  });
});
