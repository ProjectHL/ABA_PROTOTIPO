# Propuesta de reconciliación QA-003 — evidencia actual

Auditoría documental sin ejecutar suites ni cambiar producto, identidades, canon o mapa. Ledger V10 revisado con404acciones. Las pruebas históricas no se convierten en ejecución V10 ni en comparación UX.

{
  "executionState": {
    "evidence-mapped-review-pending": 219,
    "evidence-not-reconciled": 92,
    "desktop-mobile-verified": 40,
    "desktop-mobile-partial": 4,
    "desktop-mobile-verified-historical-candidate": 4,
    "desktop-mobile-verified-mixed-candidates": 45
  },
  "auditState": {
    "verified": 39,
    "evidence-not-reconciled": 71,
    "partial": 61,
    "execution-evidence-mapped": 85,
    "execution-evidence-partial": 7,
    "verified-focal-historical": 39,
    "verified-focal-v8": 8,
    "evidence-not-located": 35,
    "historical-control-asserted": 34,
    "control-gap": 25
  },
  "profilesExplicit": 93,
  "missingLinkedPaths": 0,
  "newHistoricalEvidenceMappings": 4
}

## Evidencia recuperada para vincular

- **FICHA-014**: historical-ui-control-evidence-found. Both passed=true, photoUploadSeparateFromAssociation=true, photoDecoded=true, foreignAndAnonymousDenied=true, priorRecordsPreserved=true. Upload leaves prior photo association unchanged; confirm link increments student version, reload avatar decoded naturalWidth24 and download JPEG exact bytes. Mobile originalPhotoAttachmentId equals desktop photoAttachmentId; association substitution demonstrated with previous attachments retained. Límites: No fresh V10 photo execution or base visual comparison claimed.
- **OPERACION-012**: scoped-restore102-proof-found. catalog102, dbRestored/restored/sourcePreserved/isolated/physicalStorageVerified/ordinaryAuthStorageVerified/assignmentRlsActorsVerified all true. 90 selected table fingerprints/2350 rows; full physical Storage40 files/85140 bytes; Auth/Storage internal health200. Límites: Respect scope limitations: no restored REST/Realtime/SMTP/PWA/VPS; no off-machine copy or per-database role settings recovery. Do not claim synthetic writes after backup present in snapshot.
- **OFFLINE-001**: historical-desktop-install-proof-found-restricted. Archived last-run passed; source asserts real CDP PWA.install/PWA.launch exact target, standalone/controller and reload. Límites: Historical evidence only; DO NOT repeat Windows registration/install, current user prohibits Windows interaction. No Android/iOS installation claimed; no persisted summary file available separate from original runner attachment.
- **ESTADOS-006**: historical-unavailable-state-evidence-found. Denied A URL shows no current access/choose-clinic text; Nombre completo and Guardar ficha controls absent, RPC student detail null. /team non-admin lack invitation control; /plans non-admin lack Crear documento; external/family lack clinic new appointment/ticket. Límites: These are concrete unavailable states only; do not claim all routes/errors/loading/404 controlled. Historical profile contexts as recorded; current V10 regression still distinct.

## Rutas por perfil

- 16 individual completion artifacts over8actors×desktop/mobile,15 routes each, mainly headings/control enabled-state/read denied.
- Current-context aggregate last-run FAILED one historical case; separate mobile-clinic last-run PASSED and supervisor-a mobile completion artifact exists there. Do not label original combined run passed.
- Only admin-a positive A folder in these summaries; supervisor-a/technician-a explicitly denied due no student.view. All B actors A-folder denied, no own-B detailed positive case.
- Need tie positive supervisor/technician capture/resource flows to focal assignment evidence, and authorization semantics to exact permitted control; cannot infer from roles or headings.

## Paquetes de brechas

### clinical-field-edits (prioridad 1)

