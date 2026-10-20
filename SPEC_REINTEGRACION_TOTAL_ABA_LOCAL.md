<!-- Spec maestra vigente. R0 iniciado el 2026-09-12. Sustituye prioridades anteriores, no su evidencia histórica. -->

# Reorganización integral ABA — frontend original conectado y producto completo en local

> Enmienda de cierre aprobada 2026-09-27: la entrega exigida es el cierre local validado, sin fechas y sin ampliar alcance. R6 online permanece documentado como etapa posterior independiente; no condiciona este cierre ni se inicia automáticamente. Ejecutar de lo simple a lo complejo: unificar estado, consolidar R3/R4, preparar ARCHIVOS-013 dentro de R5 y ejecutar QA-001–016 al final. Corregir y repetir casos afectados; terminar tras la aceptación local, sin abrir otra ronda de mejoras. La limpieza física requiere autorización específica del preview exacto y nunca elimina datos reales automáticamente. Lista ejecutable única: docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md.

> Enmienda de alcance 2026-09-21: todo el chat profesional/familiar y sus adjuntos se difiere a un upgrade posterior. No bloquea R3, R4 ni R5 del release actual. Se conservan artefactos dormidos sin exponer navegación ni ruta operativa. Fuente vigente: `docs/DECISION_CHAT_UPGRADE_POSTERIOR.md`.

## 1. Objetivo y decisiones cerradas

Entregar la aplicación completa para pruebas locales, conservando el frontend original como contrato de UX. El backend y Supabase deben soportar sus pantallas, campos, acciones y recorridos.

La entrega comprende frontend, backend, migraciones, Auth, Storage, Realtime, correo local, datos sintéticos, Docker, colección Postman y documentación operativa. **QA se ejecuta al finalizar la integración. VPS y dominio quedan después del cierre local.**

Decisiones confirmadas:

- Conservar navegación, componentes, formularios y distribución del frontend original.
- Ficha con nombre, fotografía y RUT opcional, además de iniciales e identificador clínico separados.
- Implementar porcentaje, frecuencia, intervalos, duración y latencia.
- Permitir compartir fichas con profesionales externos mediante acceso específico.
- Portal familiar limitado a contenido publicado por la profesional, agenda y chat.
- Offline para consultar fichas descargadas y capturar sesiones; la administración y edición de programas requieren conexión.
- Gestión comercial local: planes, suscripciones y documentos internos, sin cobros ni documentos tributarios.
- Aplicación web instalable —PWA— y soporte mediante tickets locales. Ajustar las promesas comerciales: no anunciar IA disponible ni atención humana 24/7.

La fecha anterior de septiembre se conserva como objetivo comercial, pero deja de ser una previsión confirmada ante esta ampliación. No se recortará alcance para aparentar cumplimiento.

## 2. Arquitectura y cobertura funcional

### Una única aplicación

- Tomar como referencia el frontend preservado y su historial anterior a la sustitución de rutas. Comparar el commit inicial `dc1b0c4` con los componentes actuales para recuperar comportamientos deshabilitados sin perder correcciones posteriores.
- Mantener `src/views` y `src/features` como presentación oficial.
- Reutilizar las operaciones persistentes actuales mediante repositorios, servicios y adaptadores tipados.
- Sustituir los mocks consumidos por las pantallas por consultas y comandos reales. Los datos dummy vivirán en Supabase local como fixtures.
- Retirar las redirecciones que reemplazan dashboard, accesos compartidos y sesión por el workspace provisional.
- Conservar las funciones añadidas al backend —versionado, archivo, correcciones y trazabilidad— e integrarlas en el diseño original.
- Retirar la presentación provisional de las rutas públicas una vez integrada su funcionalidad. No mantener dos aplicaciones clínicas en paralelo.

El inventario obligatorio relacionará **ruta → pantalla → acción → contrato → persistencia → agente → estado**. Incluye componentes huérfanos, botones decorativos y funciones “próximamente”; ninguna acción desaparece del inventario por estar desconectada.

### Matriz completa del producto

