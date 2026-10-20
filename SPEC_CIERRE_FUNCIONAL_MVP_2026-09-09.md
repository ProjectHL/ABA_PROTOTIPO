# Spec activa — cierre funcional CRUD del MVP

Versión: 1.0  
Fecha: 2026-09-09  
Entorno de implementación: Supabase local sobre Docker + aplicación Next.js local.  
Objetivo: cerrar lógica y persistencia antes del QA integral, hardening y publicación.

## 1. Precedencia y alcance

Esta es la spec activa para la fase funcional. `SPEC_ORQUESTACION_CIERRE_MVP_2026-09-08.md` se conserva como referencia histórica de seguridad, operación y publicación, pero sus corridas intermedias quedan pausadas hasta finalizar esta spec.

Reglas de ejecución:

- no crear ni ejecutar suites Jest, Vitest o Playwright;
- no crear subagentes dedicados a testing, RLS o seguridad;
- no modificar `ABA_staging`, Auth remoto, VPS ni datos remotos;
- no desactivar ni eliminar controles, RLS, grants o middleware existentes;
- no exponer `service_role` ni incorporar un cliente anónimo privilegiado;
- conservar tests y CI existentes sin ejecutarlos durante esta fase;
- ejecutar una sola comprobación `tsc --noEmit` al finalizar la integración;
- no hacer commit ni push sin una autorización nueva del propietario.

## 2. Estado funcional verificado por lectura de código

El núcleo activo se encuentra en `src/modules/clinical` y ya reemplaza varias rutas antiguas basadas en mocks. Las rutas `/students`, `/students/[studentId]`, `/session/[studentId]`, `/team` y el gráfico por programa cargan `ClinicalPage`.

| Módulo | Crear | Leer | Editar | Borrar / retirar | Estado de entrada |
|---|---|---|---|---|---|
| Estudiante | `mvp_save_student` | SSR desde `clients` | `mvp_save_student` | No expuesto | PARCIAL |
| Responsables/hermanos | Reemplazo atómico | SSR | Reemplazo atómico | Retiro dentro del reemplazo | IMPLEMENTADO |
| Contexto | `save_client_context` | SSR | `save_client_context` | Vaciar campos opcionales | IMPLEMENTADO |
| Historial/medicación | Append | SSR | Corrección con `supersedes_id` | Sustitución no destructiva | IMPLEMENTADO |
| Consentimiento | Append | SSR | Nueva referencia con `supersedes_id` | Revocar/expirar | IMPLEMENTADO |
| Equipo de clínica | Invitación | `mvp_team` | `mvp_set_member` | Membresía inactiva | IMPLEMENTADO |
| Asignaciones | `set_student_assignment` | SSR | `set_student_assignment` | Asignación inactiva | IMPLEMENTADO |
| Programas/versiones | Crear borrador/sucesor | SSR | Nueva versión; edición de borrador no expuesta | `discontinued` | PARCIAL |
| Registro de sesión | Guardar borrador | SSR | Reabrir y guardar borrador | No expuesto | PARCIAL |
| Sesión | Creación implícita | SSR | Finalizar | No expuesto | PARCIAL |
| Resultados | N/A | Historial + gráfico persistido | N/A | N/A | IMPLEMENTADO |

Brechas concretas:

1. `mvp_save_student` no actualiza `clients.updated_at`, por lo que el control de versión no avanza después de editar.
2. La UI no permite archivar/reactivar una ficha, aunque `clients.status` ya modela ambos estados.
3. Un borrador de programa se crea completo, pero no puede volver a abrirse y editarse antes de activarlo; tampoco se ofrece reactivar un programa pausado.
4. Un registro de sesión en borrador puede editarse, pero no descartarse; una sesión no puede archivarse desde la UI.
5. Los módulos heredados con mocks siguen en el árbol, pero no deben convertirse en una segunda implementación. Se retirarán o redirigirán sólo si todavía son alcanzables desde las rutas activas.

## 3. Decisiones funcionales