Acciones: FICHA-002, FICHA-005, FICHA-007, FICHA-008, FICHA-010, FICHA-011, FICHA-012, FICHA-015, FICHA-017, FICHA-025, FICHA-027, FICHA-028, FICHA-029, FICHA-032, FICHA-033, FICHA-034.

- Independent changed values for initials,name,clinicalID,birthdate,diagnosis/Other,RUT normalized/invalid/optional,language,living arrangement/home/school/adaptations; correlated ACK, reload DTO exact and original unrelated fields retained.
- List search name/initials/clinicalID/RUT/diagnosis and Todos filter exact DTO matching; card menu open/close/View/back navigation.

### clinical-history-variants (prioridad 1)

Acciones: HISTORIAL-001, HISTORIAL-012, HISTORIAL-013, HISTORIAL-016, HISTORIAL-017, HISTORIAL-019.

- Diagnosis/procedure variants independent from assessment; medication expand/history, prescriber/date/notes exact fields; cancel no-write; remove reference retains evidence object and stable association history.

### authorized-search (prioridad 1)

Acciones: BUSQUEDA-002, BUSQUEDA-003.

- Positive student/program/document queries, no foreign result leakage, allowed result navigation checks resource authorization; revoked or manipulated resource unavailable after navigation.

### notifications-ui (prioridad 1)

Acciones: NOTIFICACIONES-003, NOTIFICACIONES-004, NOTIFICACIONES-005.

- Click actual read/unread buttons; capture command+receipt, reload state, preserve original value; follow authorized resourcePath and revoked path denies without metadata. RPC-only Realtime proof is insufficient for clicks.

### offline-controls (prioridad 1)

Acciones: IDENTIDAD-002, OFFLINE-014, OFFLINE-015, OFFLINE-016, OFFLINE-017.

- Reconcile existing ABA_QA_OFFLINE_SCOPE_UI opt-in execution; code exists but aggregate pass alone does not prove branch.
- Explicit pending-discard confirmation/cancel, exact selected command only, other pending/dependencies retained; remove selected download preserves other cache and does not fabricate server clinical delete.
- Logout cancel stays scope, accept blocks prior cache under second identity then original payload returns exactly with original identity.

### program-edit-variants (prioridad 1)

Acciones: PROGRAMAS-008, PROGRAMAS-010, PROGRAMAS-014, PROGRAMAS-017, PROGRAMAS-019, PROGRAMAS-020, PROGRAMAS-021, PROGRAMAS-022, PROGRAMAS-023, PROGRAMAS-026, PROGRAMAS-027, PROGRAMAS-029, PROGRAMAS-030, PROGRAMAS-044.

- Changed values per named control, not initial creation defaults: antecedent/procedure/help/error/criterion/generalization/title/set-name; precursor/crisis/backendextra fields preserved; multi functions simultaneous save/reopen; version and IDs retained through draft/publication.
- Existing step/item/objective exact edits may be sufficient; inspect existing acquisition/design safe and command payload before duplicate.

### capture-metrics-v1 (prioridad 1)

Acciones: SESION-012, SESION-021, PROGRAMAS-037, FRECUENCIA-008, INTERVALOS-010, DURACION-006, LATENCIA-006.

- Explicit unsaved capture cancel/discard no server completion/write and no lost confirmed draft; distinguish close/saved draft from discard.
- Derive frequency by observed active windows excluding pause, interval positives/observed excludes null, duration total+average closed excludes open, latency responded average excludes pending/NR; payload preservation alone insufficient.
- Inventory V1 true/false undo/event total/manual duration, preserve false semantics and no invented stopwatch; designV1 no manufactured V2 steps/structure.

### result-controls (prioridad 2)

Acciones: RESULTADOS-017, RESULTADOS-018, RESULTADOS-019, PROGRAMAS-039.

- Axis valid and invalid bounds/unit, enlarged graph close retains filters/data exact; explicit domain semantic no blanket rising=improving label.
- Bind existing design PDF/CSV opt-in run+downloads; exports must reflect draft with no persistence, do not infer from generic passed status.