| Módulo | Resultado funcional requerido |
|---|---|
| Acceso e identidad | Login, logout, recuperación, cambio de contraseña, invitaciones, sesión caducada, redirecciones internas y clínica activa. Correo comprobable mediante Mailpit local. |
| Shell y perfil | Sidebar y cabecera originales; perfil profesional editable, avatar persistido, búsqueda sobre recursos autorizados, campana, notificaciones leídas/no leídas y navegación responsive. |
| Dashboard | Bienvenida real, estudiantes activos, programas activos, sesiones en curso/finalizadas, historial de logros y gráficos con filtros. Todos los indicadores provienen de registros persistidos. |
| Estudiantes y ficha | Alta, búsqueda, filtros Vigentes/Antiguos/Todos, edición y archivo/reactivación. Identificación, diagnóstico reportado, motivo de consulta, contexto, familiares, contactos principales y hermanos. |
| Historial y medicación | Crear, corregir, actualizar tratamiento, finalizar/reactivar y consultar versiones anteriores. Dosis, frecuencia, prescriptor, fechas y notas permanecen separados. |
| Documentos y consentimiento | Cargar, listar, visualizar, descargar, sustituir y retirar documentos; referencias de consentimiento vinculables a archivos. Versiones anteriores conservadas. |
| Programación | Tableros originales de adquisición/conducta, diseñadores completos, borradores editables, activación, pausa, reactivación, logro, discontinuación y versiones sucesoras. |
| Sesión y captura | Pantalla de aplicador original, selección de programas, inicio, pausa, reanudación, temporizador, notas, varios registros por programa, borradores, envío, cancelación y finalización. Cinco dimensiones operativas. |
| Resultados y reportes | Filtros de fecha/profesional, fases, metas, series, tabla, notas y correcciones trazables; exportación real de programas y resultados en PDF y CSV. |
| Equipo y administración | Invitar, editar datos profesionales según permisos, cambiar perfil, suspender/reactivar membresías y gestionar asignaciones. Admin limitado a su clínica. |
| Accesos compartidos | Invitación por ficha, mensaje, niveles de acceso, aceptación/rechazo, reenvío, modificación y revocación; bandejas de enviados y recibidos. |
| Familia | Identidad familiar vinculada al estudiante; consulta de publicaciones seleccionadas, documentos publicados, agenda y chat. Revocación desde la clínica. |
| Chat y notificaciones | Conversaciones vinculadas a fichas, participantes autorizados, mensajes persistidos, adjuntos y estado de lectura. Realtime actualiza la interfaz y recupera mensajes tras reconexión. |
| Calendario | Vistas de calendario/listado; crear, editar, reprogramar y cancelar citas; participantes, recordatorios locales, recurrencia semanal y vínculo con la sesión realizada. |
| Offline/PWA | Instalación, descarga explícita de fichas, consulta sin conexión, captura durable, cola de sincronización, recuperación tras recarga y resolución visible de conflictos. |
| Planes y gestión comercial | Catálogo, plan vigente, plazas, cambio/cancelación de suscripción y documentos comerciales internos. Importes de demostración identificados como tales. |
| Soporte y páginas auxiliares | Ayuda local, tickets con seguimiento, solicitudes comerciales, landing y estados de carga, vacío, error, no encontrado y acceso no disponible. |

Las funciones que todavía no tienen una pantalla real —familia, chat, calendario, duración y latencia— se construirán con los componentes y patrones visuales existentes.

### Contratos de datos que deben ampliarse

**Ficha y personas**

- Mantener las tablas clínicas actuales y añadir los campos faltantes.
- Separar RUT de identificador clínico; RUT nullable, normalizado y validado cuando se informe.
- Mantener IDs estables de familiares y contactos para que editar un contacto no rompa invitaciones o documentos relacionados.
- Los registros antiguos sin nombre completo siguen mostrando iniciales; no inventar información durante la migración.

**Programas**

- Introducir `ProgramDesignV2`, preservando pasos con ID/orden, conjuntos con nombre e ítems, ayudas, generalización, funciones conductuales múltiples, precursores, procedimiento y plan de crisis.
- Conservar los campos adicionales ya implementados en secciones compatibles del diseñador.
- Separar ID de programa e ID de versión. Las versiones publicadas mantienen su contenido; una edición genera sucesor.
- Mantener lectura compatible de V1. No transformar textos antiguos en valores estructurados inventados.

