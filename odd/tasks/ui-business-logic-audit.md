# UI y lógica de negocio: correcciones de auditoría

Rama: `fix/ui-business-logic-audit`. Estrategia de entrega: `single-pr` (un PR sobre `main`, commits por unidad de trabajo). Runner: `npm test`, `npm run test:db` (pglite), `npm run typecheck`, `npm run lint`.

## Specs

- **S1** — La invitación no otorga acceso antes de que el invitado confirme su correo. Quote: *"La invitación pendiente no equivale a acceso concedido"* (`docs/ARCHITECTURE.md`). Una membresía invitada nace en estado `pending`, no ve fichas, y pasa a `active` cuando el invitado define su contraseña con el token de invitación. El estado pendiente es visible en el equipo.
- **S2** — Una asignación de profesional sobre una ficha de test-run hereda el `test_run_id` de la ficha, para que la limpieza de datos de prueba no la deje huérfana.
- **S3** — La hora de captura de una sesión no cambia con comandos posteriores. Quote: finding de auditoría: *"`captured_at` se reescribe en cada transición"*. La guarda de orden de comandos se conserva.
- **S4** — Reinvitar a una persona cuya cuenta fue dada de baja crea una cuenta nueva en lugar de fallar con un error crudo de unicidad. Quote: *"Reinvitar a alguien dado de baja revienta"*.
- **S5** — Un fallo al enviar la invitación deja una causa registrada y un diagnóstico visible; no se descarta en silencio. Quote: *"el `catch {}` vacío de `:266` se come la causa"*.
- **S6** — Un error al crear una ficha no deja el formulario sin salida: el usuario puede reintentar la misma operación o descartarla explícitamente.
- **S7** — Cada rol ve solo la navegación que puede usar; el familiar llega a sus invitaciones; la marca del shell no dice "ABA Admin" para todos.
- **S8** — Ningún enlace del landing público lleva a una ruta privada.
- **S9** — Desde una sesión se puede volver a la ficha sin depender del historial del navegador, y un conflicto de versión se presenta en lenguaje legible, no como JSON crudo.
- **S10** — Los controles que solo muestran un icono tienen nombre accesible.
- **S11** — Las fechas se formatean de forma uniforme y la agenda agrupa por la zona horaria que muestra.
- **S12** — Al invitar un correo que ya tiene una invitación pendiente se envía un correo nuevo con un token nuevo y el enlace anterior deja de servir. Quote: *"si se envia o si ya existia un invitado no se vuelve a mandar un correo con la nueva invitacion y nuevo token"*. Una cuenta con correo ya confirmado no recibe otra invitación; se le indica iniciar sesión.
- **S13** — Cuando el correo invitado ya pertenece a una cuenta con email confirmado, la invitación otorga acceso de inmediato: la membresía queda `active`, no se pide token y no se intenta un envío que el ledger rechaza. Quote: *"volvi a enviar una invitacion y me sale Ya aceptada; iniciar sesión"*.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1 | inline (DB+TS+UI+tests) | done | b7decc5 |
| T2 | S2 | inline (DB+TS+tests) | done | 20a322d |
| T3 | S3 | inline (DB+tests) | done | 7fcbd75 |
| T4 | S4 | inline (DB+TS) | done | 063cfae |
| T5 | S5 | inline (TS) | done | b7cb133 |
| T6 | S6 | inline (UI) | done | 9c7102c |
| T7 | S7 | inline (UI) | done | 9516843 |
| T8 | S8 | inline (UI) | done | bcda7d8 |
| T9 | S9 | inline (UI) | done | 05ec40b |
| T10 | S10 | inline (UI) | done | 195c6db |
| T11 | S11 | inline (UI) | done | 7ed71bc |
| T12 | S12 | inline (SQL+UI+tests) | done | 23f3f15 |
| T13 | S13 | inline (SQL+UI+tests) | done | pending commit |

## Log

- **L1** — Pedido original: "necesito que revises el proyecto y veamos que podemos mejorar o arreglar , en base a la UI y logica de negocio"
- **L2** — Autorización: "si dale guarda y vamos con todos los cambios — generate una rama entera para todos estos cambios"
- **L3** — Baseline observado antes de tocar nada: `npm run typecheck`, `npm run lint`, `npm test` (50/50) y `npm run test:db` (25/25) pasan.
- **L4** — Decisión de diseño T1: se agrega `pending` al check de `memberships`. Todas las políticas y funciones existentes exigen `status='active'`, así que una membresía pendiente no obtiene acceso. La activación ocurre en `resetPassword()` al consumir el token de invitación, que es el acto de aceptación. `require_delivery_target` acepta `pending` para permitir el envío y reenvío.
- **L5** — Corrección de la auditoría: `private.is_primary_student_supervisor` fue redefinida en `20260908140309` e **incluye** al administrador de la clínica, así que el bloqueo reportado no existe. El test lo demostró al fallar la aserción `ok=false`. El defecto real de esa función es no heredar `test_run_id`; T2 se limita a eso.
- **L6** — Decisión de diseño T3: `captured_at` queda inmutable (se fija al crear la sesión). La guarda de orden se mantiene con la comparación contra `captured_at` y los eventos ya persistidos.
- **L7** — Verificación final T1–T11: `npm run typecheck` y `npm run lint` sin errores, `npm test` 53/53, `npm run test:db` 28/28. Tarea completa; push y PR quedan a decisión del usuario.
- **L8** — Pedido textual del usuario: "si se envia o si ya existia un invitado no se vuelve a mandar un correo con la nueva invitacion y nuevo token". Causa: `aba_team_invitation_deliveries_impl` exigía `m.status='active'` para `eligible`, así que toda membresía `pending` (introducida en T1) quedaba invisible para el reenvío; además el formulario de invitación sólo mostraba `existing_membership_use_resend`. T12 incluye la migración `20261021160000_resend_pending_invitation.sql`, el reenvío explícito desde el modal (nuevo `operationId`/`idempotencyKey` → token nuevo, tokens anteriores invalidados) y un test de regresión (RED observado: `eligible:false`).
- **L9** — Reporte del usuario: al reinvitar aparece "Ya aceptada; iniciar sesión". Causa: `mvp_complete_clinic_invitation_impl` insertaba siempre `pending`, pero a una identidad con `email_confirmed_at` no se le envía correo (`invitation_already_accepted`), así que el token nunca se consumía y la membresía quedaba pendiente para siempre: sin acceso y sin otra invitación. T13 cambia el estado inicial a `active` cuando el email ya está confirmado (migración `20261021170000_confirmed_identity_invitation_is_active.sql`, rebasada sobre la definición de T4), repara las filas atascadas y evita el falso "resultado incierto" en `inviteClinicMember` cuando el destinatario ya está confirmado. RED observado: `expected [ { status: 'pending' } ] to deeply equal [ { status: 'active' } ]`. Verificado: typecheck/lint limpios, `npm test` 54/54, `npm run test:db` 29/29.