### dashboard-controls (prioridad 2)

Acciones: DASHBOARD-001, DASHBOARD-005, DASHBOARD-006, DASHBOARD-008, DASHBOARD-009.

- Exact professional welcome; active/finished expand and underlying program/detail navigation, correct resourceIDs and no invented result.

### professional-profile-fields (prioridad 2)

Acciones: SHELL-008, SHELL-010, SHELL-011, SHELL-015, EQUIPO-011.

- Change name/title/profession/phone to distinct values and reload+ACK; previous profile test changed description only.
- Persist selected local preset image and replacement between two distinct photographs, retain old private object; cancel-only selection is partial.
- Team search by name and profession, exact matching rows; email search and role filter already proven separately.

### auth-public-controls (prioridad 2)

Acciones: IDENTIDAD-005, IDENTIDAD-007, IDENTIDAD-008, IDENTIDAD-009, IDENTIDAD-010, IDENTIDAD-011, IDENTIDAD-012, IDENTIDAD-013, IDENTIDAD-014, IDENTIDAD-015, SHELL-013.

- Locate original acceptance/initial-password execution, not replay reusedaccepted account; invalid external/protocol-relative next blocked; explicit clinic selector click and subsequent authorized reads.
- Brand/back-to-login/link legal modals close; providers disabled/no request; no quick simulated accounts or role simulation UI. Retire decorative controls explicitly, no fake Auth command.

### support-landing-affordances (prioridad 2)

Acciones: SOPORTE-001, SOPORTE-002, SOPORTE-007, SOPORTE-008, SOPORTE-009, SOPORTE-010, SOPORTE-011, SOPORTE-012, SOPORTE-013, SOPORTE-014, SOPORTE-015, SOPORTE-016, SOPORTE-017, SOPORTE-018.

- Menu Help/Contact/tickets real navigation; commercial request actual submission/receipt distinct technical ticket; section anchors/brand/CTA login/more/docs actual destinations.
- No false IA ready or 24/7 promises; social icons non-interactive absent config, information cards no fake clickable affordance. Source retirement decision plus DOM role/keyboard/pointer assertion, not invented command.

### states (prioridad 2)

Acciones: SHELL-012, ESTADOS-001, ESTADOS-002, ESTADOS-003, ESTADOS-004, ESTADOS-005, ESTADOS-007, ESTADOS-008, ESTADOS-009.

- Positive loading with delayed response, empty/error/retry/unavailable/404 exact control contexts; retry same command/payload if applicable; close error alert issues no request; back/dashboard navigation exact.
- Loader final absence alone is not positive loading state; avatar error alone is not global states coverage.

### decorative-classification (prioridad 2)

Acciones: DASHBOARD-013, PROGRAMAS-043, PROGRAMAS-047, PROGRAMAS-048, PORCENTAJE-024.

- Document removed simulated applicator mode, decorative gear/header icons, orphan-more menu, trial index indicator. Inspect source baseline and current DOM roles/tabindex/handler; noninteractive if decorative. Do not assign fictitious commands.

### operational-evidence (prioridad 3)

Acciones: OPERACION-001, OPERACION-002, OPERACION-003, OPERACION-004, OPERACION-005, OPERACION-006, OPERACION-007, OPERACION-008, OPERACION-009, OPERACION-010.

- Reconcile safe service/mount/health/restart proof, 75API/8actors, local role utility plan and tracked-ignore/runtime/lockfile version hashes. Not UI tests by definition, not reason to repeat Windows install.

## Regla de cierre

No404/global/QA003 promotion from documentary map alone; for each control bind exact action assertion, actor+route, candidate source relation, durable artifact; QA004 baseline comparison remains separate.

El JSON incluye las404filas, artefactos existentes y aserciones de auditoría histórica sin sobrepromoverlas. Para filas antiguas de creación condicional, .last-run no demuestra qué rama se ejecutó; localizar recibo/journal/snapshot o completar sólo la rama faltante.
