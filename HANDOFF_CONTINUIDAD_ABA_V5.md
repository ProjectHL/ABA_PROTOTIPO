# Handoff de continuidad ABA — cierre local R5 (v5)

Fecha de corte: **2026-09-30**. Este documento permite continuar ABA local desde un chat nuevo sin reabrir implementación consolidada ni perder el contexto de QA. **No acredita aceptación funcional ni autoriza limpieza física.** Sustituye a `HANDOFF_CONTINUIDAD_ABA_V4.md` como punto de arranque; v4 conserva valor histórico, pero sus cifras y pendientes P1 quedaron superados.

## 1. Arranque seguro y fuentes vigentes

Trabajar **exclusivamente** en `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`. El cwd que algunos chats reciben puede ser `C:\Users\Moonlabpc\OneDrive\Desktop\Proyectos-IA\ABA_PROTOTIPO`; esa copia antigua **no se edita**. Confirmar `git rev-parse --show-toplevel` antes de escribir. Respetar el sandbox del host y solicitar escalación cuando corresponda; no rodearlo.

Leer en este orden:

1. `AGENTS.md` y `SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md`: reglas y alcance autorizado.
2. `docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md`: lista única de cierre e índice QA-001–016. Prevalece sobre apartados históricos.
3. `docs/status-map/ABA_LOCAL.json` y `docs/status-map/ABA_LOCAL.html`: checkpoint de categorías, porcentajes calculados por hitos, bloqueos y próxima acción. Usar la skill personal `status-map` para actualizarlo. **No** sustituye al checklist ni implica porcentaje global de producto.
4. `docs/handoffs/R4_CONSOLIDACION_CIERRE_LOCAL.md` para el gate técnico; después sólo los handoffs R5 del caso que se vaya a ejecutar.
5. `docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md` para trazabilidad requisito → implementación → contrato → persistencia → ruta → QA.

V4, los bloques inferiores de `docs/R2_EJECUCION_ACTUAL.md` y las anotaciones históricas de `scripts/local/README.md` pueden contener conteos y servicios ya superados. Contrastarlos con el checklist y una comprobación de sólo lectura, no copiarlos como estado actual.

## 2. Objetivo, alcance y criterio de parada

Objetivo: **cerrar ABA local completo, validado y operable** para liberar el siguiente proyecto. Sin fechas ni ampliación de alcance. Chat y adjuntos de chat son upgrade posterior; R6 online es una etapa independiente y no se inicia automáticamente. No abrir otra ronda cosmética o de refactor tras la aceptación local.

El plan aprobado sigue: R3/R4 consolidados → terminar `ARCHIVOS-013` de forma segura → QA final R5 (`QA-001–016`) → versión exacta, matriz validada, manuales e informe → aceptación local. Las once advertencias SQL clasificadas son deuda, salvo evidencia concreta de defecto funcional o de seguridad. Corregir hallazgos reales y repetir caso/regresiones relacionadas; repetir toda la batería sólo ante cambio transversal de Auth, permisos o contratos compartidos.

No resetear DB/volúmenes, reemplazar datos, hacer checkout destructivo, borrar archivos reales, ejecutar cleanup por inferencia, importar secretos a Postman ni publicar online. Conservar los cambios existentes y utilizar sólo datos sintéticos mínimos. `ARCHIVOS-013` exige aprobación específica del preview exacto antes de cualquier eliminación física.

## 3. Estado verificado en este corte

| Comprobación | Resultado |
|---|---|
| Raíz Git / rama / HEAD | `C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO` · `main` · `39071f8` |
| Árbol de trabajo | **264 entradas** en `git status --short` tras crear este handoff; son entradas de estado, no un conteo recursivo de archivos. Preservar todas. No hay commit de aceptación local. |
| Matriz | 434 acciones: **404 integradas**, 16 QA, una R5 (`ARCHIVOS-013`) y 13 upgrade. Cero implementación R4 pendiente por fila; esto no es QA aprobado. |
| Migraciones | Consulta de sólo lectura a `supabase_migrations.schema_migrations`: **100 aplicadas**, última `20260928182438`. El 97 del gate R4 es histórico. |
| Docker/Supabase | Nueve contenedores locales DB/Auth/Storage/REST/Realtime/Kong/Studio/pg_meta/Inbucket `Up`; Auth `http://127.0.0.1:54321/auth/v1/health` respondió 200. No se hizo reset. |
| Web/Edge hoy | `http://localhost:3000/api/health` y `:3001/api/health` rechazaron conexión. Edge Runtime **no** apareció en `docker ps`. Verificar y levantar sólo los servicios necesarios con los scripts locales antes de QA; no asumir handles de sesiones anteriores. |
| QA R5 | **1/16 validado local/sintético** (`QA-014`); 14 parciales y `QA-016` pendiente. Evidencia focal no acepta una fila completa. |

