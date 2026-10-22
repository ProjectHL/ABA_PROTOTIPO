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

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1 | inline (DB+TS+UI+tests) | pending | |
| T2 | S2 | inline (DB+TS+tests) | pending | |
| T3 | S3 | inline (DB+tests) | pending | |
| T4 | S4 | inline (DB+TS) | pending | |
| T5 | S5 | inline (TS) | pending | |
| T6 | S6 | inline (UI) | pending | |
| T7 | S7 | inline (UI) | pending | |
| T8 | S8 | inline (UI) | pending | |
| T9 | S9 | inline (UI) | pending | |
| T10 | S10 | inline (UI) | pending | |
| T11 | S11 | inline (UI) | pending | |

## Log

- **L1** — Pedido original: "necesito que revises el proyecto y veamos que podemos mejorar o arreglar , en base a la UI y logica de negocio"
- **L2** — Autorización: "si dale guarda y vamos con todos los cambios — generate una rama entera para todos estos cambios"
- **L3** — Baseline observado antes de tocar nada: `npm run typecheck`, `npm run lint`, `npm test` (50/50) y `npm run test:db` (25/25) pasan.
- **L4** — Decisión de diseño T1: se agrega `pending` al check de `memberships`. Todas las políticas y funciones existentes exigen `status='active'`, así que una membresía pendiente no obtiene acceso. La activación ocurre en `resetPassword()` al consumir el token de invitación, que es el acto de aceptación. `require_delivery_target` acepta `pending` para permitir el envío y reenvío.
- **L5** — Corrección de la auditoría: `private.is_primary_student_supervisor` fue redefinida en `20260908140309` e **incluye** al administrador de la clínica, así que el bloqueo reportado no existe. El test lo demostró al fallar la aserción `ok=false`. El defecto real de esa función es no heredar `test_run_id`; T2 se limita a eso.
- **L6** — Decisión de diseño T3: `captured_at` queda inmutable (se fija al crear la sesión). La guarda de orden se mantiene con la comparación contra `captured_at` y los eventos ya persistidos.
