# SDD-07 — Cierre de integración para PoC clínica verificable

Versión: 1.1. Fecha: 2026-09-07. Estado: implementación técnica G0–G3 completada; aceptación y publicación G4 pendientes.

Fuentes: [reauditoría actual](AUDITORIA_SDD_2026-09-07.md), [status map](STATUS_MAP_2026-09-07.md), AUDITORIA_SDD.md y SDD-03_HARDENING.md. Complementa SDD-01 a SDD-06; corrige la recomendación de revocar indiscriminadamente helpers y amplía pruebas de vigencia y semántica de datos. Los bloques SQL antiguos no son una migración aprobada.

## Estado de aceptación al 07-09

| Criterios | Estado | Evidencia o brecha |
|---|---|---|
| AC-01, AC-03, AC-06, AC-07, AC-09, AC-10 | CERRADOS | Migraciones, pruebas PostgreSQL/redirect y rutas persistentes |
| AC-02, AC-04, AC-08, AC-11 | PARCIALES | Matriz local aprobada; falta recorrido navegador remoto con cuentas finales |
| AC-05 | PARCIAL | RPC definer justificadas/probadas; protección de contraseñas filtradas pendiente |
| AC-12–AC-18, AC-20 | CERRADOS TÉCNICOS | Contratos, persistencia, conflictos, programas, captura y resultados aprobados en base aislada |
| AC-19, AC-21, AC-22 | PARCIALES | Idempotencia y función de invitación verificadas; falta entrega de correo y CI alojada desde checkout limpio |
| AC-23, AC-24 | ABIERTOS | VPS, respaldo/restauración, configuración final y aceptación profesional |

El detalle operativo y los bloqueos actuales están en [AUDITORIA_IMPLEMENTACION_2026-09-07.md](AUDITORIA_IMPLEMENTACION_2026-09-07.md). Las casillas históricas de esta spec describen el contrato original; el cuadro anterior es la fuente vigente de estado.

## Problema y resultado esperado

Actualmente un usuario puede consultar una carpeta real, pero no completar alta/edición/programa/sesión con persistencia comprobada. Otras pantallas muestran información simulada y la ficha representa algunos datos desconocidos como vacíos. La seguridad está parcialmente implementada y carece de pruebas de aislamiento ejecutables.

Resultado: un profesional autorizado inicia sesión, selecciona una carpeta permitida, mantiene sus datos mínimos, trabaja con un programa versionado, registra y reabre una sesión persistente. Un usuario ajeno o sin capacidad no puede repetir esas operaciones por UI, URL, REST o RPC. La interfaz distingue confirmado, pendiente, desconocido y error.

## Alcance

Identidad y organización; capacidades por estudiante; lectura y escritura mínima de clients; secciones clínicas integradas explícitamente; programas/versiones; captura de porcentaje/frecuencia/intervalos; lectura de resultados; autorización compartida si se habilita; RLS/RPC/auditoría y entrega reproducible.

Fuera del alcance inicial: chat, facturación, upgrade, calendario, adjuntos binarios y modo offline completo. Duración/latencia y acceso de familia requieren definición funcional antes de habilitarse. Las secciones excluidas muestran indisponibilidad y no anuncian operaciones exitosas.

## Reglas de diseño

1. Mantener Next.js App Router, Mantine y Supabase. Server Components cargan lectura e identidad; componentes cliente gestionan interacción.
2. Organización y asignación son conceptos diferentes. La membresía organizacional no concede automáticamente acceso clínico.
3. RLS y cada mutación privilegiada aplican permisos independientemente de la UI. Resolver capacidades desde el mismo contrato usado por RPC/políticas.
4. El JWT de usuario viaja por el cliente servidor autenticado; no usar service_role para el flujo clínico ordinario ni user_metadata para autorizar.
5. Un esquema privado no expuesto puede necesitar EXECUTE para evaluar RLS. Inventariar consumidores, grants y exposición REST por separado.
6. Estado no consultado no equivale a lista vacía ni a ausencia clínica. Éxito de guardado requiere confirmación remota.
7. Cada cambio de esquema tiene SQL reproducible, pruebas y evidencia en entorno aislado antes de promoción. Los cambios documentados aquí no autorizan por sí mismos promoción remota.

