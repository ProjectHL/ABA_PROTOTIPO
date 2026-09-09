# Status map y checklist — ABA Clínico

> Documento histórico. El estado vigente está en [STATUS_MAP_2026-09-08.md](STATUS_MAP_2026-09-08.md).

Corte: 2026-09-07. Evidencia vigente: [auditoría de implementación](AUDITORIA_IMPLEMENTACION_2026-09-07.md). Contrato de aceptación: [SDD-07](SPEC_SDD_07_POC_CLINICA.md).

**Estado global: candidato técnico implementado en local y staging hasta G3; G4 permanece abierto. No habilitar pacientes reales todavía.**

Estados: CERRADO = implementado y comprobado; PARCIAL = falta evidencia externa o de aceptación; BLOQUEADO = requiere una decisión o recurso del propietario; PROGRAMADO = debe ejecutarse durante el corte.

## Mapa actual

| Puerta | Estado | Evidencia | Pendiente de cierre |
|---|---|---|---|
| G0 — Base y seguridad | PARCIAL | 27 migraciones reproducibles; PGlite real; matriz RLS; advisor de rendimiento sin WARN; limpieza aislada por clínica+lote | Activar protección de contraseñas filtradas; documentar aceptación de RPC definer |
| G1 — Identidad y administración | BLOQUEADO | Login/redirect/logout/recovery; clínica activa; administración, invitación JWT y asignaciones reales | Designar la primera cuenta admin y probar correo autenticado |
| G2 — Ficha ampliada | PARCIAL | Alta/edición atómica, familiares, contexto, historial, medicación, consentimiento y conflictos persistentes | Validación funcional de la profesional con fixture ficticio |
| G3 — Programas, captura y resultados | PARCIAL | Versionado/activación, borrador, idempotencia, finalización y gráficos persistentes | Recorrido remoto autenticado y aceptación profesional |
| G4 — Publicación | BLOQUEADO | Compose válido; imagen Linux construida; contenedor local respondió health 200 como usuario no root; CI y runbook preparados | VPS/hostname, backup-restauración, corte limpio y aceptación final |

## Evidencia ejecutada

- [x] `npm run lint`: aprobado.
- [x] `npm run typecheck`: aprobado contra tipos regenerados desde staging.
- [x] `npm test`: 5 archivos y 20 pruebas aprobadas.
- [x] `npm run test:db`: 13 pruebas PostgreSQL con dos clínicas y roles reales.
- [x] `npm run test:e2e`: 2 pruebas en Chrome; login/recuperación y deep-link protegido.
- [x] `npm run build`: Next.js 16.3.4, 11 rutas generadas.
- [x] `npm audit --omit=dev`: 0 vulnerabilidades de producción.
- [x] Docker Compose 5.5.1: configuración válida; imagen construida y smoke test `/api/health` = 200 como usuario `nextjs`.
- [x] Supabase staging: cuatro migraciones MVP nuevas aplicadas; total remoto 27.
- [x] Edge Function `invite-clinic-member`: ACTIVE v1, `verify_jwt=true`; solicitud anónima rechazada con 401.
- [x] Security Advisor: eliminado el INFO de ledger sin política; quedan 16 avisos de RPC definer intencionales y un aviso de Auth.
- [x] Performance Advisor: 0 WARN y 0 claves foráneas sin índice.
- [x] Ningún registro remoto fue eliminado; los datos dummy se conservan hasta el corte acordado.

## Checklist pendiente por puerta

### G0 — cierre de seguridad

- [x] Recuperar las 23 migraciones históricas y añadir migraciones MVP reproducibles.
- [x] Corregir vigencia de asignaciones y supervisor principal.
- [x] Probar aislamiento A/B, suspensión, inicio futuro, anon, acceso directo, RPC e idempotencia.
- [x] Corregir limpieza para exigir clínica y lote también en auditorías; prueba regresiva entre clínicas aprobada.
- [x] Declarar deny explícito para el ledger interno y conservar revokes de tabla.
- [x] Revisar dependencias de producción: 0 vulnerabilidades.
- [ ] Habilitar manualmente “Leaked password protection” en Supabase Auth y repetir el advisor.
- [ ] Registrar la excepción de las 16 RPC `SECURITY DEFINER`: son endpoints autenticados con validación interna, no helpers abiertos.

