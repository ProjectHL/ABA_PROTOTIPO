# R4 — forwards aplicados y catálogo verificado

Fecha: 2026-09-26. Checkout Desktop autorizado. Este corte sustituye el estado de
Docker pausado y forwards preparados de los informes anteriores; no acredita QA.

## Aplicación controlada

- Motor y nueve contenedores aba-reintegration-local operativos. Instalador existente
  verifica identidad/red/bindings loopback y seeds deshabilitados.
- Dry-run: exactamente 20260926221035_dashboard_immutable_session_finish_time.sql
  y 20260926221536_family_live_resource_authorization.sql; sin seeds/roles.
- Aplicación explícita de esos dos archivos: exit 0. Sin reset ni cambios de datos
  clínicos solicitados desde RPC. CLI permanece 2.117.0, Node 22.23.2.
- Historia consultada: 97 entradas, última 20260926221536. Las 97 copias SQL
  coinciden con fuente; cuerpo de ocho funciones comparado íntegramente con la
  última definición revisada: ocho coincidencias, ninguna divergencia.

## Metadatos actuales

Dashboard es STABLE/SECURITY INVOKER con search_path vacío; EXECUTE authenticated,
sin anon/service_role. finishedAt y actividad UTC provienen del evento finished,
no de updated_at mutable por archivo.

family_recipient_active_v2, family_document_authorized_v2 e identity_context_impl:
STABLE/definer, search_path vacío, sin EXECUTE anon/authenticated/service_role.
Los cuatro callers de identidad/portal/agenda/documento usan el gate común:
org/ficha activos, persona familiar no archivada, vínculo activo del actor exacto,
batches abiertos cuando corresponden. No dependen de user_metadata editable.

Portal, agenda y documento públicos: STABLE/definer con search_path vacío,
EXECUTE authenticated solamente entre roles API inspeccionados. Helper Storage
can_read_family_document_object_v2 conserva EXECUTE authenticated por la policy,
no anon/service_role; llama al autorizador exacto de documento.

Policy real family_document_authenticated_download_v2 limita SELECT authenticated
a clinical-attachments y object.get_authenticated, usando el helper anterior.
No se conceden firmas/listados/escritura familiar ni capacidades clínicas generales.
El route sigue exigiendo sesión/contexto, versión exacta, tamaño/SHA-256 y relectura.

## Verificación estática

- Advisors all/local: No issues found, resultados vacíos.
- db lint public/private, warning/fail-on error: exit 0. Once advertencias previas
  (variables sin uso/sombra e inicialización de arrays del validador de medición),
  clasificadas en R4_VOLATILIDAD_Y_LINT_SQL.md; ninguna en los forwards. No declarar
  lint SQL global limpio.
- Tipos regenerados desde public del stack real; huella de fuente sin cambio:
  17f2b42da1cf90cce021cd6ffbe0622fce6036834827a6dedbd31c757a3a1b22.
- Build Next 16.3.4 y TypeScript exit 0; 23 páginas. Grafo runtime 31 entradas,
  153 fuentes, cero imports sin resolver/dormidos, lint cero errores/advertencias.
- Sin suites funcionales/Postman/E2E/fixtures. QA pertenece a R5.

Este corte resuelve la dependencia de catálogo de DASHBOARD-011 y FAMILIA-007/008,
y el boundary SQL pendiente de descarga familiar. R3/R4 no se acepta sólo por
estas migraciones: resta revisión final consolidada y fijar el candidato local.

Referencias consultadas para controles de funciones:
[Supabase Functions](https://supabase.com/docs/guides/database/functions) y
[changelog](https://supabase.com/changelog). No se actualizó el motor/CLI ni se
aplicaron cambios de versiones fuera del paquete aprobado.