## Contratos propuestos

### Identidad y permisos

`AuthorizationSnapshot`: userId, activeOrganizationId, membershipStatus; por estudiante: studentId y capacidades efectivas. Si una acción exige supervisor principal, esa condición forma parte del permiso efectivo. Roles desconocidos o membresías inactivas resultan sin permisos.

La elección de organización es explícita cuando hay varias; con una sola se puede seleccionar automáticamente. Nunca inferirla solo por created_at. Los UUID y la relación programa-estudiante se validan antes de renderizar datos.

| Actor/condición | Conducta objetivo |
|---|---|
| Sin sesión / membresía suspendida | Sin datos clínicos ni mutaciones |
| Miembro sin asignación | Sin acceso a estudiantes no asignados; creación según política específica |
| Supervisor asignado vigente | Lectura/edición clínica según matriz; gestionar autorizaciones solo si principal |
| Coordinator asignado vigente | Lectura/captura y solicitud; permisos adicionales solo con autorización vigente |
| Therapist asignado vigente | Lectura/captura/envío según contrato; sin gestión de autorizaciones |
| Family / rol desconocido | No habilitar acceso hasta definir capacidades; nunca usarlo como fallback permisivo |
| Asignación con inicio futuro o inactiva | Sin capacidades; comprobar también RPC privilegiadas |
| Usuario con organizaciones A y B | Contexto explícito y validación de recurso; no mezclar UI/permisos de ambas |

Esta matriz es una propuesta basada en funciones inspeccionadas, no certifica que todos esos casos ya pasen. El detalle de creación por admin/supervisor debe conciliarse con create_client y su política directa.

### Datos de estudiante

Separar DTO de lectura de comando de escritura. DTO mínimo: id, clinicalId, initials, birthDate, status, registrationDate. Cada sección relacionada utiliza un estado discriminado: `unavailable`, `loaded` con datos, o `error`; la UI solo anuncia ausencia cuando `loaded` contiene una colección vacía.

Comando de alta: clinicalId, initials, birthDate y los demás campos exigidos por la firma vigente de create_client, con esquemas explícitos para guardians/siblings. Definir límites de texto, fechas válidas y obligatoriedad según base; no aceptar nombre/RUT como alias de iniciales/ID clínico. organizationId y actor se resuelven/verifican en servidor. No trasladar campos arbitrarios de StudentProfile al comando.

Edición: lista permitida de campos, validación Zod y control de versión para contexto donde existe expected_version. Definir conflicto de edición para otros agregados antes de habilitarlos. No borrar historial para corregirlo: usar la semántica de supersedes correspondiente.

### Programas y registros

ProgramDesignV1: contrato Zod versionado del JSONB design; requisitos de cada dimensión y unidad definidos por el responsable clínico. La sesión referencia el estudiante, programa y versión efectivos, nunca una combinación elegida libremente por el cliente.

Comando de captura: sessionId, programVersionId, dimensión, mediciones/ensayos y clave de idempotencia. Actor y organización proceden de sesión autenticada; fechas del servidor diferencian recepción de hora de captura. El contrato valida denominadores positivos cuando se calcula porcentaje, conteos no negativos e integridad entre sesión/programa/estudiante.

Estados propuestos de sesión: borrador, enviada y corregida, con relación de corrección/auditoría. Contrastar con estados existentes y crear migración solo si hay brecha. La misma clave de envío no duplica datos y un payload diferente con la misma clave produce conflicto. Una operación parcial no deja una sesión marcada enviada.

