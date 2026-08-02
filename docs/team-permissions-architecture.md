# Miembros del equipo, permisos y comisiones

**Amazing Nails Admin · Propuesta de arquitectura**

Estructura de base de datos y lógica de autorización para que técnicos, recepcionistas y administradores compartan un solo sistema sin pisarse los datos entre sí — y un esquema de comisiones que se configura, no se programa.

## Principios de diseño

1. **Catálogo, no ENUM** — Roles, permisos y tipos de comisión viven en tablas, no en `ENUM` de Postgres. Agregar uno nuevo es un `INSERT`, no una migración.
2. **Rol + excepción** — Cada usuario hereda permisos de su rol y puede tener excepciones individuales encima. Recepcionista A y B parten del mismo rol y terminan distintas.
3. **Instantánea histórica** — Lo que se pagó o se ganó se congela en el momento del hecho. Cambiar una regla mañana no reescribe lo de ayer — el mismo principio que ya usa `appointment_services.price_at_booking` en el esquema actual.
4. **Una sola puerta de autorización** — El aislamiento de datos del técnico se decide en un único punto del backend, nunca en cada endpoint por separado ni confiando en el cliente.

---

## Parte A — Equipo, roles y permisos

### A1 · Mapa de relaciones

```
roles          ──1:N──  users                      (via role_id)
roles          ──N:M──  permissions                 (via role_permissions)
users          ──N:M──  permissions                 (via user_permission_overrides, excepciones)
users          ──1:1──  team_members                (solo si es personal reservable)
team_members   ──1:N──  team_member_schedules        (horario semanal)
team_members   ──N:1──  commission_schemes           (esquema activo)
appointments   ──N:1──  users                        (technician_id, sin cambios)
```

### A2 · Roles y permisos

#### `roles` (catálogo)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| slug | VARCHAR(50) UNIQUE | código estable: `admin`, `receptionist`, `technician` |
| name | VARCHAR(100) | nombre visible en la UI |
| description | TEXT | |
| is_system | BOOLEAN DEFAULT false | protege los 3 roles base contra borrado accidental |
| created_at, updated_at | TIMESTAMPTZ | |

#### `permissions` (catálogo)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| key | VARCHAR(100) UNIQUE | ej. `appointments.manage.own`, `pricing.modify` |
| category | VARCHAR(50) | agrupa la UI: "Citas", "Precios", "Equipo"… |
| description | TEXT | |

Nomenclatura `recurso.acción.alcance`: `appointments.manage.own` vs `appointments.manage.any` es la diferencia entre técnico y recepcionista.

#### `role_permissions` (unión)

| Columna | Tipo | Notas |
|---|---|---|
| role_id | FK → roles | |
| permission_id | FK → permissions | |
| — | PK (role_id, permission_id) | permisos *por defecto* de cada rol |

#### `user_permission_overrides` (unión)

| Columna | Tipo | Notas |
|---|---|---|
| user_id | FK → users | |
| permission_id | FK → permissions | |
| effect | VARCHAR(6) CHECK | `grant` añade lo que el rol no da · `revoke` quita lo que el rol sí da |
| granted_by | FK → users, NULL | qué administrador lo configuró |
| granted_at | TIMESTAMPTZ | |
| — | PK (user_id, permission_id) | una sola excepción por permiso y usuario |

**Esta es la pieza que resuelve el requisito de que el permiso de precios no dependa únicamente del rol:** Recepcionista A y B comparten `role_id`; solo A tiene una fila `grant` sobre `pricing.modify`.

#### `users` (modificación de tabla existente)

| Columna | Cambio |
|---|---|
| role (ENUM) | se elimina |
| role_id (FK → roles, NOT NULL) | se agrega |

Resto de la tabla sin cambios. Migración de datos: `owner→admin`, `reception→receptionist`, `technician→technician`.

### A3 · Cómo se resuelven los permisos efectivos

```
efectivos(usuario) =
    permisos_del_rol(usuario.role_id)
    ∪ { p : override(usuario, p).effect = 'grant' }
    − { p : override(usuario, p).effect = 'revoke' }

tienePermiso(usuario, clave) → clave ∈ efectivos(usuario)
```

**Ejemplo — recepcionistas:**