### G1 — primera administración

- [x] Login, redirección segura, query preservado, `replace`, logout con error y recuperación de contraseña.
- [x] Contexto de usuario/clínica/capacidades resuelto en servidor.
- [x] Gestión de perfiles, suspensión y guardia contra retirar el último admin.
- [x] Invitación de cuentas mediante Edge Function sin exponer `service_role`.
- [x] Gestión de asignaciones y acceso total del admin limitado a su clínica.
- [ ] **Decisión requerida:** confirmar si la cuenta privada provista por el propietario será admin o profesional. Hoy es `clinician` y no existe ningún admin remoto.
- [ ] Probar una invitación real y la entrega del correo desde una sesión admin.

### G2 — aceptación clínica

- [x] Identificación clínica, iniciales y fecha de nacimiento con validación Zod.
- [x] Familiares/responsables, parentesco, contacto y contexto.
- [x] Historial y medicación con correcciones por `supersedes`.
- [x] Referencia de consentimiento sin adjuntos binarios.
- [x] Control de conflictos y reapertura persistente cubiertos en PostgreSQL.
- [ ] Profesional valida lenguaje, campos obligatorios y un ejemplo ficticio completo.
- [ ] Recorrido autenticado remoto de guardar→cerrar sesión→reabrir.

### G3 — aceptación de captura

- [x] Crear, versionar, activar y cambiar estado de programas.
- [x] Validar relación programa-versión-estudiante en servidor.
- [x] Porcentaje, frecuencia e intervalos con unidades y denominadores válidos.
- [x] Borrador servidor, envío idempotente y finalización diferenciada.
- [x] Cancelar no persiste ni completa; doble envío no duplica.
- [x] Historial y gráfico básico consumen registros reales.
- [ ] Profesional valida el diseño de un programa y el resultado esperado.
- [ ] Ensayo remoto autenticado con supervisor y técnico.

### G4 — salida PoC

- [x] Imagen Next.js standalone y Compose validados localmente; healthcheck 200 y proceso sin root.
- [x] CI declarada con lint, tipos, unitarias, DB, E2E y build.
- [x] Runbook de fixtures y limpieza por `test_run_id` preparado.
- [ ] Recibir VPS y hostname temporal o dominio; fecha límite operativa: 24 de septiembre.
- [ ] Configurar URLs de Auth, secretos, clave estable de Server Actions y correo.
- [ ] Ejecutar/restaurar un respaldo y documentar tiempos/resultados.
- [ ] Ejecutar CI en un checkout limpio y congelar el commit candidato.
- [ ] Aceptación de la profesional con datos ficticios.
- [ ] Corte: detener escrituras, inventariar lote, confirmar limpieza, retirar `ABA_TEST_RUN_ID` y revocar cuentas temporales.
- [ ] Verificar listas clínicas vacías; cuentas, roles, organización y logs de limpieza preservados.

## Lo que necesito del propietario

1. Confirmar el destino de la cuenta privada provista por el propietario: **admin/clínica** o **profesional/supervisor**.
2. Entregar el segundo correo si administrador y profesional serán personas distintas. No enviar contraseñas ni claves.
3. Informar cuando la VPS y un hostname estén disponibles.
4. Coordinar dos sesiones con la profesional: validación ficticia G2/G3 y aceptación final G4.
5. Habilitar en el panel de Supabase la protección de contraseñas filtradas.

Los registros dummy se mantienen deliberadamente hasta el corte. La limpieza final no se ejecuta como parte del desarrollo ni mediante borrados globales.
