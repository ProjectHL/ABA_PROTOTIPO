# R3 / A7 — revisión de integración offline

Fecha: 2026-09-21. Estado: integrado técnicamente; QA funcional reservado a R5.

## Límite implementado

La PWA conserva únicamente shell estático en Cache Storage. Fichas, documentos y comandos clínicos se guardan explícitamente en IndexedDB bajo alcance `userId:clinicId`; ninguna respuesta clínica, URL firmada ni sesión se incorpora al caché HTTP del service worker.

La identidad cacheada sólo desbloquea lectura local cuando el navegador declara estar offline y el usuario de la sesión local coincide. Ese estado queda `verified=false`: no autoriza comandos servidor ni sincronización hasta una revalidación real.

## Evidencia por acción

| Acción | Evidencia técnica |
|---|---|
| OFFLINE-001 | `app/manifest.ts`, metadatos de `app/layout.tsx`, iconos PWA y `public/sw.js`. |
| OFFLINE-002 | Descarga explícita de ficha desde `SessionPage`; snapshot por alcance en `offline-store.ts`. |
| OFFLINE-003 | Selección individual de versiones autorizadas en `StudentDocumentsPanel`; URL firmada con `no-store`, validación de bytes/MIME/SHA-256 y Blob en IndexedDB. |
| OFFLINE-004 | `/offline-workspace` y shell estático preparado; sólo abre snapshots del alcance activo. |
| OFFLINE-005 | Comandos V2 de sesión y captura guardados de forma durable. |
| OFFLINE-006 | Recuperación de cola y reconstrucción visual de sesión/registros después de recarga. |
| OFFLINE-007 | Estados locales pendientes/bloqueados separados del progreso confirmado por servidor. |
| OFFLINE-008 | `planSyncQueue` ordena dependencias y sólo libera comandos después de recibos persistidos. |
| OFFLINE-009 | Operación e idempotency key originales se conservan ante transporte incierto. |
| OFFLINE-010 | `sync-engine.ts` relee ficha/capacidades antes de cada envío; el RPC autorizado resuelve replay antes de comparar versión. Corte 2026-09-26: evita bloquear un recibo por su propia versión avanzada tras commit incierto. |
| OFFLINE-011 | Conflictos quedan bloqueados con payload y error visibles. |
| OFFLINE-012 | Revisión de versión vigente y supersesión atómica con nuevas claves, `supersedesEntryId` y reencadenamiento de dependencias; sin last-write-wins. |
| OFFLINE-013 | Revocación/recurso no disponible produce bloqueo de permiso y conserva la captura. |
| OFFLINE-014 | Cambio de usuario/clínica vacía memoria y sólo consulta índices del nuevo alcance. |
| OFFLINE-015 | `MainLayout` compone la guarda global antes de logout/cambio de clínica. |
| OFFLINE-016 | Descarte explícito confirmado conserva recibos/supersedidas y elimina sólo trabajo no reconocido. |
| OFFLINE-017 | Retiro explícito de ficha elimina también sus blobs; un pendiente impide el retiro silencioso. |

## Verificación R0–R4

- `npm run typecheck`: exit 0.
- ESLint focal de módulos offline, documentos, sesión, shell y rutas tocadas: exit 0.
- `npm run build`: exit 0 con Next.js 16.3.4 y 23 páginas generadas.
- No se ejecutaron suites funcionales, Postman ni E2E; pertenecen a R5.

## Decisión relacionada

## Corte 2026-09-26 — aislamiento y transacciones

- OfflineProvider oculta cola/fichas/documentos en el mismo render en que cambia
  el alcance, sin esperar a useEffect. Resultados asíncronos se publican sólo en
  su contexto; lectura de Blob vuelve a comprobar actor/clínica antes de abrir.
- sync-engine comprueba contexto/conexión/identidad antes de seguir y antes de
  enviar. Un recibo de una operación ya enviada se guarda en su alcance original,
  pero no repuebla la interfaz de una identidad posterior.
- Recuperación inicial y sincronización usan Web Locks por alcance cuando están
  disponibles. Refrescos normales no convierten envíos activos en pendientes.
  En navegadores sin Web Locks queda exclusión por proveedor, no entre pestañas;
  el servidor mantiene idempotencia de operaciones exactas.
- Recuperación y descarte operan en una sola transacción IndexedDB, sin reemplazar
  la cola desde una lectura antigua. Descarte rechaza envíos activos; retirar ficha
  comprueba pendientes en la misma transacción que elimina snapshot/blobs.
- Actualizar estado no recrea una entrada eliminada ni sobrescribe un recibo
  confirmado/supersedido. Logout/cambio de clínica consulta cola durable para avisar.
- ESLint focal exit 0 en el primer corte; build/tipado final se registra en auditoría
  global tras integrar el resto de este paquete. No QA funcional ni datos nuevos.

## Corte 2026-09-26 — reintento durable y recuperación no destructiva

- SessionPage libera el comando retenido de sesión/captura únicamente después
  de que enqueue confirme el commit IndexedDB. Si falla, conserva claves y payload
  exactos en memoria para reintentar; no afirma que el trabajo sea durable.
- Refrescar la cola no restaura una captura reconocida antigua sobre una versión
  igual/mayor ni sustituye observaciones no guardadas del formulario.
- `A7_OPERACION_EJEMPLOS.md` entrega flujo de interfaz, envelopes de RPC y límites
  de recuperación. Documentación para R5, no colección ejecutada ni aprobación QA.
- ESLint focal y TypeScript exit 0; compilación final Next 16.3.4 exit 0 con
  23 páginas generadas. Sin suites funcionales, Postman, fixtures ni reset.

## Corte de continuidad — estado visual por alcance

- MainLayout remonta OfflineStatus por usuario/clínica. El error y estado ocupado
  locales no se heredan por otra identidad; no remonta el proveedor ni elimina
  operaciones IndexedDB.
- discardPending rechaza callbacks de un alcance que ya no está activo antes de
  invocar el descarte transaccional. Se conservan la confirmación explícita, el
  rechazo de envíos en curso y los recibos reconocidos.
- Grafo runtime: 153 fuentes, lint cero errores/advertencias. Build Next 16.3.4,
  TypeScript y 23 páginas: exit 0. Sin QA ni alteración de datos.

Chat y sus adjuntos no forman parte de este cierre ni del release actual. Véase `docs/DECISION_CHAT_UPGRADE_POSTERIOR.md`.