| Usuario | role_id | Excepción en user_permission_overrides | ¿pricing.modify? |
|---|---|---|---|
| Recepcionista A | receptionist | `(pricing.modify, grant)` | ✓ sí |
| Recepcionista B | receptionist | ninguna | ✗ no |

Se calcula una vez por request (al autenticar) y se guarda en el contexto de la sesión — no se re-consulta la base en cada verificación de permiso dentro del mismo request.

### A4 · Horarios del técnico

Mismo patrón que `operating_hours` / `operating_hour_slots` para el salón, ahora por persona, más una tabla de excepciones (vacaciones, incapacidad) independiente del calendario general.

#### `team_member_schedules`

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| team_member_id | FK → team_members | |
| day_of_week | SMALLINT CHECK 0–6 | |
| enabled | BOOLEAN | |
| — | UNIQUE (team_member_id, day_of_week) | |

#### `team_member_schedule_slots`

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| schedule_id | FK → team_member_schedules ON DELETE CASCADE | |
| start_time, end_time | TIME | CHECK end_time > start_time — permite turnos partidos |

#### `team_member_time_off`

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| team_member_id | FK → team_members | |
| start_date, end_date | DATE | |
| type | VARCHAR(20) CHECK | `vacation` · `sick` · `personal` · `other` |
| reason | VARCHAR(200) | |

Disponibilidad real de un técnico = `team_member_schedules` ∩ turnos de `team_member_schedule_slots` − `team_member_time_off` − días no laborables del salón − citas ya ocupadas. El endpoint de disponibilidad cruza las cuatro fuentes; no se duplica ninguna.

### A5 · Cómo se garantiza el aislamiento de datos del técnico

El id del técnico se toma de la sesión autenticada, no del request — ni por URL, ni por API.

```ts
// MAL — confía en lo que manda el cliente
const técnicoId = req.query.technicianId;
db.query('SELECT * FROM appointments WHERE technician_id = $1', [técnicoId]);

// BIEN — un único resolutor de alcance, usado por todos los endpoints
function alcanceTecnico(sesión, idSolicitado) {
  if (tienePermiso(sesión.usuario, 'appointments.manage.any')) {
    return idSolicitado ?? null;      // recepción/admin: puede filtrar o ver todo
  }
  return sesión.usuario.id;           // técnico: se ignora cualquier id ajeno
}
```

Esta función vive en **una sola capa de autorización** (middleware o servicio compartido), no repetida a mano en cada ruta.

> **Defensa adicional — Row-Level Security.** Como capa extra (no sustituta), Postgres soporta `ROW LEVEL SECURITY` con políticas que leen `current_setting('app.user_id')`, fijado con `SET LOCAL` al abrir cada transacción. Vale la pena activarlo cuando el sistema madure, pero la lógica de "rol + excepción" es difícil de expresar solo en SQL — la puerta principal sigue siendo el backend.

### A6 · Validaciones

**En la base de datos**
- `appointments.technician_id` sigue `NOT NULL` cuando lo crea un técnico.
- `user_permission_overrides.effect` restringido por `CHECK` a `grant`/`revoke`.
- FK hacia registros con historial (`team_members`, `services` con comisiones) usan `ON DELETE RESTRICT`, igual que `appointment_services`. Se desactiva, no se borra.
- `roles.is_system = true` no se puede borrar — se aplica en el backend, no con un trigger, para dar un mensaje de error legible.

**En el backend**
- Todo endpoint de escritura sobre citas pasa por `alcanceTecnico()` antes de tocar la base, sin excepción.
- Cambios de precio, descuento o promoción verifican `tienePermiso(usuario, 'pricing.modify')` en el servidor, aunque el campo llegue en el payload.
- Crear una cita valida que el técnico destino tenga turno activo ese día/hora (`team_member_schedules` + `time_off`).
- "Ver calendario de otro técnico" para un usuario con rol técnico devuelve 403, no una lista vacía.

### A7 · Casos especiales

