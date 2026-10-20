# R5 — lecturas reales, permisos y colección Postman parcial

Estado 2026-09-27: R5 en ejecución, no aceptación local. Chat/R6 excluidos.
Checkout confirmado: C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO.
HEAD 39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales preservados.

## Defectos reproducidos y corrección

Primera ejecución de tests/local/api-read-contracts.test.mjs: 47/71 pasan,
24 fallan. Cuatro fallos comerciales eran expectativas incorrectas: la gestión
comercial es exclusivamente administrativa; se corrigió el test, no el permiso.
La repetición focal confirmó tres defectos reales HTTP403:

| Defecto | Reproducción / impacto | Corrección mínima |
|---|---|---|
| Identidad | aba_identity_context, ocho perfiles: permission denied for function aba_identity_context_impl; bloquea contexto | Restaurar EXECUTE authenticated sobre la implementación privada, ligado a auth.uid() y contexto vigente; wrapper sigue invoker |
| Dashboard | aba_dashboard_read_v2, seis perfiles internos: permission denied for table program_lifecycle_events | SELECT con RLS: program.view explícito y programa/ficha/clínica exactos; sin DML |
| Búsqueda / adjuntos | aba_authorized_search_v2: permission denied for function attachment_record_authorized_v2 | EXECUTE authenticated para los tres helpers existentes usados directamente por RLS de adjuntos/Storage; mantienen autorización por actor y recurso |

Forward creado mediante CLI: 20260927160133_qa_invoker_dependency_grants.sql.
Dry-run mostró exclusivamente este forward, sin seeds/roles/reset; aplicación
local exit0. Catálogo comprobado: 98 migraciones, última 20260927160133.
Una propuesta inicial fue rechazada por revisión automática al no expresar
capacidad en la política de eventos. No se aplicó: se añadió program.view
explícito y se revisó nuevamente antes del dry-run/aplicación.

Metadatos posteriores: RLS eventos habilitado; authenticated SELECT=true,
INSERT/UPDATE/DELETE=false. Los cuatro helpers corregidos no tienen EXECUTE
anon ni PUBLIC. Cero dependencias directas de políticas authenticated sin
EXECUTE. Advisors security/performance: No issues found. No cambia la
clasificación histórica de las once advertencias SQL; no se declara lint limpio.

## Evidencia ejecutada

Repetición 2026-09-28 tras restore aislado y reinicio web: `vitest run
tests/local/api-read-contracts.test.mjs tests/local/postman-collection.test.mjs`
con `ABA_QA_LOCAL_READ=1` pasó **78 pruebas**, 2 omitidas por su condición;
2 archivos verdes en 6,35 s. Reutilizó las ocho identidades sintéticas y
revocó sesiones locales al finalizar. La colección 2.1 permanece validada
estáticamente, pero no ejecutada en Postman. Postman Desktop 12.30 Local View
interpreta recursos editables de Native Git como v3/YAML: abrir este JSON en
Local Files sólo muestra el archivo, no lo registra en Local Items. No se hizo
Push to Cloud ni se ingresaron secretos en la aplicación. Se solicitó
autorización para importar sólo el JSON sin secretos a Local Items.

- API real: 71/71 pasan, 2026-09-27 13:03 Chile, Vitest4.1.11, 5.77s.
- Ocho cuentas Auth existentes del lote sintético ready
  2155e99e-bda4-4c68-95cf-b74cacd84ecd; login real y logout local al terminar.
- Identidad/actor correlacionados, contratos Zod de producción para lecturas,
  notificaciones, bandejas, fichas, dashboard, agenda, soporte y búsqueda.
- Equipo propio no vacío, clínica cruzada rechazada, gestión comercial solo
  admin, anon rechazado, externo/familia sin vínculo no reciben portal/citas.
- Sin comandos clínicos ni borrado de objetos; no sustituye los casos con
  recursos positivos, vínculos activos, mutaciones, revocación o concurrencia.
- Inventario agregado del lote: cero clients/programs/lifecycle_events. Las
  lecturas clínicas anteriores pueden devolver vacío y no prueban un flujo
  positivo; preparar únicamente datos sintéticos mínimos para esos casos.
- Utilidad administrativa: regresión 28/28 pasa. Colección estática: 5/5 pasa.
- Typecheck actual scripts/local/typecheck.ps1 exit0. API health local HTTP200.
- UI real IAB: landing y formulario /login visibles. El click de ingreso en
  landing no navegó en esta observación; pendiente reproducir con browser de
  prueba y diagnosticar. No se acepta navegación/login por mostrar SSR.
- Edge habilitado después de comprobar snapshot y verifyJWT de los tres slugs.
  Contenedor supabase_edge_runtime_aba-reintegration-local confirmado Up;
  proceso foreground retenido en sesión44349. No reiniciar por timeout ni
  asumir ese handle vigente en otra sesión; verificar primero. DB/Storage y
  servicios existentes conservaron antigüedad de ejecución (26h observadas).

Huella actual: 317 archivos, SHA256
f9524f576897ab96ed5266567087d56564de45b80d5815fa03b4f004874c0886.
Mismo algoritmo que R4_GATE_ESTADO_ACTUAL.md. El build del corte anterior no
se atribuye a esta huella: compilación y aceptación actual aún pendientes.

## Colección Postman 2.1

postman/ABA_LOCAL_R5_READS.postman_collection.json contiene 103 solicitudes:
login/logout por perfil, lecturas y negativos. Sin valores de secretos, comandos
clínicos, Storage ni chat. Scripts conservan tokens solo en variables locales de
ejecución; si se interrumpe, ejecutar logout de cada perfil iniciado.

Importar en Postman existente, usando únicamente entorno privado local no
sincronizado. Completar qa_public_key (anon/publishable, nunca service_role),
qa_clinic_a/qa_clinic_b y qa_<perfil>_email/password desde el manifiesto ignorado
.aba.local/batches/2155e99e-bda4-4c68-95cf-b74cacd84ecd.json. Perfiles con guiones
usan guion bajo en nombres de variables. No exportar ese entorno ni respuestas
con datos. API fija http://127.0.0.1:54321; email y app_metadata exigen el lote
sintético. La colección está preparada y validada estáticamente, NO ejecutada
en Postman. No hay Newman/CLI Postman disponible; no se añadió framework.

## Continuación única

Completar colección/casos de escritura y ejecutar QA-001–016: interfaz real y
Server Actions escritorio/móvil; fichas/programas/cinco dimensiones/sesiones;
conflictos/reintentos/persistencia; colaboración y familia con vínculos activos,
documentos/versiones/publicación/descarga; agenda/notificaciones; offline,
reconexión y revocación; resultados/dashboard/PDF/CSV; build/reinicio y
respaldo/restauración aislada. ARCHIVOS-013 conserva pendiente la validación
con candidatos y autorización exacta antes de borrar. No marcar estas filas
validadas por las lecturas positivas de esta suite. El cambio de permisos es
transversal: completar regresión integral R5, no solo los tres casos corregidos.
