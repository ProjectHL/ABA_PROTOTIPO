# Handoff de continuidad ABA — reporte v4

Fecha de corte: 2026-09-19. Objetivo: continuar la integración de ABA en un chat nuevo sin repetir diagnósticos ni perder cambios. Este documento transmite estado y decisiones; no acredita QA aprobado.

## 1. Arranque del nuevo chat

Trabaja en `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.

**No editar la copia antigua** `C:\Users\Moonlabpc\OneDrive\Desktop\Proyectos-IA\ABA_PROTOTIPO`, aunque aparezca como cwd del chat. La ruta autorizada se confirma en AGENTS.md y en el texto original del usuario. Los permisos del host deben cubrir el checkout real; si no lo hacen, solicitar la escalación correspondiente, sin sortear el sandbox.

Primero lee, en este orden:

1. `AGENTS.md` y `SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md`: reglas y alcance.
2. `docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md`: prioridad P0–P7.
3. Bloque vigente al inicio de `docs/R2_EJECUCION_ACTUAL.md`: las notas históricas inferiores contienen pendientes y conteos superados.
4. `reporte_v4_ABA.html`: arquitectura, diagramas, modelo de datos, hallazgos y plan G0–G7.
5. `docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md`: cobertura por acción.
6. Handoffs P1 del dominio que vayas a cerrar y contratos relacionados.

La petición original completa está en `C:\Users\Moonlabpc\.codex\attachments\b496b4b0-81ce-4ba4-9c5f-ec8afcb03a31\pasted-text-1.txt`. Fue leída al preparar este handoff; contiene decisiones del usuario, incluida la secuencia R0–R6.

## 2. Objetivo y decisiones que permanecen vigentes

- Entregar el producto completo en local, preservando el frontend original de referencia `dc1b0c4` y las mejoras posteriores. Una única aplicación clínica.
- Conectar pantallas, contratos y persistencia reales; fixtures sintéticos en Supabase local, sin métricas ni confirmaciones ficticias.
- Conservar los cinco tipos de medición: porcentaje, frecuencia, intervalos, duración y latencia.
- Mantener RUT opcional separado del identificador clínico. No inventar información al leer o migrar registros V1.
- Externos: acceso específico por ficha. Familia: contenido publicado mediante manifiesto versionado, agenda y chat; no membresía clínica global.
- Offline: consulta descargada y captura durable; administración y edición de programas requieren conexión.
- Comercial: demostración local, sin cobros ni documentos tributarios. No anunciar IA disponible ni atención humana 24/7.
- R0–R4 permiten revisión estática, tipado, compilación y metadatos. **No crear ni ejecutar suites funcionales antes de R5.** Postman/E2E/QA integral pertenecen a R5; online, VPS y dominio a R6 después de aceptación local.
- No reset, seeds, fixtures nuevos, limpieza automática ni datos reales. La limpieza física necesita alcance y autorización explícitos.
- Preservar cambios existentes. No hacer reset, checkout destructivo, commit global ni aplicar propuestas SQL sin revisión.
- Root controla rutas, contratos comunes, dependencias, migraciones y tipos. Si se delega, leer primero `docs/PROPIEDAD_Y_DEPENDENCIAS_REINTEGRACION_ABA_LOCAL.md`; máximo tres subagentes y propiedad exclusiva por archivo. No asumir que agentes o sesiones del chat anterior siguen disponibles.

## 3. Evidencia y nivel de confianza

Recomprobado durante la preparación de este handoff:

| Evidencia | Resultado |
|---|---|
| Raíz Git | `C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO` |
| HEAD | `39071f8` más cambios locales importantes |
| Matriz | 210 INTEGRADO + 224 PENDIENTE = 434 acciones |
| Archivos de migración | 65 SQL en `supabase/migrations` |
| Dashboard | `app/dashboard/page.tsx` monta `DashboardPage` |
| Gestor declarado | npm 10.9.8; Node 22.x; package-lock.json |

El reporte registró 58 entradas modificadas y 111 sin seguimiento con `git status --short`. Hay muchos cambios aún fuera de commits; las entradas de directorio no son un conteo recursivo de archivos. Releer el diff antes de escribir. El nuevo handoff añade otra entrada sin seguimiento.

Evidencia del informe v4, **no reconsultada en vivo para este handoff**:

- PostgreSQL 17.6; 57 tablas públicas, todas con RLS; 83 políticas; cero grants de tabla para anon.
- 65 migraciones aplicadas localmente, última `20260919163445`.
- 215 índices públicos sin índices inválidos; 25 triggers no internos; cero vistas públicas.
- 64 funciones públicas y 91 privadas; 31 RPC públicas `aba_`.
- 46 funciones públicas y 41 privadas SECURITY DEFINER; 32 públicas y 16 privadas ejecutables por authenticated; ninguna sin search_path fijo. Esto es una superficie a revisar, no una vulnerabilidad demostrada por el conteo.
- Dos buckets privados: `clinical-attachments` (20 MiB) y `profile-avatars` (5 MiB).
- Tres Edge Functions con JWT: `invite-clinic-member`, `resend-clinic-invitation`, `verify-attachment-upload`.
- Cero tablas publicadas para Realtime; ocho identidades sintéticas locales.
- Advisors locales sin hallazgos; typecheck aprobado durante la sesión del informe. Documentación P1 registra lint aprobado. No implica QA funcional, rendimiento ni aislamiento demostrado mediante pruebas.
- Staging, backup/restore remoto, Auth final y drift remoto no fueron revalidados para el informe.

No presentar estos datos como una auditoría nueva. Si el código o entorno cambia, revalidar lo necesario.

## 4. Arquitectura que hay que conservar

Next.js App Router y React → UI por features/views → contratos Zod y Server Actions → Supabase Auth/Data API/RPC → PostgreSQL, RLS y helpers privados. Storage privado y Edge atienden archivos e invitaciones.

Stack declarado: Next `^16.1.6` (el reporte observó runtime 16.3.4), React `^19.2.0`, Mantine `^7.15.2`, TypeScript `~5.9.3`, Zod `^4.3.6`, Supabase SSR `^0.8.0`, supabase-js `^2.95.3`, Recharts `^3.7.0`. CLI Supabase fijado en 2.117.0. Vitest y Playwright están disponibles para la fase correspondiente.

Rutas y organización relevantes:

- `app/`: rutas y callbacks; `src/views/`: pantallas; `src/features/`: componentes por dominio.
- `src/modules/`: contratos, adaptadores y acciones; `src/domain/`: contratos V2.
- `src/context/IdentityContext.tsx` e `IdentityShell.tsx`: identidad, clínica y shell.
- `src/modules/program-session/`, `src/features/dataCollection/` y `src/views/SessionPage.tsx`: siguiente área de trabajo.
- `supabase/migrations/` y `src/lib/supabase/database.types.ts`: esquema y tipos canónicos.

Invariantes: autorización por clínica/recurso en servidor y DB; IDs y payload estables en reintentos; versión esperada; locks y recibo correlacionado; conflicto visible y borrador conservado; historial inmutable. Un fallo de relectura no invalida una escritura ya confirmada. La memoria del navegador no equivale a durabilidad offline.

## 5. Checklist real al corte

- [x] P0: reglas, spec, matriz y propiedad.
- [x] R0–R1: base local, identidad, clínica, shell, ledger e invitaciones integrados técnicamente.
- [x] A2: ficha, historial y adjuntos, 66/67 acciones técnicas.
- [x] Programas: 47/49 acciones técnicas.
- [x] Sesión: SESION-001–019 conciliadas técnicamente.
- [x] A5: agenda/comercial/soporte, 43/43 técnicas; entrega de recordatorios depende de P2.
- [ ] P1: aceptación final de handoffs y cierre/ubicación explícita de pendientes.
- [ ] P2: externos/familia, publicaciones, chat, notificaciones y entrega durable de recordatorios.
- [ ] P3: dashboard completo, búsqueda, gráficos, métricas y PDF/CSV. Existe dashboard mínimo real; el checklist aún rotula P3 pendiente. No marcar el paquete completo.
- [ ] P4: IndexedDB, PWA, descarga, cola durable, sincronización y conflictos.
- [ ] P5: ensamblaje, una app, matriz conciliada, manuales y candidato versionado.
- [ ] P6/R5: QA integral y aceptación local.
- [ ] P7/R6: staging, recuperación, VPS, HTTPS, correo y publicación.

Pendientes exactos para evitar reiniciar trabajo cerrado:

| ID | Alcance pendiente |
|---|---|
| SESION-020 | Seleccionar/cambiar dimensión del capturador/configuración sin perder el registro existente; no basta mostrar la dimensión actual. |
| SESION-021 | Inventariar y resolver edición agregada V1: true/false, deshacer ensayo, total de eventos y duración manual, sin convertir false en E/A/NR ni fingir cronómetro. |
| SESION-022 | Archivar sesión existente conservando resultados; no confundir con cancelar o finalizar. |
| ARCHIVOS-013 | Limpieza física explícita por lote. Definir procedimiento y ubicación; no ejecutar borrado por el mero cierre de P1. |
| PROGRAMAS-039 | Exportar diseño PDF real; trasladado a P3/A6. |
| PROGRAMAS-041 | Abrir gráfico real; trasladado a P3/A6. |

Fuentes P1: `docs/handoffs/P1_A2_FICHA_REVISION_INTEGRACION.md`, `P1_A3_CAPTURA_REVISION_INTEGRACION.md`, `P1_A3_PROGRAMAS_REVISION_INTEGRACION.md` y `P1_A5_REVISION_INTEGRACION.md`.

## 6. Plan inmediato para continuar

1. Confirmar raíz, reglas, diff y último estado documental. Conservar los cambios existentes; no reconstruir el proyecto ni repetir una auditoría general.
2. Contrastar SESION-020–022 con los consumidores, contratos V2, RPC actuales y anclas originales de la matriz. Precisar qué falta realmente antes de modificar.
3. Cerrar esas acciones verticalmente: requisito → contrato → persistencia → pantalla → ruta. Root revisa y ordena cualquier migración aditiva y regenera tipos si corresponde.
4. Resolver el lugar y contrato operativo de ARCHIVOS-013 sin ejecutar una limpieza no solicitada. Aceptar handoffs P1 con evidencia estática y dependencias explícitas.
5. Ejecutar comprobaciones estáticas pertinentes; actualizar checklist/matriz/R2 al cierre del paquete. No convertir tipado aprobado en QA aprobado.
6. Continuar P2 y P3; P4 depende de contratos y permisos estables. Después P5 → P6/R5 → P7/R6. No añadir frameworks de agentes, hooks o grafos como prerrequisito.

Criterio de cierre de P1: pendientes resueltos o reasignados con justificación trazable, contratos conectados a rutas reales, revisión estática y estado documental coherentes. Nunca cambiar una casilla sólo para mejorar el porcentaje.

## 7. Entorno, acceso y recuperación de contexto

- Usar `scripts/local/README.md` y scripts existentes; `npm run local:status` comprueba estado sin imprimir credenciales. Leer el script antes de operaciones con efectos.
- Stack aislado: `aba-reintegration-local`; configuración generada en `.aba.local/stack/supabase/config.toml`.
- App observada anteriormente en `http://localhost:3000`; Studio `http://127.0.0.1:54323`; Mailpit `http://127.0.0.1:54324`. Comprobar servicios al retomar: una URL abierta no demuestra disponibilidad.
- Los IDs de sesiones de terminal y los handles de agentes del chat anterior no son transferibles. No reiniciar servicios sólo por desconocer un handle.
- Incidente previo: login rechazado. El informe identifica confusión entre credenciales de staging y Auth local; el nuevo chat debe verificar destino y cuenta sintética antes de atribuir cualquier fallo actual a esa misma causa. No crear bypass de autenticación ni copiar credenciales al handoff.
- El servidor temporal del reporte en puerto 8765 fue detenido después de su revisión visual; no es parte de la aplicación.
- `npm run local:typecheck` reutiliza el wrapper local. Compilación y lint conforme a herramientas/configuración vigentes. No usar pnpm por reglas históricas si package.json declara npm.
- No imprimir `.env`, claves, tokens ni credenciales de fixtures. Consultar el runbook para acceso local sin exponerlos en documentación.