| Decisión | Regla activa | Motivo |
|---|---|---|
| Eliminación clínica | Soft delete: `archived`, `discontinued`, `revoked`, `expired` o `inactive` | Mantiene relaciones y permite reapertura sin cascadas destructivas |
| Descarte físico | Sólo borradores de medición no enviados; nunca sesiones finalizadas ni historia consolidada | El borrador aún no representa un registro final |
| Acceso a datos | Server Components + Server Actions/RPC existentes | Evita duplicar contratos y conserva el camino ya integrado |
| Nuevos cambios DB | Migración local reproducible; no aplicar a staging en esta fase | Separa implementación funcional de promoción |
| Validación intermedia | Revisión de diff; sin suites | Minimiza overhead según directiva |
| Verificación integrada | Una ejecución de `tsc --noEmit` al terminar F1 y F2 | Detecta ruptura de contrato TypeScript sin abrir una fase de pruebas |

## 4. Entregas de grano grueso

### F1 — Ficha clínica y administración CRUD

Objetivo: cerrar el ciclo de vida visible de ficha, familia, contexto y administración sin reescribir lo que ya persiste.

Checklist:

- [x] Corregir el avance de `clients.updated_at` en cada edición persistida.
- [x] Añadir comando de archivar/reactivar estudiante con confirmación visible.
- [x] Mantener fichas archivadas consultables y diferenciadas; no mezclarlas silenciosamente con activas.
- [x] Confirmar por contrato que retirar responsables/hermanos guarda el nuevo snapshot atómico.
- [x] Mantener historial y medicación como append/corrección, sin borrado destructivo.
- [x] Mantener consentimiento como referencia versionada y permitir estados revocado/expirado.
- [x] Mantener suspensión de membresía y retiro de asignación como equivalentes funcionales de delete.
- [x] Eliminar cualquier confirmación de éxito que no provenga de una respuesta persistida.
- [x] Entregar comandos REST/RPC y JSON sintéticos para Postman.

Objetos previstos:

- `public.clients`, `public.guardians`, `public.siblings`;
- `public.client_context_profiles`, `public.clinical_history_entries`, `public.consent_records`;
- `public.memberships`, `public.student_assignments`;
- `public.mvp_save_student` y un comando versionado para estado de ficha si resulta necesario;
- `src/modules/clinical/contracts.ts`, `actions.ts`, `page.tsx` y componentes de ficha/administración.

Criterio de cierre: código integrado y tipable; crear, abrir, editar, archivar/reactivar y retirar relaciones tiene una ruta persistente. No se exige suite ni ejecución manual en esta fase.

Rollback: ocultar los nuevos controles UI y aplicar una migración compensatoria que retire sólo las nuevas funciones; no revertir datos por `DELETE` global.

### F2 — Programas, captura, sesiones y resultados CRUD

Objetivo: completar el recorrido programa → captura → reapertura → envío → finalización → resultado.

Checklist:

- [x] Permitir reabrir y editar un borrador de programa antes de activarlo.
- [x] Permitir activar, pausar, reactivar, marcar logrado y discontinuar según el estado actual.
- [x] Tratar `discontinued` como eliminación lógica de programa.
- [x] Mantener creación y edición de borradores de medición con versión persistida.
- [x] Añadir descarte explícito de un registro no enviado.
- [x] Añadir archivado de sesión; una sesión finalizada no se borra físicamente.
- [x] Separar claramente guardar borrador, enviar, cancelar modal, descartar y finalizar sesión.
- [x] Mantener porcentaje, frecuencia e intervalos con sus datos crudos y unidades actuales.
- [x] Mantener historial y gráfico conectados sólo a registros enviados persistidos.
- [x] Entregar comandos REST/RPC y JSON sintéticos para Postman.

Objetos previstos:

- `public.programs`, `public.program_versions`, `public.program_lifecycle_events`;
- `public.clinical_sessions`, `public.session_program_records`, `public.clinical_record_events`;
- funciones de guardado/transición existentes y nuevos comandos locales mínimos para editar borrador, descartar y archivar;
- `src/modules/clinical/contracts.ts`, `actions.ts`, `page.tsx` y componentes de programa/captura/resultados.

