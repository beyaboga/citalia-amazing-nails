import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission, hasPermission } from '@/lib/auth';
import { deleteReceipt } from '@/lib/receipts';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/expenses/[id] — editar, marcar pagado o anular.
 *
 * Registrar y editar gastos PENDIENTES: `expenses.register` (admin + recepción).
 * Modificar un gasto ya PAGADO o anularlo (VOIDED): `expenses.manage` (solo admin).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission('expenses.register');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isInteger(expenseId)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

  const { rows: current } = await pool.query('SELECT status FROM expenses WHERE id = $1', [expenseId]);
  if (current.length === 0) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });

  const body = await request.json();
  const wantsVoid = body?.status === 'VOIDED';
  const isPaidNow = current[0].status === 'PAID';

  // Tocar un gasto pagado o anularlo es acción de administración.
  if ((isPaidNow || wantsVoid) && !hasPermission(auth.user, 'expenses.manage')) {
    return NextResponse.json(
      { error: 'Solo un administrador puede modificar gastos pagados o anularlos' },
      { status: 403 }
    );
  }

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const set = (col: string, value: any) => {
    fields.push(`${col} = $${i++}`);
    values.push(value);
  };

  if (body?.categoryId !== undefined) set('expense_category_id', Number(body.categoryId));
  if (body?.supplierName !== undefined) set('supplier_name', String(body.supplierName).trim() || null);
  if (body?.description !== undefined) {
    const d = String(body.description).trim();
    if (d.length < 2) return NextResponse.json({ error: 'El concepto es obligatorio' }, { status: 400 });
    set('description', d);
  }
  if (body?.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    set('amount', a);
  }
  if (body?.expenseDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.expenseDate))) return NextResponse.json({ error: 'La fecha no es válida' }, { status: 400 });
    set('expense_date', body.expenseDate);
  }
  if (body?.paymentMethodId !== undefined) set('payment_method_id', Number(body.paymentMethodId));
  if (body?.notes !== undefined) set('notes', String(body.notes).trim() || null);
  if (body?.status !== undefined) {
    if (!['PENDING', 'PAID', 'VOIDED'].includes(body.status)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    set('status', body.status);
  }

  if (fields.length === 0) return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  values.push(expenseId);
  try {
    await pool.query(`UPDATE expenses SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23503') return NextResponse.json({ error: 'La categoría o el método de pago no existe' }, { status: 400 });
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Error al actualizar el gasto' }, { status: 500 });
  }
}

/** DELETE /api/expenses/[id] — eliminar (solo administración). Borra el comprobante. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requirePermission('expenses.manage');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isInteger(expenseId)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

  const { rows } = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING receipt_file AS "receiptFile"', [expenseId]);
  if (rows.length === 0) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
  await deleteReceipt(rows[0].receiptFile);
  return NextResponse.json({ success: true });
}
