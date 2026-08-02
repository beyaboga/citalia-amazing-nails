/**
 * Almacenamiento de comprobantes de gasto en disco, FUERA de `public`: son
 * documentos financieros y solo se sirven por un endpoint autenticado
 * (`/api/expenses/[id]/receipt`), nunca como archivo público.
 */
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { RECEIPT_EXTENSIONS, RECEIPT_MAX_BYTES } from './finance';

const RECEIPTS_DIR = path.join(process.cwd(), 'uploads', 'receipts');

export interface SavedReceipt {
  filename: string;
}

/** Valida y guarda un comprobante; devuelve el nombre generado o un error legible. */
export async function saveReceipt(file: File): Promise<SavedReceipt | { error: string }> {
  const ext = RECEIPT_EXTENSIONS[file.type];
  if (!ext) return { error: 'El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF' };
  if (file.size > RECEIPT_MAX_BYTES) return { error: 'El comprobante no puede superar 5 MB' };

  await mkdir(RECEIPTS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(RECEIPTS_DIR, filename), buffer);
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
  try {
    const body = await readFile(path.join(RECEIPTS_DIR, filename));
    const ext = filename.split('.').pop() ?? '';
    return { body, contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

/** Borra un comprobante del disco (al reemplazarlo o eliminar el gasto). Silencioso. */
export async function deleteReceipt(filename: string | null): Promise<void> {
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) return;
  try {
    await unlink(path.join(RECEIPTS_DIR, filename));
  } catch {
    /* no existía: nada que hacer */
  }
}
