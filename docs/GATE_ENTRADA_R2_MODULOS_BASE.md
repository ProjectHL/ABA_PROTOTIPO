# Gate de entrada R2 — módulos base

Estado: R2 AUTORIZADO tras aceptación A1 registrada en `ACEPTACION_R1_GATE_R2.md`; ejecución por A2/A3/A5. Este documento no sustituye la spec ni autoriza QA anticipada.

Ejecución efectiva: A2/A3 activos; creación A5 pendiente de cupo, no tres agentes activos todavía. Ver `R2_EJECUCION_ACTUAL.md` para proceso/capacidad vigentes.

## Base que reciben A2, A3 y A5

- Repositorio activo: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`. El directorio OneDrive antiguo no es alias ni destino de escritura.
- Frontend oficial: `src/views` y `src/features`; baseline `dc1b0c4` e inventario434 acciones/822 anclas. Nuevos controles amplían la matriz, no ocultan acciones existentes.
- Node22.23.2, npm10.9.8, lockfile existente, SupabaseCLI2.117.0. Next y Supabase en Docker local, puertos publicados solamente en loopback. No apuntar a staging ni modificar `.env.local` del host.
- Proyecto Supabase aislado `aba-reintegration-local`; Compose web `aba-local`; lotes y secretos en `.aba.local`, fuera de Git y del contexto Docker.
- Lote sintético ready `2155e99e-bda4-4c68-95cf-b74cacd84ecd`: dos clínicas, ocho cuentas, profesional designada con membresía en ambas. Externo/familia sin membresía general.
- Identidad viva: `IdentityProvider`, `loadIdentity`, clínica activa validada en servidor. Un comando conserva la clínica capturada al abrir el formulario; nunca se redirige silenciosamente a la clínica actual de una cookie.
- Autorización: reutilizar `private.has_student_capability`, `get_student_capabilities` y las asignaciones/membresías existentes. No leer autoridad desde `user_metadata`, no introducir otro motor ni exponer `service_role`.
- Ledger privado de comandos aplicado antes de los consumidores. Perfil ya utiliza recibos durables; contratos clínicos V2 aún no persistidos. Ver `docs/PROTOCOLO_COMANDOS_V2_LEDGER.md`.
- Historial local actual38/38; delivery/primera invitación aplicados y tipos regenerados. Snapshot por hashes sincronizado y SOLO Edge recreado, ambos slugs con JWT requerido; sesión76753 activa. Metadata/disponibilidad no prueban recorridos funcionales.

La aceptación R1 registra el cierre de invitaciones y sincronización de funciones. La disponibilidad de servicios/fixtures no prueba recorridos funcionales ni implica QA aprobado.

## Propiedad y entregas paralelas

| Paquete | Archivos exclusivos | Entrega mínima para R3 |
|---|---|---|
| A2 — ficha/documentos | StudentsPage; features/students excepto ShareButton/ShareStudentModal; modules/students y modules/attachments | IDs ficha/personas estables; lista/ficha original; historial/medicación versionados; consentimiento; servicio común de archivos privado, versiones y acceso temporal por recurso |
| A3 — programas/captura | SessionPage; features/programs y features/dataCollection; modules/program-session | Diseñadores originales completos; V1 conservado; publicaciones inmutables/sucesores; sesiones con eventos; cinco dimensiones; revisiones y recibos atómicos; adaptador compartido para A6/A7 |
| A5 — agenda/gestión | UpgradePlanModal; LandingPage; modules/calendar, modules/commercial y modules/support | Citas/series con zona/participantes/recordatorios; vínculo sesión diferido tipado; planes/subscripciones/documentos internos; tickets y solicitudes; sin promesas de IA/24x7 |

Root conserva `src/domain/**`, `app/**`, MainLayout/AppProviders, package/lockfile, tipos DB, migraciones y orden/aplicación. Los agentes entregan propuestas bajo `docs/handoffs`, nunca aplican SQL ni modifican migraciones compartidas. Ajustes comunes se solicitan con ruta, contrato y motivo; no se editan archivos ajenos en paralelo.

## Contratos de integración obligatorios

1. A2 expone DTO autorizado de ficha y personas para A3/A5/A4/A6/A7. Nombre histórico nullable con fallback iniciales, RUT opcional separado de ID clínico, fotografía como referencia versionada; no inventar datos antiguos.
2. A2 centraliza adjuntos para ficha, avatar, chat, familia y documentos comerciales. Reserva no es confirmación de carga; confirmar requiere objeto esperado y bytes verificados. Archivar no borra físico. URL firmada usa origen público para navegador y se renueva/revalida sin conceder permisos por caché.
3. A3 conserva exactamente ProgramDesignV2/MeasurementV2/SessionV2 compartidos. Publicación exige validación y deja contenido inmutable. I/A/E/NR/null, ayudas, episodios, ventanas y timestamps sobreviven a lectura/edición; ningún booleano V1 se reinterpreta como código clínico V2.
4. Comandos mutadores capturan resourceId, clinicId, expectedVersion y operation/key estables. Autorización vigente antes y después de locks; replay/comparación payload y mutación/recibo en una transacción. Timeout significa resultado desconocido, no éxito ni rechazo definitivo.
5. Guardar/cerrar un modal no logra un programa ni finaliza sesión. Acciones terminales exigen confirmación persistida; revisiones conservan el original y motivo. Conflictos preservan borrador y no fabrican versión actual.
6. A5 resuelve recurrencia por fecha/hora local IANA, no semanas de segundos UTC. Se conservan excepciones y versión de serie; participante/vínculo sesión siempre de ficha autorizada. Notificación no sustituye recordatorio persistido.
7. Módulos online entregan adaptadores a A7, no implementan otra cola offline. Administración/diseñadores requieren conexión. No declarar servidor guardado mientras hay trabajo pendiente.

## Revisión del handoff, no QA intermedia

Cada agente entrega código, DTO/puertos, propuestas SQL con grants/RLS/índices y compatibilidad, rollback seguro o forward-fix, ejemplos operativos Postman sin secretos, acciones por ID de matriz y pendientes concretos. La revisión comprueba diff, autorización, invariantes, dependencias y tipado Node22.

Durante R0–R4 no se crean ni ejecutan suites, consultas funcionales de prueba, recorridos QA de navegador ni colecciones con assertions. Ejemplos documentales no se ejecutan. Postman local12.28.0 está instalado; su colección consolidada y runner se preparan en R5 por A8.

`INTEGRADO` requiere conexión real de presentación y persistencia; no basta un contrato puro o un stub. `QA APROBADO` solo existe después de R5. Rutas provisionales se retiran en R4 cuando las operaciones útiles estén integradas, no antes. Ningún pendiente se convierte en recorte de alcance.