Criterio de cierre: código integrado y tipable; los estados y acciones tienen una mutación persistente o una semántica de cancelación explícita. No se exige suite ni ejecución manual en esta fase.

Rollback: retirar controles nuevos y usar migraciones compensatorias para funciones nuevas. Los estados clínicos ya confirmados no se reescriben.

### F3 — Integración funcional

Responsable: orquestador.

- [x] Revisar los diffs de F1 y F2 y resolver solapamientos en contratos, acciones, carga y UI.
- [x] Actualizar los tipos versionados para las cuatro firmas RPC nuevas; la regeneración desde DB queda para cuando se apliquen localmente.
- [x] Ejecutar una sola vez `tsc --noEmit` — PASS, 2026-09-09.
- [x] Actualizar esta checklist con IMPLEMENTADO o PENDIENTE, sin declarar QA aprobado.
- [x] Entregar ejemplos Postman/curl sintéticos y pendientes conocidos en los handoffs F1/F2.

Criterio de cierre: árbol funcional integrado y TypeScript compilable. Esto no equivale a `VERIFICADO LOCAL`, `ACCEPTED` ni `PUBLISHED`.

## 5. Propiedad de subagentes

Se usan dos subagentes monolíticos con rutas funcionales separadas. Para evitar conflictos, cada uno crea componentes y contratos de su dominio; el orquestador es el único que modifica los puntos compartidos durante F3.

| Subagente | Modelo | Propiedad primaria | Entrega |
|---|---|---|---|
| `clinical_admin_crud` | Terra / high | ficha, familia, contexto, historial, consentimiento, equipo y asignaciones | Código F1 + migración local si aplica + handoff Postman |
| `program_session_crud` | Terra / high | programas/versiones, captura, sesiones, resultados | Código F2 + migración local si aplica + handoff Postman |

Formato de handoff obligatorio:

1. archivos creados/modificados;
2. matriz CRUD alcanzada;
3. tablas/RPC/contratos consumidos;
4. ejemplos curl y JSON con IDs sintéticos/placeholders;
5. pendientes o incompatibilidades;
6. declaración explícita de que no creó ni ejecutó tests.

## 6. Plantillas Postman/curl

Variables de entorno esperadas:

```text
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<clave local publicada por supabase status>
USER_JWT=<JWT de usuario sintético local>
ORGANIZATION_ID=<uuid sintético>
CLIENT_ID=<uuid sintético>
PROGRAM_ID=<uuid sintético>
VERSION_ID=<uuid sintético>
SESSION_ID=<uuid sintético>
RECORD_ID=<uuid sintético>
```

Cabeceras comunes:

```text
apikey: {{SUPABASE_PUBLISHABLE_KEY}}
Authorization: Bearer {{USER_JWT}}
Content-Type: application/json
```

Ejemplo de actualización de ficha:

```json
{
  "p_organization_id": "{{ORGANIZATION_ID}}",
  "p_client_id": "{{CLIENT_ID}}",
  "p_expected_updated_at": "2026-09-09T12:00:00Z",
  "p_payload": {
    "clinical_id": "POC-001",
    "initials": "AA",
    "birth_date": "2015-01-01",
    "primary_language": "Español",
    "living_arrangement": "Contexto sintético",
    "guardians": [{"initials":"BB","birth_date":"","relationship":"Responsable","phone":""}],
    "siblings": []
  },
  "p_test_run_id": null
}
```

Ejemplo de borrador de medición:

```json
{
  "p_id": "{{RECORD_ID}}",
  "p_session_id": "{{SESSION_ID}}",
  "p_client_id": "{{CLIENT_ID}}",
  "p_program_version_id": "{{VERSION_ID}}",
  "p_dimension": "percentage",
  "p_payload": {"trials":[true,false,true]},
  "p_expected_version": 0,
  "p_submit": false
}
```

Los handoffs de F1/F2 completarán las URLs `/rest/v1/rpc/<funcion>` y payloads de las funciones nuevas realmente integradas.

## 7. Bloque único posterior — QA, seguridad y publicación

Este bloque empieza sólo cuando F3 esté cerrado. No se fragmenta en subagentes ni specs intermedias durante la fase funcional.