La interrupción reciente de Docker impidió iniciar el caso V1 móvil; no se clasificó como fallo de producto. El motor se reactivó de forma conservadora y la DB conservó las 100 migraciones. Si vuelve a faltar el pipe o aparece acceso denegado a `sailor-ingest.sock`, diagnosticar Docker Desktop sin `factory reset` ni manipulación de volúmenes. La URL de un navegador abierta no demuestra que web siga sirviendo.

## 4. Brújula de categorías — checkpoint `status-map`

Cada porcentaje representa **hitos de cierre cumplidos / hitos definidos en esa categoría**. No mide esfuerzo, tiempo ni una media global. Implementación técnica y aceptación funcional están separadas; el detalle y la evidencia de cada hito viven en `docs/status-map/ABA_LOCAL.json`.

| Categoría | Cierre | Estado | Lo siguiente |
|---|---:|---|---|
| Alcance e integración R3/R4 | 100% · 3/3 | Cerrado técnico | No reabrir sin defecto concreto de QA. |
| Identidad y permisos | 67% · 2/3 | En validación | Postman real y gate transversal por perfil/clínica/servicio. |
| Ficha clínica | 67% · 2/3 | En validación | Matriz de rutas, perfiles y persistencia tras reinicio. |
| Programas y captura | 50% · 2/4 | En validación | Variantes de captura, concurrencia y conciliación V1/V2. |
| Colaboración y familia | 67% · 2/3 | En validación | Recorrido integral de vínculos/publicaciones/revocación, sin chat. |
| Documentos y limpieza física | 75% · 3/4 | **Bloqueado para apply** | Autorización del lote `ARCHIVOS-013`; después recibos y recuperación aislada. |
| Agenda, gestión y soporte | 67% · 2/3 | En validación | Horarios/participantes adicionales y gate global. |
| Offline y sincronización | 50% · 2/4 | En validación | ACK persistido fallido, variantes de captura e instalación PWA. |
| Resultados y dashboard | 60% · 3/5 | En validación | V1 móvil, inspección PDF, regresión V2, gate QA-012. |
| Operación y recuperación | 67% · 2/3 | En validación | Manual y versión final tras QA. |
| QA R5 y aceptación | 6,25% · 1/16 | En validación | Cerrar focales, Postman, gate transversal y QA-016. |
| Chat/adjuntos y R6 | Fuera del denominador | Diferido | No iniciar como parte del cierre local. |

La utilidad del mapa es localizar qué queda y por qué, **no** presentar ABA como “93% aceptado” porque 404/434 estén integradas. Al cerrar un hito, actualizar primero evidencia y checklist, luego conservar copia fechada del JSON previo y regenerar el HTML desde el JSON vigente con la skill `status-map`. No mejorar porcentajes cambiando denominadores sin decisión documentada.

## 5. Pendientes ejecutables, de lo cercano al gate final

1. **Recuperar sólo el entorno necesario.** Confirmar Docker, puertos y scripts antes de arrancar web QA. `scripts/local/README.md` documenta el arranque aislado; no usar `npm run dev` directo si `.env.local` apunta a staging. La web local R5 usa `next dev --webpack` por un 404 de Turbopack en montaje Windows→Docker. Si el montaje no propaga un cambio, reiniciar sólo web, no DB/Auth/Storage.
2. **QA-012 / V1 positivo.** `scripts/local/qa-v1-historical-fixture.sql` insertó un único agregado histórico sintético V1 sin tocar datos reales. El caso opt-in en `tests/e2e/r5.results.spec.mjs` pasó **escritorio 1/1**: lectura autorizada, clínica B rechazada, UI y CSV/PDF separados de V2. Falta repetición móvil, inspección visual de ese PDF y regresión de las cinco dimensiones V2 tras el fixture. Después actualizar `docs/handoffs/R5_RESULTADOS_EXPORTACIONES.md` y el checklist; QA-012 permanece parcial hasta gate transversal. No inventar otra familia de reportes.
3. **Completar focales R5 restantes.** QA-011 ya cubrió cola durable, recarga offline, conflicto, replay de POST, revocación, cambio de usuario/clínica, documento offline y fallos de cuota inyectados en escritorio/móvil; faltan fallo real de persistencia del ACK, otras variantes de captura e instalación PWA. QA-010 necesita variantes horarias/participantes; QA-006/007 requieren integridad y concurrencia completas. Revisar el índice QA del checklist antes de repetir casos ya pasados.
4. **Postman y gate transversal.** `postman/ABA_LOCAL_R5_READS.postman_collection.json` tiene **103 solicitudes 2.1 sin secretos**. Cinco verificaciones estáticas y lecturas API reales pasaron, pero la colección **no fue ejecutada en Postman**. Local View la muestra como archivo v3/YAML, no como colección importada; no se hizo Push to Cloud ni se cargaron credenciales. Resolver importación local segura antes de contar QA-001. Completar escrituras y perfiles, UI/Server Actions reales, dos clínicas, REST/RPC/Edge/Storage, permisos familiares y regresiones transversales. No sustituir UI por llamadas API equivalentes.
5. **`ARCHIVOS-013`: esperar autoridad exacta para apply.** Preview `796f24cb-235e-4dc8-a3d8-bb6370b0047e`, hash `e470ec1131caa97fd160dbe7bf2e75b1a161de8d1648e5a9aa10e070f46b130c`, **dos PNG sintéticos candidatos**, cero referencias/excluidos. Dump y bytes de ambos respaldados y verificados. El usuario **no ha autorizado** aplicar ese preview: no se ejecutaron borrado, recibos ni recuperación de objetos eliminados. Consultar `docs/handoffs/R5_ARCHIVOS_013_PREPARACION.md` y `docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md`; no ampliar el lote ni convertir la retención QA simulada en política real.
6. **QA-016 y entrega.** Sólo al concluir QA-001–015 y `ARCHIVOS-013`, conciliar matriz completa como integrado/validado/diferido, manuales de arranque/uso/respaldo/recuperación, versión exacta y limitaciones. Acreditar cero bloqueos funcionales, de seguridad o pérdida de datos dentro de alcance y obtener aceptación local explícita. Detenerse entonces; no iniciar R6 ni mejoras nuevas automáticamente.

