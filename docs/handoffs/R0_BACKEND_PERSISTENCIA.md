# Handoff R0 — backend y persistencia

Estado: REVISADO DIAGNÓSTICO; NO INTEGRADO. Agente concluido, inspección de solo lectura el 2026-09-12 sobre HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 y cambios locales preservados. No se inspeccionaron filas, secretos ni DB remota. SQL aplicado, RLS efectiva y comportamiento runtime siguen NO VERIFICADOS.

## Inventario estático

30 tablas public: organizations, memberships, clients, guardians, siblings; assessments, acquisition_programs, acquisition_goals, behavior_plans, clinical_sessions, session_behavior_measurements, session_acquisition_trials; student_assignments, student_authorization_requests, student_authorization_decisions; client_context_profiles, clinical_history_entries, consent_records, consent_events; programs, program_versions, program_lifecycle_events; session_program_records, clinical_record_events; audit_events, clinical_audit_events, student_access_audit_events, clinic_admin_events; test_data_batches, test_data_cleanup_log.

Ledger adicional: private.clinic_invitation_operations. No se inventariaron vistas, buckets/políticas Storage ni publicaciones Realtime en las migraciones de aplicación.

28 RPC public: create_client, mvp_save_student, mvp_set_student_status, save_client_context, append_clinical_history_entry, append_clinical_history_entries, record_consent_reference, get_student_capabilities, request_student_authorization, decide_student_authorization, revoke_student_authorization, set_student_assignment, create_program_draft, create_program_successor, transition_program, mvp_update_program_draft, create_clinical_session, mvp_save_record, mvp_finish_session, mvp_discard_record, mvp_archive_session, mvp_team, mvp_set_member, mvp_begin_clinic_invitation, mvp_complete_clinic_invitation, mvp_open_test_batch, mvp_freeze_test_batch, mvp_cleanup_test_run. Fuente: src/lib/supabase/database.types.ts y migraciones actuales.

Edge Function: invite-clinic-member. Su validación getUser y uso servidor de service_role se reutilizan como patrón; invitar membresía no equivale a compartir una ficha externamente.

## Autoridad que debe extenderse

private.has_student_capability centraliza student.view/edit, program.view/create/edit, record_config.view/create/edit, record.view/capture/submit, chart.view/configure, result.download, authorization.request/decide/revoke. Complementos: is_clinic_admin, is_primary_student_supervisor, has_active_student_assignment y student_assignment_role.

La versión B0 exige clínica/membresía/asignación activas; excluye asignaciones futuras y lotes congelados. Supervisor principal decide/revoca; técnico/coordinador captura según capacidades. Todavía no admite externo sin membresía ni lectura familiar por manifiesto. El tipo cliente StudentCapability enumera solo cinco capacidades: debe alinearse, sin crear motor paralelo ni autorizar por user_metadata.

## Brechas y dependencias de implementación

| ID | Propietario | Evidencia estática | Cambio requerido |
|---|---|---|---|
| B01 | A2 | Allowlist mvp_save_student en 20260910184204_functional_clinical_admin_crud.sql | Nombre nullable, RUT separado, foto, motivo y personas/contactos V2; no inventar nombres históricos |
| B02 | A2 | Mismo SQL:116 y139 borra guardians/siblings | Upsert por IDs estables; conservar vínculos existentes y futuros |
| B03 | A3 | program-session/contracts.ts y 20260907223420_mvp_clinical_records.sql | Cinco dimensiones y MeasurementV2 íntegro; V1 permanece original |
| B04 | A3 | Restricción unique(session_id,program_version_id), SQL anterior:70 | Varios registros independientes por programa/sesión |
| B05 | A3 | mvp_save_record rechaza enviado; clinical_record_events no conserva contenido anterior | Revisiones inmutables con motivo/predecesor y ledger operation/key/recibo durable |
| B06 | A3 | clinical_sessions draft/completed/archived; creación implícita al capturar | Timeline persistido, versión, selección previa, pausas/tiempo activo y cierre/cancelación confirmados |
| B07 | A3 | Validador publicación 20260831162901_s_aba_03_program_lifecycle.sql exige campos V1 | Discriminación V1/V2 sin recodificar texto; mantener programa/version separados e inmutabilidad publicada |
| B08 | A3/orquestador | mvp_update_program_draft no exige expectedVersion/key; IDs generados servidor | Identidad estable y concurrencia coherentes con comandos V2 y sincronización |
| B09 | A4 | Ausencia de persistencia de shares/publicación familiar | Extender capacidades por ficha: pendiente sin acceso, externo sin membresía general, familia solo manifiesto |
| B10 | A2/A4 | Adjuntos son puertos; evidence_reference textual; Storage/Realtime apagados | Metadatos/versiones/asociaciones privadas y consentimiento vinculado; archivo lógico conserva bytes |
| B11 | A2 | Historial dose/prescriber/started/ended y supersedes | Frecuencia/notas separadas, estado tratamiento separado de superseded/entered_in_error y snapshots históricos |

Captura V1 rechaza intervalos null al enviar; V2 permite cobertura incompleta con observaciones. Esta diferencia debe resolverse explícitamente en el adaptador/RPC, no reducirse otra vez a booleanos.

No existe persistencia inventariada de chat/notificaciones/agenda/planes/suscripciones/documentos comerciales/tickets. Corresponde a A4/A5, no a mocks. Offline A7 depende de B04/B05/B06/B08 y revalidación de permisos, no del mero tipo de cola.

## Aceptación y límites

Se acepta el inventario como diagnóstico, no entrega funcional. Reutilizar tablas, lifecycle/consent/history supersedes, capacidades/RLS, concurrencia existente, ledger de invitación y lotes. El orquestador ordena/aplica migraciones y regenera tipos únicamente del esquema aplicado. Mantener aislamiento, trabajo ante conflicto, versiones publicadas, V1, pendientes sin confirmación ficticia y restricciones contra modificación directa.

No se ejecutaron suites, servicios, migraciones, advisors ni QA. La revisión documental no prueba seguridad runtime. R5 debe validar integralmente permisos existentes y nuevos sobre el producto reintegrado.
