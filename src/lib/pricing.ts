/**
 * Reglas de negocio del precio de una cita, compartidas por el cliente y el servidor.
 *
 * Una cita admite UN solo ajuste manual del total: el cambio de precio por servicio
 * ("Cambiar precio"), que siempre exige motivo. Un código de descuento es la otra vía
 * y es excluyente con el cambio de precio, para que el total nunca tenga dos
 * rebajas manuales encadenadas.
 */

/** Motivos válidos para un cambio de precio (se guardan en el historial). */
export const PRICE_CHANGE_REASONS = [
  'Promoción especial',
  'Cliente frecuente',
  'Compensación',
  'Otro',
] as const;

/** Mensaje único para cuando se intenta combinar código y cambio de precio. */
export const PRICE_AND_CODE_ERROR =
  'No se puede aplicar un código de descuento y un cambio de precio en la misma cita';

/** Mensaje único para cuando falta el motivo del cambio de precio. */
export const PRICE_REASON_REQUIRED_ERROR = 'Indique el motivo del cambio de precio';
