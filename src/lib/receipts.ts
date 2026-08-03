/**
 * Almacenamiento de comprobantes de gasto en Supabase Storage (bucket privado
 * "receipts"): son documentos financieros y solo se sirven por un endpoint
 * autenticado (`/api/expenses/[id]/receipt`), nunca como archivo público.
 *
 * Antes vivían en disco (`uploads/receipts/`) — se movió aquí porque el disco de
 * un hosting serverless (Netlify/Vercel) no es persistente entre invocaciones.
 */
import { randomUUID } from 'crypto';
import { supabaseAdmin, RECEIPTS_BUCKET } from './supabaseStorage';
import { RECEIPT_EXTENSIONS, RECEIPT_MAX_BYTES } from './finance';

export interface SavedReceipt {
  filename: string;
}

/** Valida y guarda un comprobante; devuelve el nombre generado o un error legible. */
export async function saveReceipt(file: File): Promise<SavedReceipt | { error: string }> {
  const ext = RECEIPT_EXTENSIONS[file.type];
  if (!ext) return { error: 'El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF' };
  if (file.size > RECEIPT_MAX_BYTES) return { error: 'El comprobante no puede superar 5 MB' };

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) return { error: 'No se pudo guardar el comprobante. Intente de nuevo.' };
  return { filename };
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/** Lee un comprobante para servirlo. Devuelve null si no existe. */
export async function readReceipt(filename: string): Promise<{ body: Buffer; contentType: string } | null> {
  // El nombre lo genera el servidor (uuid.ext); se rechaza cualquier separador de ruta.
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) return null;
  const { data, error } = await supabaseAdmin.storage.from(RECEIPTS_BUCKET).download(filename);
  if (error || !data) return null;
  const body = Buffer.from(await data.arrayBuffer());
  const ext = filename.split('.').pop() ?? '';
  return { body, contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream' };
}

/** Borra un comprobante (al reemplazarlo o eliminar el gasto). Silencioso. */
export async function deleteReceipt(filename: string | null): Promise<void> {
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) return;
  await supabaseAdmin.storage.from(RECEIPTS_BUCKET).remove([filename]);
}