**Capturas**

- Introducir `MeasurementV2` para las cinco dimensiones, con versión de esquema, fase y observaciones originales.
- Porcentaje conserva I/A/E/NR, ayudas y timestamps. “Sin registrar” es diferente de “No responde”.
- Frecuencia conserva eventos y tiempo observado; duración conserva episodios; latencia conserva antecedente/respuesta; intervalos conserva observaciones y tiempos.
- Las métricas se derivan de los registros originales. No reducir nuevamente ensayos a booleanos.
- Conservar los registros antiguos como V1 y señalar los detalles no disponibles. Un `false` antiguo no se convierte artificialmente en error, ayuda o NR.
- Todos los comandos de captura incluyen ID estable, versión esperada y clave de idempotencia. Los conflictos conservan el trabajo del usuario.
- Cerrar o cancelar un modal nunca completa un programa. La finalización exige confirmación persistida.
- Las correcciones de registros enviados generan una revisión trazable.

**Sesiones y métricas**

- Una sesión pertenece a un estudiante y puede contener varios programas y registros.
- Persistir inicio, pausas, reanudaciones y cierre; calcular tiempo activo desde esos eventos.
- Porcentaje independiente: independientes dividido por ensayos registrados, incluyendo A/E/NR en el denominador.
- Frecuencia: eventos por tiempo observado, excluyendo pausas.
- Intervalos: observados positivos dividido por intervalos observados; mostrar cobertura incompleta.
- Duración: total y promedio de episodios cerrados. Latencia: promedio de respuestas observadas; los ensayos sin respuesta se muestran aparte.
- No mezclar unidades incompatibles ni interpretar automáticamente una subida como mejora.

**Accesos, familia y colaboración**

- Ampliar el motor existente de asignaciones, capacidades y autorizaciones; no introducir otro motor paralelo.
- Una invitación externa concede acceso únicamente a la ficha aceptada; no crea acceso general a la clínica.
- Niveles: lectura completa; programas/resultados con identificación mínima; edición clínica por ficha sin administración de usuarios, facturación ni delegación de permisos.
- Las invitaciones pendientes no conceden acceso. Reenvío y aceptación son idempotentes.
- La publicación familiar será un manifiesto versionado de programas, resultados y documentos seleccionados. No otorgará lectura general de las tablas clínicas.
- Los mensajes y citas se almacenan en PostgreSQL; Realtime comunica cambios y la lectura persistida recupera el estado.

**Archivos y offline**