- [x] QA integral local del recorrido completo y de CRUD persistido — PASS 2026-09-10; evidencia en `docs/QA_FUNCIONAL_LOCAL_2026-09-10.md`.
- [x] Revisión de errores, dobles envíos, concurrencia y estados inválidos — 46 comprobaciones REST/RPC PASS.
- [x] Auditoría final de Auth, RLS, grants y RPC privilegiadas — hallazgos y plan en `docs/AUDITORIA_SUPABASE_SEGURIDAD_2026-09-10.md`.
- [x] Aplicar hardening local y ejecutar una corrida negativa consolidada de aislamiento — 8/8 controles PASS.
- [x] Promoción controlada de F1, F2 y hardening a `ABA_staging` — aplicada y verificada 2026-09-10, sin modificar datos clínicos.
- Prueba con usuario designado y datos sintéticos.
- VPS/HTTPS, backup/restore, UAT profesional, limpieza por lote y publicación.

Antes de usar pacientes reales, la seguridad y el QA final vuelven a ser puertas obligatorias. Esta spec sólo cambia el orden del trabajo; no declara que los datos reales sean seguros ni autoriza publicación.

## 8. Tablero activo

| Entrega | Estado | Evidencia de cierre |
|---|---|---|
| F1 — Ficha/admin CRUD | IMPLEMENTADO / MIGRADO LOCAL | `docs/handoffs/F1_CLINICAL_ADMIN_CRUD.md` + migración local aplicada 2026-09-09 |
| F2 — Programas/sesiones/resultados | IMPLEMENTADO / MIGRADO LOCAL | `docs/handoffs/F2_PROGRAM_SESSION_CRUD.md` + migración local aplicada 2026-09-09 |
| F3 — Integración | IMPLEMENTADO / COMPILABLE | Revisión orquestador + `tsc --noEmit` PASS |
| QA funcional local | PASS | `docs/QA_FUNCIONAL_LOCAL_2026-09-10.md` + `tsc --noEmit` PASS |
| QA final automatizado | PASS | `docs/QA_FINAL_MVP_2026-09-11.md`: lint, tipos, 24 Vitest, 2 E2E públicos, 3 E2E autenticados, build, Auth staging y Compose |
| Auditoría de seguridad | COMPLETA | `docs/AUDITORIA_SUPABASE_SEGURIDAD_2026-09-10.md` |
| Hardening local | VERIFICADO LOCAL | Migración `20260910184233_final_security_least_privilege.sql` + 8 controles PASS |
| Build y empaquetado VPS | VERIFICADO LOCAL | `next build` + `docker compose config --quiet` PASS |
| Preparación operativa VPS/HTTPS | PREPARADA EN REPOSITORIO | `deploy/compose.yml` con variables obligatorias + `deploy/README.md` con preflight, smoke, reboot y rollback; falta VPS/hostname/accesos |
| Migraciones staging | APLICADAS / VERIFICADAS | F1 `20260910184204`, F2 `20260910184219`, hardening `20260910184233`; 30/30 tablas con RLS |
| Preflight staging | PASS | Proyecto/Edge/email PASS; signup público y sign-ins anónimos deshabilitados el 2026-09-11 |
| Cuenta UAT | PREPARADA | Existe como único admin activo; estrategia secuencial documentada para tres perfiles |
| Recorrido UAT de perfiles | ADMIN/SUPERVISOR/TÉCNICO PASS; CIERRE VISUAL ADMIN PENDIENTE | `docs/UAT_PERFILES_2026-09-12.md`; transiciones secuenciales y restauración exacta verificadas, falta iniciar una sesión nueva como admin después de restaurar |
| Recuperación de contraseña | PASS MANUAL | Flujo real completado el 2026-09-12; URLs de Auth corregidas y receptor global de enlaces implícitos integrado |
| Recuperación remota | BLOQUEADA POR DECISIÓN | Supabase Free: elegir Pro o dumps lógicos cifrados antes de pacientes reales |
| UAT + publicación | PENDIENTE | Migraciones y Auth staging cerrados; falta ejecutar UAT, preparar VPS/HTTPS y publicar |