Offline inicial: no confirmar guardado sin red; mantener un borrador controlado para reintentar. La persistencia local de contenido clínico requiere definir separación por usuario/organización, expiración y limpieza al salir antes de habilitarla. La primera entrega puede exigir conexión y mantener datos solo en memoria con aviso explícito de pérdida al cerrar.

## Entregas y aceptación

### E0 — Base de seguridad y contención (G0; A01–A05)

Cambios previstos: sustituir propuesta de revokes globales por inventario de funciones, exposición y consumidores; revisar vigencia del supervisor principal; recuperar esquema/migraciones reproducibles; crear fixtures y pruebas aisladas. Deshabilitar captura y acciones simuladas en superficies habilitadas para usuarios reales.

- [ ] AC-01: SELECT autorizado de clients/programs/sesiones funciona con rol authenticated después de los cambios de grants; no solo mediante RPC definer.
- [ ] AC-02: JWT A no lee/escribe recursos B por tablas ni por las diez RPC; anon no ejecuta operaciones privadas.
- [ ] AC-03: supervisor con inicio futuro no decide autorizaciones ni registra consentimiento; supervisor principal vigente sí. Usuario no principal no recibe permiso efectivo de decidir/revocar.
- [ ] AC-04: auditoría se inserta por vía interna, no es falsificable por navegador y su lectura administrativa está probada.
- [ ] AC-05: cada WARN definer tiene resolución o excepción con función, propietario responsable, consumidor y prueba. Contraseñas filtradas quedan habilitadas o existe decisión explícita antes del piloto.
- [ ] AC-06: ninguna acción accesible promete guardar sin repositorio real; cerrar/cancelar no completa programas.

Entorno: preferir Supabase local si puede reproducir el esquema; en su defecto proyecto de desarrollo o branch aislado. La disponibilidad de Branching se comprueba al implementarlo; no se presupone un cambio de plan. No crear recursos con coste como parte de esta especificación.

### E1 — Identidad y ficha de lectura confiable (G1; A06–A09)

- [ ] AC-07: login conserva una ruta interna con query; descarta esquemas externos, doble slash, barra inversa y controles; parser final conserva origen. Navegación usa replace.
- [ ] AC-08: logout fallido se comunica y no se presenta como sesión cerrada; sesión ausente/expirada no expone recursos protegidos.
- [ ] AC-09: UI usa organización y capacidades efectivas del estudiante; rol desconocido no habilita controles.
- [ ] AC-10: iniciales y clinicalId tienen etiquetas correctas; medicación no consultada figura no disponible.
- [ ] AC-11: error inicial servidor permite reintentar; loading/empty son explícitos; cambiar A→B y refrescar no conserva la ficha A.

Archivos principales previstos: src/lib/security/redirect.ts, src/lib/supabase/proxy.ts, src/lib/authorization/student.ts, RoleContext, MainLayout, StudentsPage, students.repository/server y límites loading/error de app. Extraer mapper puro de dependencias browser cuando se reorganice el dominio.

### E2 — Alta y edición mínima persistente (G2; cierre de SDD-02)

- [ ] AC-12: usuario permitido crea/edita y una recarga obtiene los mismos datos de BD; usuario ajeno falla por UI y llamada directa.
- [ ] AC-13: campos desconocidos o inválidos son rechazados; no hay actualización masiva por props de UI.
- [ ] AC-14: conflicto de versión se muestra sin sobrescribir silenciosamente; eventos reflejan actor real.
- [ ] AC-15: cada sección clínica habilitada consulta su contrato; las restantes se identifican como no disponibles. No hay mocks operativos en el dominio.

### E3 — Programa y captura reales (G3; SDD-04 y parte de SDD-05)

- [ ] AC-16: programa de otro estudiante no se puede cargar, graficar ni registrar usando una URL manipulada.
- [ ] AC-17: crear/versionar/activar conserva versión referenciada por registros históricos y exige capacidad efectiva.
- [ ] AC-18: guardar captura retorna un registro remoto; recargar/reabrir lo recupera. Cancelar no crea ni completa registros.
- [ ] AC-19: doble envío, fallo de red y reintento no duplican ni pierden un envío confirmado; captura inválida no persiste parcialmente.
- [ ] AC-20: gráficos y dashboard habilitados solo agregan datos autorizados; no generan histórico mock.