| Escenario | Resolución |
|---|---|
| Se desactiva la cuenta de un técnico con citas futuras | `users.is_active = false` bloquea el login; `team_members` y sus citas quedan intactos (RESTRICT, no CASCADE). |
| Un empleado es recepcionista y también atiende clientes | `team_members` no depende de `role_id` — ver A8. |
| Cambia el esquema de comisión de un técnico a mitad de mes | Las `commission_entries` ya calculadas no se tocan (instantánea). Solo las citas completadas después usan el esquema nuevo. |
| Se elimina un servicio que ya generó comisiones | `commission_entries.service_id` es `ON DELETE RESTRICT`: no se borra, solo se desactiva. |
| Dos administradores editan permisos del mismo usuario a la vez | PK compuesta `(user_id, permission_id)` impide duplicados; el endpoint hace `UPSERT` (`ON CONFLICT DO UPDATE`). |
| Un rol se queda sin usuarios asignados | No pasa nada — sigue siendo válido y reutilizable. |
| Recepcionista sin permiso de precios llama la API directo | El backend ignora o rechaza el campo de precio aunque exista en el payload. |

### A8 · Recomendación adicional

> **Más allá de lo pedido.** Separa "puede iniciar sesión y hacer clic en cosas" de "es personal reservable por un cliente". Lo primero es `role_id`. Lo segundo es, simplemente, tener una fila en `team_members`.
>
> Si "ser técnico" dependiera de `role_id = technician`, el caso de la dueña que también hace uñas obligaría a elegir un solo rol y perder o el acceso administrativo o el calendario propio. Al desacoplarlo, cualquier usuario con cualquier rol puede tener (o no) un perfil reservable, con su horario y su esquema de comisión, sin excepciones especiales en el código.

---

## Parte B — Sistema de comisiones

### B1 · Principios

Evitar "un único porcentaje en la tabla de empleados": separar **qué tipo** de comisión existe, **qué regla** aplica a cada servicio, y **qué se ganó** en cada cita — tres capas independientes.

> **Por qué tabla de tipos y no ENUM.** Agregar "comisión por meta mensual" el próximo año debe ser un `INSERT` en `commission_types`, no una migración que toque la tabla de empleados ni el código de cálculo existente.

### B2 · Tablas

#### `commission_types` (catálogo)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| code | VARCHAR(30) UNIQUE | `percentage`, `fixed_amount`, futuros: `tiered`, `goal_bonus`… |
| name | VARCHAR(100) | "Porcentaje", "Monto fijo" |

#### `commission_schemes`

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| name | VARCHAR(100) | plantilla reutilizable, puede compartirse entre varios técnicos |
| description | TEXT | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPTZ | |

#### `commission_rules` (el corazón del sistema)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| scheme_id | FK → commission_schemes ON DELETE CASCADE | |
| service_id | FK → services, NULL | regla específica para un servicio |
| category_id | FK → service_categories, NULL | regla para toda una categoría |
| commission_type_id | FK → commission_types | |
| value | NUMERIC(10,2) | puntos de porcentaje o monto |
| config | JSONB, NULL | parámetros extra para tipos futuros |
| — | CHECK (service_id IS NULL OR category_id IS NULL) | una regla apunta a una sola cosa |

Índices únicos parciales garantizan como máximo una regla por servicio, una por categoría, y **una sola regla por defecto** (ambos NULL) por esquema.

#### `team_members.commission_scheme_id` (columna, no tabla nueva)

FK → commission_schemes, NULL — esquema vigente hoy para ese técnico.

#### `commission_entries` (instantánea histórica)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| appointment_service_id | FK → appointment_services, UNIQUE | una comisión por línea de servicio |
| team_member_id | FK → team_members | copia — quién la ganó |
| service_id | FK → services RESTRICT | copia — qué servicio |
| commission_scheme_id | FK → commission_schemes | referencia informativa |
| commission_rule_id | FK → commission_rules, NULL ON DELETE SET NULL | qué regla exacta aplicó |
| commission_type_code | VARCHAR(30) | copia de `commission_types.code` en el momento |
| base_amount | NUMERIC(10,2) | precio del servicio sobre el que se calculó |
| rate_value | NUMERIC(10,2) | copia del `value` de la regla usada |
| commission_amount | NUMERIC(10,2) NOT NULL | monto real a pagar |
| status | VARCHAR(20) CHECK | `pending` · `approved` · `paid` · `voided` |
| payout_id | FK → commission_payouts, NULL | en qué liquidación se pagó |
| calculated_at | TIMESTAMPTZ | |

**Nada de esto se vuelve a leer de `commission_rules` después de calcularse.** Cada número que explica el monto queda copiado en la fila — el mismo patrón que `appointment_services.price_at_booking`.