`QA-014` sí está validado local/sintético: dump privado, configuración Auth/Storage DPAPI, Storage físico con hashes, restore aislado sin puertos y relecturas; ver `docs/handoffs/R5_OPERACION_RESPALDO.md` y `docs/runbooks/LOCAL_R5_RECOVERY.md`. Su límite: mismo equipo/perfil Windows y bootstrap vacío aislado. No restaurar sobre el stack activo ni tomar las carpetas `.aba.local/qa/` como respaldo.

## 6. Seguridad de entorno y datos de prueba

- Lote sintético existente: `2155e99e-bda4-4c68-95cf-b74cacd84ecd`, ocho identidades Auth y dos clínicas. Reutilizarlo cuando corresponda; no resetear, reemplazar ni publicar credenciales. El manifiesto con secretos está ignorado por Git en `.aba.local/batches/`; no copiarlo a handoffs, capturas ni Postman sincronizado.
- Sesión sintética offline: `97a8e135-1fb0-4397-910f-f4fe5f099ad1`; el último handoff QA-011 registra versión 47. No presumir que siga igual después de nuevas pruebas: reconsultar antes de escribir.
- La persistencia de un recibo correlacionado define éxito de comando; un fallo de relectura no revierte ese éxito. Conflictos y revocaciones deben conservar operación/payload sin confirmar falsamente ni filtrar datos entre perfiles o clínicas.
- Las URLs firmadas históricas emitidas antes del forward de descarga profesional expiran por su propio plazo; el boundary nuevo revalida sesión y versión. No usar borrado físico como remedio de un acceso temporal.
- `npm test` documentado: 75 passed, 75 skipped opt-in, 0 failed. Las 75 omitidas no son QA real aprobado. No afirmar que una suite está verde en el checkout actual si no se reejecutó tras cambios pertinentes.
- El HTML de `status-map` usa Chart.js cuando puede cargar; conserva tabla y barras sin red. El JSON es el checkpoint editable; el HTML es derivado. No incluir datos sensibles en ninguno.

## 7. Prompt listo para continuar en otro chat

> Trabaja sólo en `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO` y lee `HANDOFF_CONTINUIDAD_ABA_V5.md`, `AGENTS.md`, `docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md` y `docs/status-map/ABA_LOCAL.json`. Conserva los cambios existentes y no edites la copia OneDrive. Estamos en QA final R5, no en P1 ni en R3/R4. Confirma primero Docker/web/Edge sin reset ni datos nuevos; después retoma QA-012 V1 móvil, PDF y regresión V2 desde la evidencia documentada. Continúa los pendientes del checklist de lo simple a lo complejo, actualiza el status-map sólo con hitos verificados y no declares cierre por integración técnica. Chat/adjuntos y R6 quedan fuera. No borres objetos de `ARCHIVOS-013` sin mi autorización específica del preview exacto ni sincronices secretos a Postman. Entrega evidencia, fallos reproducibles, correcciones y pendientes exactos.

Este handoff se preparó con lectura de la skill `status-map`, checkpoint, checklist y handoffs R4/R5, más comprobaciones de sólo lectura de Git, Docker, Auth, web y catálogo de migraciones. **No** ejecutó QA, migraciones, cleanup, restore ni cambios de producto.