## 8. Evaluación y recomendaciones: no confundir con decisiones aprobadas

Se explicó al usuario una valoración orientativa de estructura de **78/100**: buena separación y controles, con complejidad, integración y verificación pendientes. No es una métrica automatizada ni una auditoría de seguridad.

210/434 = 48,4 % de acciones marcadas integradas; no mide esfuerzo, plazo ni porcentaje de producto listo.

Se recomendó estabilizar una versión y verificar un recorrido completo antes de expandir módulos. **Esa recomendación no modificó la decisión del usuario y AGENTS de QA funcional sólo en R5.** Mantener la secuencia vigente; una propuesta de cambio debe presentarse como tal. No heredar aprobación de QA históricos del sistema anterior.

## 9. Prompt listo para el nuevo chat

> Continúa ABA desde `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`. Lee `HANDOFF_CONTINUIDAD_ABA_V4.md`, AGENTS.md y las fuentes prioritarias indicadas. No edites la copia antigua de OneDrive. Retoma P1 por SESION-020–022 y el cierre documentado de ARCHIVOS-013; revisa primero código, contratos y evidencia existente para no repetir trabajo. Preserva el frontend original, cambios locales, autorización multi-clínica y comandos con recibos/idempotencia. Completa el siguiente paquete con revisión estática, actualiza matriz/checklist y entrega un resumen de archivos, cobertura y pendientes. QA funcional queda en R5 y online en R6. No hagas reset, limpieza, fixtures nuevos ni expongas secretos. Avanza con el alcance ya autorizado y comunica cualquier bloqueo concreto.

Este handoff se preparó leyendo informe, instrucciones originales, AGENTS, checklist, R2, matriz, inventario de handoffs, scripts y estado Git. No modificó código de aplicación ni base de datos, ni ejecutó QA.
