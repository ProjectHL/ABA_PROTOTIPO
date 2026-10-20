# Propiedad de archivos y dependencias — R0

Estado: R0 revisado y R1 base local aceptada en `ACEPTACION_R1_GATE_R2.md`; R2 autorizado para A2/A3/A5. Se preserva el worktree existente. Integración por acción no equivale a QA aprobado.

## Propiedad exclusiva

| Propietario | Archivos/áreas | Interfaz de entrega |
|---|---|---|
| Orquestador | src/domain/**, app/**, package.json/lockfile, tipos DB regenerados, todas las migraciones, spec/matriz/handoffs | Contratos comunes, rutas finales y orden DB |
| A1 | src/views/TeamPage.tsx, src/views/LoginPage.tsx, src/features/team/**, contexto identidad/shell, scripts/local/** y entorno Docker local | Identidad profesional real, clínica activa, shell con slots/notificaciones suministrados por adaptadores |
| A2 | src/views/StudentsPage.tsx, src/features/students/** excepto ShareButton/ShareStudentModal, src/modules/students/**, src/modules/attachments/** | DTO ficha ampliada, servicios archivo autorizados, metadatos y referencias estables |
| A3 | src/views/SessionPage.tsx, src/features/programs/**, src/features/dataCollection/**, src/modules/program-session/** | Consumo dominios V2, repositorios/comandos persistentes, capturadores originales ampliados |
| A4 | src/views/SharedAccessPage.tsx, src/views/InvitationsPage.tsx, ShareButton/ShareStudentModal, src/modules/collaboration/**, src/modules/family/**, src/modules/chat/**, src/modules/notifications/** | Adaptadores de invitaciones/campana/chat/publicación para shell y ficha; no edita el shell en paralelo |
| A5 | src/components/UpgradePlanModal.tsx, src/views/LandingPage.tsx, src/modules/calendar/**, src/modules/commercial/**, src/modules/support/** | Agenda, gestión interna, soporte y promesas comerciales ajustadas |
| A6 | src/views/DashboardPage.tsx, src/views/ProgramChartPage.tsx, src/features/dashboard/**, src/features/charts/**, src/features/analytics/**, src/modules/reports/** | DTO dashboard/búsqueda/resultados, métricas comunes, exportaciones PDF/CSV reales |
| A7 | src/modules/offline/**, manifest/service-worker y adaptadores offline | Caché aislado, cola durable, descarga explícita y conflictos visibles; cambios en app/public acordados con orquestador |
| A8 | Colección Postman/entorno local, informe QA y suites pertinentes solo en R5 | Evidencia del producto integrado vinculada a versión exacta |
| A9 | Config/despliegue online tras aceptación local | No activo en R0–R5 |

`src/components/MainLayout.tsx` es integración compartida controlada por el orquestador: A1 propone shell; A4 entrega estado/acciones de campana; A5 entrega navegación de soporte/plan; A6 búsqueda; A7 indicador/aviso pendientes. Ningún agente modifica el mismo archivo simultáneamente.

`src/modules/clinical/**` contiene operaciones útiles y presentación provisional con cambios existentes. El orquestador conserva y extrae sus servicios por paquete. No se elimina hasta verificar equivalencia de operaciones y conectar rutas originales. No hay segundo motor de autorización ni segunda aplicación clínica permanente.

## Dependencias de contratos

1. Identidad/contexto autorizado → ficha y asignaciones → todos los recursos clínicos.
2. Ficha con IDs estables → documentos/consentimientos, acceso externo/familia, chat y citas.
3. ProgramDesignV2 + versiones publicadas inmutables → selección en sesiones, resultados y publicaciones.
4. SessionV2 + MeasurementV2 + idempotencia/revisiones → dashboard/reportes y sincronización offline.
5. Servicio común adjuntos → documentos, avatares, chat y publicaciones familiares.
6. Publicación familiar es manifiesto restringido; no reutiliza lecturas clínicas generales.
7. Realtime informa cambios; lecturas PostgreSQL y lectura persistida recuperan estado.

## Orden lógico de migraciones propuestas

Los nombres siguientes son paquetes lógicos. El ledger privado (`20260913150733`), la identidad profesional (`20260913151455`) y el boundary de invitaciones (`20260914120224`) fueron creados con el CLI, revisados y aplicados por root al stack aislado dentro del historial36/36. Ledger antecede a los comandos que lo consumen. Los paquetes restantes se generarán con el CLI versionado y ayuda consultada; solo el orquestador aplica/ordena. Nunca se resetea DB como arranque normal.

1. Identidad/perfiles y contexto local: extender datos profesionales/membresías existentes, sin autorizar desde user_metadata.
2. Ficha/personas: nombre/fotografía/RUT nullable separado de clinical_id; IDs estables; conservar iniciales y datos antiguos sin inventar nombres.
3. Adjuntos: buckets privados, metadatos/versiones/asociaciones y permisos por recurso; archivo lógico y lote de limpieza físico explícito.
4. Programas V2: preservar JSON V1, validar V2 y proteger contenido publicado; programa/version separados y sucesores trazables.
5. Sesiones/captura V2: eventos inmutables, payload original, revisión, versión esperada, ledger idempotente atómico y conflictos sin sobrescritura.
6. Agenda/gestión/soporte: citas/series/participantes/recordatorios/vínculo sesión, suscripciones internas y tickets.
7. Colaboración: extender capacidades existentes por ficha, aceptación idempotente, revocación, manifiestos familiares, participantes chat/lecturas/notificaciones.
8. Reporting: metas/consultas autorizadas y conciliación de unidades; vistas security_invoker si se usan.
9. Offline: autorización/idempotencia de sincronización según contratos anteriores; caché cliente no concede autoridad adicional.

Cada propuesta debe incluir SQL, grants/RLS específicos, índices, compatibilidad V1, rollback seguro o estrategia forward-fix, ejemplos Postman y acciones cubiertas. Se revisa aislamiento de clínica/ficha y funciones privilegiadas antes de integración. Generación de tipos sigue el esquema realmente aplicado, no anticipa migraciones.

## Handoff y gates

Estados: PROPUESTO → REVISADO → INTEGRADO; QA APROBADO solo después de R5. Cada handoff incluye diff, contratos, propuestas DB, ejemplos operación, acciones matriz y pendientes. El orquestador devuelve incompatibilidades al propietario y verifica tipado; R0–R4 no ejecutan ni crean suites intermedias.

Gate R0 registrado en `docs/REVISION_R0_GATE_R1.md`: 822 anclas vinculadas a la matriz de434 acciones, ninguna se declara integrada por inventariarla. Hay contratos compartidos de ficha, programas, captura, sesión, adjuntos, accesos, publicación familiar, chat, agenda, gestión, soporte, recibos y sincronización offline; falta integrarlos con persistencia y pantallas. Node22 y dependencias npmci están normalizados. Stackaislado y NextCompose están operativos con puertosloopback;36 migraciones aplicadas y tipos regenerados. Lote2155e99e-bda4-4c68-95cf-b74cacd84ecd quedó ready tras recuperación sinreset. R1 continúa pendiente del reenvío real de invitaciones, guardas explícitas de scope/recibos de equipo y aceptación de handoff; no QA. R2 no inicia hasta aceptación A1. `scripts/install-local-schema.ps1` y `scripts/generate-local-supabase-types.mjs` son propiedad root, fuera de scripts/local de A1.