#### `commission_payouts` (liquidaciones)

| Columna | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| team_member_id | FK → team_members | |
| period_start, period_end | DATE | |
| total_amount | NUMERIC(10,2) | suma de las commission_entries incluidas |
| status | VARCHAR(20) CHECK | `draft` · `approved` · `paid` |
| paid_at | TIMESTAMPTZ, NULL | |
| created_by | FK → users, NULL | |

Una vez que una `commission_entries` pertenece a un payout `paid`, se vuelve de solo lectura — una corrección agrega una fila nueva, nunca edita la existente.

### B3 · Resolución de la regla aplicable

Orden de especificidad: servicio exacto → categoría → regla por defecto del esquema.

```
resolverRegla(esquema, servicio):
    regla = buscar WHERE scheme_id = esquema AND service_id = servicio.id
    si no existe → regla = buscar WHERE scheme_id = esquema AND category_id = servicio.category_id
    si no existe → regla = buscar WHERE scheme_id = esquema AND service_id IS NULL AND category_id IS NULL
    si no existe → error: esquema incompleto, requiere regla por defecto
```

**Ejemplo — tres manicuristas:**

| Esquema | Regla | Tipo | Valor |
|---|---|---|---|
| Manicurista A | Manicure Semipermanente | percentage | 15 |
| Manicurista A | Pedicure SPA | percentage | 20 |
| Manicurista A | Uñas Acrílicas | percentage | 18 |
| Manicurista A | Nail Art | fixed_amount | 80.00 |
| Manicurista B | *(regla por defecto)* | percentage | 20 |
| Manicurista C | Manicure Semipermanente | fixed_amount | 60.00 |
| Manicurista C | Pedicure SPA | fixed_amount | 120.00 |
| Manicurista C | Builder Gel | percentage | 15 |

Tres técnicos, tres estrategias distintas, cero cambios de esquema — solo filas distintas en `commission_rules`.

### B4 · Ciclo de vida de una comisión

```
Cita completada → cálculo (resolverRegla + snapshot) → status: pending
                → status: approved (admin revisa el período)
                → status: paid (agrupada en un commission_payouts)
```

El cálculo ocurre en código de aplicación, no en un trigger de base de datos, porque la lógica de tipos de comisión cambia con el tiempo y es más fácil de mantener y probar fuera de SQL.

### B5 · Cómo crece sin rediseño

| Funcionalidad futura | Cómo se soporta |
|---|---|
| Bonificaciones adicionales | Nueva fila en `commission_types` (`bonus_flat`) + tabla hermana `bonus_entries` que reutiliza `commission_payouts`. |
| Comisión por meta mensual | Tipo `monthly_goal` + tabla `commission_goals` (técnico, período, meta). |
| Comisión por paquete de servicios | `commission_rules` gana columna opcional `package_id`, mismo patrón que `service_id`/`category_id`. |
| Comisión especial por promoción | Columna opcional `promotion_id` en `commission_rules`. |
| Esquemas distintos por sucursal | `commission_schemes.branch_id` nulo hoy, poblado cuando exista `branches`. |
| Historial completo de liquidaciones | Ya cubierto por `commission_payouts`. |
| Nómina completa | `commission_payouts` se convierte en insumo de un futuro `payroll_runs` que suma comisión + salario fijo + deducciones. |

---

## Resumen de tablas

**Nuevas — equipo y permisos:** `roles`, `permissions`, `role_permissions`, `user_permission_overrides`, `team_members`, `team_member_schedules`, `team_member_schedule_slots`, `team_member_time_off`.

**Nuevas — comisiones:** `commission_types`, `commission_schemes`, `commission_rules`, `commission_entries`, `commission_payouts`.

**Modificadas:** `users` (columna `role` → `role_id`).

**Mencionadas para el futuro, sin crear todavía:** `branches`, `commission_goals`, `bonus_entries`, `payroll_runs`.

## Próximos pasos

1. **Autenticación real primero.** Hoy el login es una simulación con `localStorage` — este sistema de permisos necesita una sesión real de backend para tener de dónde leer `usuario.id`. Se recomienda implementarla como parte del mismo trabajo, no después.
2. **Alcance de la primera entrega.** ¿Roles + permisos + horarios primero (lo que ya bloquea el uso diario), y comisiones en una segunda fase? ¿O todo junto?
