# QA003 — auditoría compacta V12

Sólo lectura, sin Auth/UI. Ledger404 revisado por aserción/artefacto; remaining genérico no se interpreta como prueba faltante automática.

## Evidencia existente para conciliar

- **acquisition-full-initial-payload**: Auditor independently deep-compared initial UI command.design against persisted originalDraft.originalDesign: exact desktop and mobile.12 receipts correlated each. UI fills title/objective/antecedent/procedure/teachingProcedure/prompts/errorCorrection/masteryCriteria/generalization/skillArea; prompt levelsI+Modelo,2steps/2sets/2items, published full design preserved. Successor independently edits objective, firststep and item; IDs retained, predecessor/version immutable; lifecyclepause/reactivate/achieve/discontinue and dismiss no-write. Límites: Independent re-edit of every field is not demonstrated; matrix simple Editar controls have actual initial entry+save equality. Do not silently demand a second edit for every field unless requirement specifies existing-value edit or immutable successor semantics. Initial set names and title persisted by exact full payload; independent title/setrename not demonstrated. UX baseline separate.
- **history-medication-lifecycle**: AdminB real UI: assessment v1→v2 correctednotes/supersedes + previousversiondisplay, reload. Medication v1→v5 with dosecorrection, frequencyevolution, finish/restart, ownhistoryID and supersedes chain. Dose/frequency exact equality independently asserted. Safes desktop/mobile have historyVersions2, medicationVersions5, reloadedEachSection and priorRecordsPreserved. Límites: No diagnosis/procedure variant or medicationexpand/cancel in this suite. Prescriber/start/notes supplied but not explicitly DTO equality; do not promote those separatefields from count5 alone.
- **B-positive-admin-clinical**: OwnB studentbbf1e89c, adminB UI edits contact+stableID, siblings+stableID, history/medication/consent; reload each, clinicAdenied. Límites: Contradicts blanket claim no positiveB folder tested; narrower route-profile suite still no ownB. No Bcapture/program UI claimed.
- **B-positive-technician-member**: TecnicoB existing browser session: suspendedfolderUI absent, restoredfolderUI visible after reload; own role and othermembers/assignments restored. Límites: Positive technicianB folder read exists; no technician capture or clinicalwrite action in this packet. Original combined desktop .last-run failed anothercase, individual successproof scope retained, not whole-run passed.
- **B-assignments-role-positives**: AdminB realassignmentUI, tecnicoB and supervisorB ordinarycapabilities positive; assignmentREST9actors3positive6negative. Existing requesteligibility supervisorB canRequest/canEdit true, roles unchanged. Límites: SupervisorB positivecapabilities is not supervisorB capture/editsUI. SQL/REST actorread not substitute serveraction UI.
- **A-technician-future-ui-read**: TecnicoA existing dedicatedstudent: beforeeffective deniedAPI/UI; after real45seconds detailID/clinicalID UI visible; ownassignmentclosed and denial restored, originalassignments identical. Límites: Desktop unique focal; no technician capture/write tested; no new permissions needed for documentary audit.
- **photo-upload-substitute**: Separateupload leaveslinkunchanged, confirm incrementsversion, JPEGbytesdecoded/downloaded/reload exact; mobile oldphotolink matchesdesktop newlyuploadedphoto, proving substitution; priorattachments retained. Límites: Still genericpending in ledger; no new photo tests needed for this coveredbehavior solely because remaininggeneric.
- **search-student-positive-empty**: Open authorized search, invalid1character, positive ownstudent clinicalID exactRPC count and selected route; no-match empty and Escape. ClinicalfieldV11 adds listname/initials/ID/RUT/diagnosis no-match and filters. Límites: Program/document mixed types and foreign/revoked resources not tested by this searchpacket; empty state is specificsearch/list only.
- **specific-retry-state**: Explicit response-loss transportfault then UI sameoperation retry button; session/capture identity/payload preserved and receipt recovered. Límites: Aggregate pass plus concrete deterministic source branches; exact oldrunneropt-in/candidate pairing to be reconciled for historical evidence. Does not prove generalload-error retry everyroute.
- **unavailable-real-profiles**: DeniedA folder shows exact unavailable/clinicneededtext, nofullName orsavefields, RPCnull; nonadminteam/commercial controls absent. Límites: Scope actual deniedroles; do not infer every unavailable-state visual or ability positive.

## Faltantes concretos priorizados

### P1 authorized-search-mixed-isolation

Actual UI program and document result type query/open, crossclinic/no-permission query and manipulated destination rechecks.

Reutilizar: KnownB student/documentmedia retained; own acquisitionA programs available. No new data or grant required for positive query. Source AuthorizedSearch receives path thenrouterpush; destination must enforceauthorization.

Prueba necesaria: UI results equal ordinary authorizedsearchRPC projection bykind/id; positive open expectedresource/tab; B/Aforeign unique querynoresults; revokedactor only if existingfixture exactvalidated.

