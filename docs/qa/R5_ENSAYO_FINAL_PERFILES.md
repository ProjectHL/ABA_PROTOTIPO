# Plan maestro — ensayo final ABA por perfiles

Fecha de planificación: 2026-10-05. Estado: PLANIFICADO, NO EJECUTADO. La elección de identidades y los datos concretos se acordarán antes de iniciar. Este documento registra una propuesta ejecutable solicitada por el usuario; no acredita resultados, aceptación ni autorización para VPS, borrados o cambios de su cuenta.

## Propósito y ubicación en el cierre

Realizar con el usuario un ensayo completo de operación local en Docker: clínica prepara y asigna; supervisor diseña; técnico captura; supervisor concilia; clínica verifica administración y entrega. Ejecutarlo después de resolver los pendientes técnicos de R5 y antes de QA-016. Las evidencias anteriores se conservan: ayudan a preparar/regresar casos, pero no sustituyen la ejecución humana de estos recorridos sobre la versión final.

Fuentes superiores: [spec](../../SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md), [checklist](../CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md), [matriz UX–contrato–persistencia](../MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md) y [último corte CLI](../handoffs/R5_CLI_GATE_V5.md). Esta planificación no cambia sus estados ni denominadores.

## Qué significan shift-left y shift-right

Shift-left incorpora definición de aceptación, revisión y pruebas tempranas al desarrollo. Shift-right verifica el comportamiento después del despliegue mediante observación y pruebas controladas. Son enfoques complementarios, no nombres de los tres perfiles. Este ensayo es una prueba end-to-end y de aceptación de usuario (UAT) antes del despliegue. Se preparan ahora criterios y casos; no se presenta el QA tardío anterior como una estrategia temprana aplicada retroactivamente. Referencia: [IBM — Shift-left testing](https://www.ibm.com/think/topics/shift-left-testing).

La fase shift-right se deja descrita para después de autorizar el VPS. Ninguna prueba local acredita entrega de correo externo, HTTPS público o comportamiento de la infraestructura futura.

## Identidades y datos propuestos

| Actor | Uso | Preparación requerida |
|---|---|---|
| Usuario propietario | Recorrido clínica con rol admin | Identificar UUID en Auth local, clínica y membresía; guardar estado previo. No copiar una cuenta cloud ni asumir que existe localmente. |
| Supervisor nuevo | Recorrido supervisor y prueba de alta | Invitación por interfaz a un correo local de prueba, activación, contraseña elegida privadamente y login independiente. |
| Técnico nuevo | Recorrido técnico y prueba de alta | Igual proceso, rol therapist, asignación explícita a la ficha de ensayo. |
| Segundo admin | Mantener acceso administrativo | Cuenta local vigente, diferente del usuario; no retirar al último admin. |
| Clínica B / actor B | Aislamiento y flujo positivo B | Reutilizar fixtures autorizados vigentes, sin alterar sus relaciones originales. |
| Externo y familiar | Colaboración y publicación | Reutilizar identidades aptas o acordar altas mínimas; sin membresía clínica general. |

Propuesta preferida: tres cuentas separadas y tres sesiones de navegador independientes, operadas secuencialmente por el usuario. Cambiar el rol de su misma cuenta es una variante adicional pendiente de decisión: capturar membresía/asignaciones, emplear una operación local acotada, renovar sesión y restaurar valores originales. La utilidad switch-role actual sólo admite la cuenta sintética designada; no se ejecutará sobre el usuario ni se ampliará automáticamente. Una modificación por DB prepara un escenario, pero no acredita el flujo administrativo ni la creación de cuentas por UI.

Usar estudiantes y registros clínicos ficticios, claramente rotulados. Reutilizar el lote y los recursos sintéticos existentes cuando sean aptos; sólo crear recursos mínimos propios del ensayo. El usuario puede usar su identidad real local sin introducir información de pacientes reales. Conservar IDs y versiones antes de cada cambio; no finalizar/cancelar la sesión offline original `97a8e135-1fb0-4397-910f-f4fe5f099ad1`.

## Condiciones de entrada — gate G0

- Pendientes técnicos anteriores resueltos o identificados con evidencia; ningún fallo bloqueante conocido se traslada al ensayo como aprobado.
- Raíz Desktop autorizada, HEAD y manifiesto de cambios locales; BUILD_ID, lockfile, 100 migraciones documentadas previamente y catálogo actual reconciliados. Cualquier diferencia se investiga.
- Candidato de producción local único para el ensayo, URL pública efectiva y callbacks coherentes. Históricamente dev usa 3000 y QA 3001: no presumir que ambos son la misma versión. Elegir una URL compatible con Auth antes de empezar.
- Docker, Auth, web, REST/RPC, Edge, Storage, Realtime y Mailpit saludables; bindings loopback, sin staging; arranque/reinicio preservan volúmenes.
- Respaldo/checkpoint previo y recuperación aislada vigente, límites DPAPI documentados; nunca restaurar encima del stack activo.
- Identidades, clínicas, roles, asignaciones y recursos de ensayo confirmados; correos/contraseñas/tokens sólo en almacenamiento privado fuera de Git.
- Escritorio y móvil definidos por navegador/viewport; si no hay dispositivo físico, registrar esa limitación. Instalación Windows no acredita Android/iOS.
- Cola/formularios de sesiones anteriores resueltos por su propietario; no descartar payloads para facilitar el ensayo.
- Hoja de ejecución inicializada: todos los casos NO EJECUTADO; cada ID de acción vigente asignado a caso y perfil antes de afirmar cobertura completa.

## Secuencia de las jornadas

| Gate | Trabajo | Salida para continuar |
|---|---|---|
| G0 | Preparación y decisiones de identidades | Entorno/candidato confirmado, cuenta local apta, respaldo y trazabilidad preparados. |
| G1 | [Clínica](R5_RECORRIDO_CLINICA.md), primera parte | Cuentas activadas, ficha sintética y asignaciones persistidas. |
| G2 | [Supervisor](R5_RECORRIDO_SUPERVISOR.md), preparación | Diseños/publicaciones exactas y agenda listas para captura. |
| G3 | [Técnico](R5_RECORRIDO_TECNICO.md) | Capturas y sesión confirmadas; sincronización sin duplicados, recibos/versions comprobados. |
| G4 | Supervisor, revisión; clínica, retorno | Resultados/exportaciones conciliados, decisiones de acceso y administración comprobadas. |
| G5 | Casos transversales de este plan | Aislamiento, operación, fidelidad UX y acciones restantes acreditados. |
| G6 | Correcciones y repetición pertinente | Cero bloqueos y evidencias sobre el candidato final. |
| G7 | Entrega y QA-016 | QA-001–015 completos, ARCHIVOS-013 cerrado, aceptación local explícita del usuario. Detener cierre local. |

No fijar duración ni fecha ficticias. Dividir en sesiones que permitan conservar atención y evidencia; reanudar con la misma ficha y versiones actuales. Las pruebas que comparten identidades/permisos se ejecutan en serie. Después de una corrección del producto, identificar qué evidencia invalida y repetir casos afectados; cambios transversales de Auth/autorización/contratos exigen regresión transversal.

## Casos transversales obligatorios

Todos empiezan NO EJECUTADO en este ensayo. Ejecutar casos de fallos de manera controlada sobre recursos de ensayo; ninguna pérdida de conectividad equivale a autorización para reset o descarte.

| ID | Prueba | Resultado obligatorio |
|---|---|---|
| X-01 | Cerrar sesión/entrar con cada cuenta; sin sesión y sesión caducada | Identidad/contexto exactos, login cuando corresponda; ninguna respuesta clínica ajena. |
| X-02 | Clínica A contra B por UI, URL, REST/RPC, Edge y Storage | Operación positiva B propia y rechazos cruzados; sin payload ni bytes ajenos. |
| X-03 | Retirar asignación y suspender membresía durante una sesión abierta | Lectura/escritura sensible se revalida; UI no confirma éxito; posterior reactivación se verifica. |
| X-04 | Asignación futura y fin de vigencia | Acceso sólo en vigencia efectiva; comparar reloj/zona, no alterar reloj global del host. |
| X-05 | Doble clic, red cortada, respuesta perdida y replay | Un comando/recibo correlacionado y una mutación; payload retenido, cero doble versión. |
| X-06 | Fallo al persistir ACK tras éxito servidor | Comando exacto recuperable, reintento reconoce recibo único y no pierde payload. |
| X-07 | Edición concurrente de versión compartida | Conflicto explícito; borrador conservado, revisión y nueva operación consciente. |
| X-08 | Cambio de usuario/clínica con descarga y cola offline | Datos/cache aislados; pendientes no desaparecen ni se exponen a otro actor. |
| X-09 | Revocación mientras existe copia offline | Estado revocado verificado al reconectar; no se acepta nueva escritura indebida. Documentar que una descarga previa no se borra remotamente. |
| X-10 | Recarga sin red, documento y límites de almacenamiento | App/draft recuperables, bytes/hash exactos; cuota/fallo explícitos sin falso éxito. |
| X-11 | PWA instalación/apertura/recarga | Standalone y service worker comprobados en la plataforma real disponible. |
| X-12 | Realtime, corte y reconexión | Evento real autorizado y estado persistido conciliados; B/revocado no recibe contenido. |
| X-13 | Correo Mailpit: invitación, recuperación, reenvío/replay | Destinatario y comprobante exactos; enviado, recibido y activado se distinguen. Sin links/tokens en evidencia pública. |
| X-14 | Agenda, recurrencia, zona y recordatorios | Horarios/participantes correctos, reprogramación/cancelación persistidas, avisos sin duplicados. |
| X-15 | Exportaciones V2 y lectura histórica V1 | UI/observaciones/CSV/PDF coinciden; cinco dimensiones separadas y PDF renderizado/inspeccionado en móvil. |
| X-16 | Reinicio controlado de servicios y nuevo login | Mismos volúmenes, registros/versiones/bytes conservados; UI y cola coherentes. |
| X-17 | Respaldo/restauración aislada | Evidencia vigente para candidato; repetir si cambios la invalidan. Si se genera respaldo final nuevo, verificarlo en destino vacío antes de afirmar recuperabilidad. |
| X-18 | Límites de archivos y referencias | Rechazos de tipo/tamaño, carga/descarga/sustitución/archivo; recurso/version exactos y referencias conservadas. |
| X-19 | Fidelidad UX desktop/móvil | Todas las acciones activas de la matriz enlazadas a casos ejecutados; iconos decorativos clasificados, estados/error/confirmaciones visibles. |
| X-20 | Ayuda, contacto, soporte y planes | Rutas/acciones vigentes completas; tickets/inquiry/plan/documentos persistidos según permisos, sin afirmar cobro ni correo externo no implementado. |
| X-21 | Recuperación y cambio de contraseña, datos inválidos y enlace usado/expirado | Política y confirmación validadas; contraseña actual incorrecta rechazada; nuevo login y credenciales previas rechazadas cuando corresponda; cuenta propia y permisos intactos. Preferir cuentas nuevas del ensayo para variantes de fallo; contraseña elegida privadamente, nunca guardada en informe. |

El documento organiza la ejecución; sus tablas no prueban por sí solas las 404 acciones integradas. Antes del ensayo, expandir pasos por acción/modales/variantes de la matriz vigente y asignar los QA exactos. Ninguna fila obligatoria puede quedarse sin caso o evidencia. Chat, adjuntos de chat y mejoras R6/cosméticas siguen diferidos. ARCHIVOS-013 ya tiene evidencia específica autorizada: no repetir borrado ni extender esa autorización a nuevos objetos.

## Registro y defectos

Usuario: ejecuta las acciones de uso y confirma comprensibilidad/resultado. Codex: acompaña, recoge evidencia saneada y compara persistencia/contratos con permisos ordinarios. SQL/lecturas privilegiadas sólo complementan diagnóstico; el permiso del usuario se verifica con su Auth/API ordinaria.

Para cada caso registrar: runId; candidato HEAD+diff/BUILD_ID; fecha UTC y zona; ID de caso y acciones de matriz; QA; actor UUID/rol/clínica; ruta; navegador/dispositivo; precondiciones; pasos; esperado; obtenido; estado; recurso/versión inicial-final; operationId/recibo si existen; evidencia local y defecto relacionado. Usar `.aba.local/qa/<runId>/` para evidencia privada, fuera de Git. El informe público usa alias y hashes/IDs necesarios, nunca passwords/JWT/clave privilegiada/URLs firmadas/cuerpos de correo/datos reales.

Estados: NO EJECUTADO, EN EJECUCIÓN, APROBADO, FALLIDO, BLOQUEADO; NO APLICA sólo con requisito/justificación y acuerdo registrado. Un skip no es aprobado. Resumen por casos únicos: aprobados/total aplicable; reintentos cuentan como historial del mismo caso, no cobertura adicional.

Defecto: reproducción, esperado/obtenido, impacto funcional/seguridad/datos, recurso propio, corrección, versión, repetición y regresiones. Cero defectos funcionales/de seguridad/pérdida de datos bloqueantes; cualquier pendiente residual debe documentarse sin esconder una omisión obligatoria bajo una aceptación genérica.

## Entrega y aceptación

Informe consolidado y tres resultados por perfil, trazabilidad por acción/QA, inventario de cuentas y datos conservados, defectos/resoluciones, omisiones reales, manuales de arranque/uso/respaldo/recuperación y límites. Revalidar tipos/lint/build y suites pertinentes sobre el candidato final. Actualizar checklist/matriz y status-map con checkpoint fechado al cerrar cada paquete, sin convertir planificación en hito cumplido.

QA-016 pregunta explícitamente si el usuario acepta esa versión y el alcance local acreditado, una vez satisfechos todos los gates. No pedirla con QA obligatorios abiertos. Planificar este ensayo no concede permiso para crear nuevas cuentas hoy, cambiar el usuario o desplegar VPS.

## Shift-right futuro — separado del cierre local

Tras aceptación local y autorización de despliegue: repetir smoke de tres perfiles con datos sintéticos en la infraestructura elegida; verificar dominio/HTTPS, cookies/callbacks reales, correo externo e invitación/reset, proxy, WebSocket/Realtime, Storage, migraciones, reinicio, respaldos y recuperación. Medir errores de login/mutaciones, latencia de flujos críticos, fallos de sincronización/cola y entrega de correo con umbrales acordados antes de salir online. Logs con correlación sin datos sensibles. Probar retorno a versión conocida sin restaurar a ciegas una DB incompatible. Definir responsables y ventana de observación con el usuario entonces; no crear monitor/automatización ni iniciar VPS ahora.

## Decisiones a acordar al preparar G0

1. Cuenta local concreta del usuario y clínica; mantenerla como admin o elegir también la variante de cambio de rol.
2. Tres cuentas distintas (propuesta) y direcciones locales para las dos altas; método de activación compatible con Auth actual, sin inventar registro público inexistente.
3. Candidato/URL, navegador y disponibilidad de teléfono físico; pruebas exclusivamente con datos clínicos ficticios.
4. Selección de recursos existentes aptos y mínimos nuevos, preservando originales.
5. Inicio cuando finalice el QA técnico pendiente; usuario opera y Codex registra. No se interpreta silencio como aprobación de decisiones pendientes.
