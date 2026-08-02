/**
 * Helpers de servidor para propinas: asignación automática cuando la cita es de una
 * sola técnica, y sugerencia de reparto (proporcional a lo que cobró cada técnica)
 * para las propinas de varias técnicas / cobros combinados.
 */

interface Queryable {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Si la cita tiene una técnica (mapeada a team_members), asigna la propina completa
 * a esa técnica y la marca DISTRIBUTED — sin paso manual. Devuelve true si asignó.
 * No aplica a cobros combinados (varias técnicas): esos quedan para repartir.
 */
export async function autoAssignTip(
  db: Queryable,
  tipId: number,
  appointmentId: number,
  distributedBy: number
): Promise<boolean> {
  const { rows: techRows } = await db.query(
    `SELECT tm.id AS "teamMemberId"
       FROM appointments a
       JOIN team_members tm ON tm.user_id = a.technician_id
      WHERE a.id = $1`,
    [appointmentId]
  );
  if (techRows.length === 0) return false; // sin técnica reservable: queda pendiente

  const { rows: tipRows } = await db.query(
    "SELECT amount::float8 AS amount, status FROM appointment_tips WHERE id = $1",
    [tipId]
  );
  if (tipRows.length === 0 || tipRows[0].status === 'DISTRIBUTED') return false;

  await db.query(
    `INSERT INTO tip_distribution (appointment_tip_id, employee_id, amount, distributed_by)
     VALUES ($1, $2, $3, $4)`,
    [tipId, techRows[0].teamMemberId, round2(tipRows[0].amount), distributedBy]
  );
  await db.query("UPDATE appointment_tips SET status = 'DISTRIBUTED' WHERE id = $1", [tipId]);
  return true;
}

export interface TipSuggestion {
  remaining: number;
  lines: { teamMemberId: number; name: string; amount: number }[];
}

/**
 * Reparto sugerido de una propina entre las técnicas que atendieron la visita
 * (todas las citas del cobro combinado, o la única cita), proporcional a lo que cobró
 * cada una. El resto se distribuye sobre lo que aún falta por repartir.
 */
export async function buildTipSuggestion(db: Queryable, tipId: number): Promise<TipSuggestion | null> {
  const { rows: t } = await db.query(
    `SELECT at.amount::float8 AS amount, at.appointment_id AS "appointmentId",
            p.payment_group_id AS "groupId",
            COALESCE((SELECT SUM(amount) FROM tip_distribution WHERE appointment_tip_id = at.id), 0)::float8 AS distributed
       FROM appointment_tips at
       LEFT JOIN payments p ON p.id = at.payment_id
      WHERE at.id = $1`,
    [tipId]
  );
  if (t.length === 0) return null;
  const tip = t[0];
  const remaining = round2(tip.amount - tip.distributed);
  if (remaining <= 0) return { remaining: 0, lines: [] };

  // Citas de la visita: el grupo completo (cobro combinado) o la cita única.
  let apptIds: number[];
  if (tip.groupId) {
    const { rows } = await db.query(
      'SELECT appointment_id AS id FROM payments WHERE payment_group_id = $1 AND voided_at IS NULL',
      [tip.groupId]
    );
    apptIds = rows.map((r) => r.id);
  } else {
    apptIds = [tip.appointmentId];
  }

  const { rows: techs } = await db.query(
    `SELECT tm.id AS "teamMemberId", u.name, SUM(aps.price_at_booking)::float8 AS revenue
       FROM appointments a
       JOIN team_members tm ON tm.user_id = a.technician_id
       JOIN users u ON u.id = a.technician_id
       JOIN appointment_services aps ON aps.appointment_id = a.id
      WHERE a.id = ANY($1)
      GROUP BY tm.id, u.name
      ORDER BY revenue DESC`,
    [apptIds]
  );
  if (techs.length === 0) return { remaining, lines: [] };

  const totalRev = techs.reduce((s, r) => s + r.revenue, 0);
  let allocated = 0;
  const lines = techs.map((tech, i) => {
    let amount: number;
    if (i === techs.length - 1) {
      amount = round2(remaining - allocated); // el resto va a la última, evita descuadres por redondeo
    } else {
      amount = totalRev > 0 ? round2((remaining * tech.revenue) / totalRev) : round2(remaining / techs.length);
      allocated = round2(allocated + amount);
    }
    return { teamMemberId: tech.teamMemberId, name: tech.name, amount };
  });

  return { remaining, lines };
}