### P1 role-ui-positive-serveraction

Supervisor and technician positive ownresource ServerActions (capture/program/chart according actual capabilities) not proven by generic role-routes/readonlycapabilities. B positive folderread/adminedit alreadyexists; add only missingpermitted action/profile.

Reutilizar: ExistingB technician/supervisor assignments and ownB student; read currentcapabilities andversions before any plan. A technician futurefocal closedownassignmenthistorically; do not reopen blindly or repeatfuturetest.

Prueba necesaria: Role must come currentidentityDB, chosen allowedcontrol actualclick, exact receipt/persist/reload, denied adminonlycontrol; own-only reversible syntheticcapture. Do not require allwrite types for role lackingcapability.

### P1 behavior-design-controls

Oldlocal suite conditionallycreated behavior; no field-byfield executedjournal confirms precur/crisis/multiplefunctions/additionalbackend fields. Acquisitionjournal is not behavior proof.

Reutilizar: Existing synthetics may be read beforewrite; choose ownnewdraft only if necessary, preserveversions.

Prueba necesaria: Current UI topography/operational/currentDimension/precursors/replacement/crisis/prevention/response/hypothesizednotes +2functions saved design equality, reopen, extrafields retained throughsuccessor andpublish.

### P1 clinical-history-variants

Reporteddiagnosis/procedure creation variants; medication specificexpand/close no-write; prescriber/date/note exactDTO equality, not suppliedalone; cancel edit/create no treatmentfinish.

Reutilizar: Existing syntheticmedication versionchain1→5 for expand/cancel/DTOreadonly reconciliation, so do not recreate5steps. Only newhistoryvariants when needed.

Prueba necesaria: Kind exact+versionid/historyid+correlatedACK+reload; prescriber/start/end/notes separatefields; expandpriorversiondisplay immutable; dialog cancel0commands.

### P1 history-withdrawal-requirement-control-gap

Matrix says Retirar referencia, current history panel exposes Add/Edit and disabledtrash with preservationwarning; no withdrawal handler located. This is a requirement/control decision gap, not just missingtest.

Reutilizar: StudentClinicalHistoryPanel.tsx:50 disabledtrash; StudentDetail historyModal onlynotes correction; existing supersededversionhistorypreserved.

Prueba necesaria: Root resolve whether originalretirement maps to explicit correction/supersession or functionalwithdrawal required; documentauthorizeddecision and assert exactcurrentsemantics. Never invent destructivedelete or fictitiouscommand.

### P2 explicit-loading-error-navigation-states

Positive loader underdelayedrealread, recoverableloaderror andretry retainscontext, errorclose no mutation, explicit returnDashboard in statecomponent.

Reutilizar: Specificempties, deniedroutes, unknowntransportretry alreadyexist. Do not repeat those justbecausegeneric remaining.

Prueba necesaria: Scoped delay/faultinjection in browsercontext only; visibleloader/disabledcontrols, retryerrorcleared+correctresources; no servermutation whenalertclose; stateback/dashboard exactroute.

### P2 small-clinical-ui-remainders

Bind historicalstudentcreate branch/receipt if available; actualBacktolistclick; emptyfullName fallbackinitials; Other selection/autocomplete choice; cardfields active session/family/diagnosis/professional exactsourceDTO; teamsearchname/profession.

Reutilizar: V11 fieldtest coveredRUT/independentfields/listfiltersmenu; no needrewriteallfields. Creationcurrentlyexistingwhen historicallocalbranch notproved; new minimalstudent only if truly necessary. Cardfidelity portions belongQA004.

Prueba necesaria: Only exactremaining UIbehavior, preserveoriginalfields/own-onlyrecord, no global acceptance.

### P2 capture-offline-legacy-controls

Unsaveddiscard versusclose/borrador; V1 aggregateUIinventory; selectedpending/download discard; exactmixedderivedmetricsnotpayloadalone.

Reutilizar: ExistingcaptureV9details preservedmultiplewindows/episodes/response+NR and V10percentagephases; reusepersistedrecords for derivedmathreadonly, no re-create sixrecords.

Prueba necesaria: Explicit discardconfirm/cancel unaffectedrecords+originalpayload; no V1false→new semantics; pausedwindows/mixednull/open/NRmetricmath independently asserted.

## Regla de alcance

- Generic baseline comparison remaining belongsQA004, not automaticallymissingfunctionalQA003.
- Initial entry+exactUIpayload/save/reload proves simple editcontrol; aseconddistinctedit is onlymandatory whereexplicit requirement saysre-edit/successor/history.
- Previously verified focal controls do not establish all404; positivecontrolcoverage vs profileauthorization vsvisualcompare remainseparate.
- Auth/global accepted-runaggregates never substitute individualbranchproof: teamdesktopcombinedfailed butsomeindividualsafescomplete; keeptruthfulscope.
- Final human journeys not executed; real user profile untouched; no newfixtures/remotedeployment.