- Storage privado para avatares y adjuntos; metadatos, versiones y asociaciones en PostgreSQL. Acceso temporal comprobado por recurso, conforme al modelo de [Storage de Supabase](https://supabase.com/docs/guides/storage/security/access-control).
- Por defecto: PDF/JPEG/PNG hasta 20 MiB; avatares JPEG/PNG hasta 5 MiB. Retirar significa archivar la referencia; la limpieza física corresponde al procedimiento por lote.
- Offline usa IndexedDB y caché de aplicación, separados por usuario y clínica; nunca confirma “guardado en servidor” mientras esté pendiente.
- Solo se descargan fichas elegidas y documentos seleccionados. Capturas pendientes se sincronizan por dependencia, con IDs estables y revisión de permisos al reconectar.
- Conflictos requieren resolución visible; no sobrescribir con “último guardado gana”.
- Cambio de usuario bloquea el caché anterior. Cerrar sesión advierte si existen capturas pendientes antes de descartarlas.
- La aplicación no puede conocer una revocación mientras está desconectada; debe comprobarla al reconectar y bloquear la sincronización rechazada sin perder silenciosamente la captura.

## 3. Agentes, responsabilidades y secuencia

**Un orquestador y nueve subagentes por paquete de trabajo**, ejecutados por etapas; máximo tres subagentes simultáneos. Los tres agentes de diagnóstico utilizados para este plan entregan su informe y concluyen su paquete.

| Agente | Modelo previsto | Responsabilidad completa |
|---|---|---|
| Orquestador | Sol, high | Spec maestra, contratos compartidos, dependencias, orden de migraciones, integración y aceptación de entregas. |
| A1 — Plataforma e identidad | Sol, high | Docker/local, Auth, correo, shell original, perfil, equipo, contexto de clínica, cuentas y fixtures. |
| A2 — Ficha y documentos | Terra, high | Lista, ficha ampliada, familiares, historial, medicación, consentimiento, Storage y servicio común de adjuntos. |
| A3 — Programas y captura | Sol, high | Diseñadores originales, contratos V2, sesiones, cinco capturadores, persistencia, revisiones e idempotencia. |
| A4 — Colaboración | Sol, high | Compartir con externos, invitaciones por ficha, portal familiar, publicaciones, chat y notificaciones. |
| A5 — Agenda y gestión | Terra, high | Calendario, recordatorios, planes, suscripciones, documentos comerciales, soporte y solicitudes comerciales. |
| A6 — Dashboard y reportes | Terra, high | Dashboard original, búsqueda, análisis, filtros, metas, gráficos y exportaciones. |
| A7 — Offline | Sol, high | PWA, caché, descarga de fichas, captura desconectada, sincronización y conflictos. |
| A8 — QA integral final | Sol, high | Colección Postman consolidada, QA completo del producto integrado y reporte de incidencias. Solo se activa al final. |
| A9 — Publicación online | Terra, high | Preparación de staging, VPS, dominio, HTTPS, correo externo, despliegue y pruebas online. Se activa después del cierre local. |

No se asignará Luna a decisiones de contratos clínicos o sincronización. Las tareas documentales pequeñas las absorbe el orquestador para evitar fragmentación.

**Secuencia de ejecución**

1. **R0 — Reorganización:** orquestador consolida baseline visual, inventario completo, contratos, propiedad de archivos y nueva spec. Preserva todos los cambios existentes.
2. **R1 — Base local:** A1 entrega entorno reproducible, shell e identidad. El orquestador integra los contratos y dependencias comunes.
3. **R2 — Módulos base:** A2, A3 y A5 trabajan en paralelo con propiedad separada de archivos y migraciones.
4. **R3 — Módulos dependientes:** A4, A6 y A7 trabajan sobre los contratos entregados por R2.
5. **R4 — Integración completa:** orquestador conecta todas las rutas, resuelve incompatibilidades, actualiza tipos y compila el producto completo.
6. **R5 — QA final local:** A8 ejecuta la matriz consolidada. Los fallos regresan al agente propietario; la corrección se verifica dentro de esta misma fase.
7. **R6 — Online:** A9 inicia únicamente después de la aceptación local.

Cada subagente entrega código, contratos, migraciones propuestas, ejemplos Postman, inventario de acciones cubiertas y pendientes explícitos. El orquestador revisa el diff, contratos y compilación; marca `INTEGRADO` o devuelve correcciones. El agente finaliza después del handoff aceptado.

`INTEGRADO` no significa `QA APROBADO`. Durante R0–R4 no se crean ni ejecutan suites intermedias; se permite revisión de código y tipado. El orquestador es el único responsable de aplicar y ordenar migraciones compartidas.

## 4. Entorno local, artefactos y QA final

### Entorno reproducible

- Usar el repositorio activo en `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`; resolver la discrepancia con el directorio antiguo antes de escribir.
- Localizar Docker Desktop y comprobar el motor. La inspección actual no encontró el CLI en esta shell; eso no acredita que Docker esté desinstalado.
- Usar Supabase CLI versionado para gestionar PostgreSQL, Auth, API, Storage, Realtime, Studio, Edge Functions y Mailpit en Docker. Es el flujo de [desarrollo local de Supabase](https://supabase.com/docs/guides/local-development).
- Añadir Compose de desarrollo para Next.js y scripts PowerShell de arranque, estado, parada, fixtures y limpieza explícita.
- Configurar por separado la URL usada por el navegador y la dirección accesible desde los contenedores. No depender de que `localhost` dentro del contenedor sea el host.
- Generar configuración local aislada de staging; arranque y reinicio conservan volúmenes.
- Un reset nunca forma parte del arranque normal ni del cierre automático de una prueba.
- Preparar dos clínicas y cuentas sintéticas de admin, supervisor, técnico, externo y familia. La cuenta designada podrá recorrer secuencialmente los tres perfiles profesionales mediante una utilidad exclusivamente local.
- Identificar todos los fixtures y archivos con lote. Guardar credenciales locales fuera de Git.
- Usar Node 22 y el lockfile existente; las nuevas dependencias quedan fijadas.
- Docker/Postman se usarán por CLI o interfaz disponible. No se asumirá un MCP instalado que no esté accesible.

### Artefactos de entrega

- `SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md`: spec maestra que sustituye la prioridad de las anteriores.
- Matriz completa UX–contrato–persistencia y registro de handoffs.
- Migraciones reproducibles, tipos regenerados y fixtures.
- Colección Postman 2.1 con entorno local sin secretos, documentación de autenticación y ejemplos de cada operación.
- Manual de arranque, credenciales locales, correo, sincronización, recuperación y limpieza.
- Informe final de QA vinculado a una versión exacta del código.

Postman cubrirá REST/RPC, Auth, Edge Functions y Storage. Las Server Actions se comprobarán mediante la interfaz real; no se duplicará el backend únicamente para facilitar Postman.

Los QA anteriores se conservarán como evidencia histórica del sistema anterior. No se heredará su aprobación al frontend reintegrado.

### Una sola fase de QA integral

| Área | Escenarios obligatorios |
|---|---|
| Fidelidad UX | Todas las rutas, pestañas, modales, botones y enlaces inventariados; escritorio y móvil; comparación con el frontend base. |
| Persistencia | Crear, consultar, editar, retirar, recargar, cerrar sesión, volver a entrar y reiniciar contenedores. |
| Captura | Cinco dimensiones, pausas, borradores, reapertura, envío y finalización; NR diferente de ausencia; ayudas y tiempos recuperados. |
| Integridad | Doble envío, reintento, fallo de red, conflicto concurrente, cancelación y registros antiguos V1. |
| Colaboración | Externo sin membresía general, aceptar/rechazar/revocar, familia viendo solo publicaciones, chat y reconexión. |
| Archivos | Carga, descarga, sustitución, referencias, límites, archivos rechazados y limpieza por lote. |
| Agenda y gestión | Reprogramación, cancelación, recurrencia, zona horaria, recordatorios, suscripciones, documentos y tickets. |
| Offline | Descarga, desconexión, recarga, captura, reconexión, reintento, conflicto, cambio de usuario y acceso revocado. |
| Resultados | Conciliación entre observaciones, métricas, dashboard, filtros y exportaciones. |
| Roles y aislamiento | Dos clínicas y todos los perfiles; suspensión, asignación futura, URL manipulada y acceso por API. Auditoría final de permisos existentes y nuevos. |
| Operación | Arranque reproducible, migraciones, build, tipos, salud de servicios, respaldo y restauración en un destino local aislado. |

El QA podrá ejecutar Postman/Newman, comprobaciones DB, recorridos de navegador y suites existentes pertinentes. Se repetirán los casos afectados por correcciones, sin reiniciar indiscriminadamente toda la validación.

**Cierre local:** inventario completo cubierto, frontend original operativo, datos recuperables, cero confirmaciones ficticias y cero fallos bloqueantes de los recorridos acordados.

## 5. Publicación después del cierre local

La preparación online utilizará Next.js en VPS y Supabase gestionado, conservando la arquitectura acordada. No será requisito para desarrollar ni probar localmente.

Orden final:

1. Congelar una versión aceptada localmente.
2. Preparar respaldo, migraciones y configuración equivalentes en staging.
3. Configurar VPS, dirección pública, HTTPS, secretos y correo externo; actualizar callbacks y orígenes.
4. Ejecutar pruebas online con datos sintéticos, incluida entrega real de invitaciones y recuperación.
5. Obtener aceptación de la profesional sobre los recorridos y reportes.
6. Inventariar lotes, ensayar limpieza de DB y Storage y ejecutar el corte autorizado.
7. Confirmar cuentas conservadas y fichas clínicas limpias antes de comenzar la PoC.

El propietario aportará acceso a VPS, dominio o dirección temporal, proveedor de correo y coordinación con la profesional en esa última etapa. Esas dependencias no bloquean la construcción del software completo en local.