### E4 — Cierre de producto y entrega (G4; resto de SDD-05/06)

- [ ] AC-21: accesos compartidos usan solicitud/decisión/revocación real o permanecen deshabilitados; no se equipara invitación de equipo con autorización clínica sin contrato.
- [ ] AC-22: CI desde checkout limpio ejecuta lint, types, unitarias, integración RLS y E2E. SQL y tipos son reproducibles.
- [ ] AC-23: entorno de entrega identificado, respaldo/restauración probados, recuperación de cuenta y soporte definidos; logs no contienen payloads clínicos.
- [ ] AC-24: responsable clínico y técnico aceptan el recorrido y las dimensiones soportadas con datos sintéticos antes del piloto.

## Plan de pruebas

| Nivel | Casos mínimos | Evidencia de cierre |
|---|---|---|
| Unitarias | Redirect adversarial, DTO desconocido/vacío, comandos y límites de medición | Suite aprobada y casos nominales/negativos |
| RLS/REST/RPC | Dos organizaciones; miembro sin asignación; supervisor principal/no principal; coordinator; therapist; family; suspendido; inicio futuro; autorización revocada/expirada | JWT reales de fixtures o roles SQL controlados para RLS, más cobertura REST/RPC autenticada |
| Integración | Alta/edición/recarga, relación de programa, conflicto de versión, idempotencia, atomicidad y evento de auditoría | Estado antes/después sin PII; IDs sintéticos |
| E2E | Login deep-link, logout error/éxito, cambio de ficha, guardar/cancelar/reabrir, URL manipulada | Reporte automatizado y fallos reproducibles |
| Entrega | Reconstrucción desde migraciones y checkout, CI, restauración y logs | Comandos/versión de esquema/commit y fecha |

Agregar también casos de parámetros nulos/manipulados y p_test_run_id ajeno cuando la RPC lo acepte. Tests de integración se ejecutan con identidad de usuario, no exclusivamente service_role. La preparación de fixtures puede usar un rol administrativo limitado al entorno de prueba.

## Dependencias, decisiones y ejecución

Orden: E0 → E1 → E2 → E3 → E4. CI básica se inicia en E0 y se amplía con cada suite. Los programas mínimos versionados deben existir antes de la captura persistente; no posponer todo SDD-05 hasta después de SDD-04.

Decisiones necesarias al implementar: matriz de creación y acceso familiar; alcance exacto de secciones clínicas de E2; contrato de cada dimensión; mecanismo de base aislada; comportamiento de borradores. Hasta resolver cada una, usar denegación/indisponibilidad explícita para esa función. Esto permite cerrar lectura segura sin inventar permisos clínicos.

Roles responsables propuestos: responsable técnico para esquema/auth/CI, responsable frontend para DTO/UX, responsable clínico para matriz/mediciones/aceptación. No hay personas asignadas ni fechas comprometidas en esta spec.

Cada entrega tendrá cambios acotados, prueba positiva y negativa, evidencia vinculada al checklist y revisión de migración si aplica. Promover solo después de comprobar en base aislada las regresiones de tablas y RPC; para rollback, revertir el cambio específico mediante migración compensatoria probada, nunca restaurar grants abiertos globalmente. Conservar la auditoría original como historial.

## Definición de terminado

AC-01 a AC-24 tienen evidencia o una exclusión explícita de producto que mantenga la función deshabilitada; ningún P0 queda abierto para las superficies del piloto. Las decisiones funcionales están registradas, el proyecto se reproduce desde Git y el usuario autorizado completa el recorrido con persistencia y trazabilidad. La aprobación de esta spec no equivale a implementación ni autorización de producción.
