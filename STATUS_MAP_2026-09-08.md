# Status map y checklist — ABA Clínico

Corte: 2026-09-08. Fuentes: [auditoría Supabase](AUDITORIA_SUPABASE_ESTRUCTURA_2026-09-08.md), [plan backend](SPEC_PLAN_MEJORAS_SUPABASE_BACKEND_2026-09-08.md) y [SDD-07](SPEC_SDD_07_POC_CLINICA.md).

**Estado global: B0 cerrado técnicamente; el MVP continúa sin autorización para pacientes reales. La salida sigue condicionada a admin, pruebas autenticadas, Auth, recuperación, VPS y aceptación profesional.**

## Mapa actual

| Puerta | Estado | Evidencia | Pendiente de cierre |
|---|---|---|---|
| B0 — Contención | CERRADO TÉCNICO | 29 migraciones alineadas en staging; DML directo revocado; lotes gobernados; grants verificados | Mantener sólo datos dummy hasta B5 |
| B1 — Reproducibilidad | CERRADO TÉCNICO | Docker reset de 30 migraciones de staging; seed sintético; gate de tipos/CI | Mantener el gate verde al publicar el commit |
| B2 — Seguridad | DB + EDGE VERIFIED STAGING | 15 excepciones definer; 5 grants heredados retirados; Edge v2 activa con JWT; operación pending/completed; datos intactos | Activar leaked-password protection y completar prueba autenticada con admin |
| B3 — Funcional staging | PARCIAL / BLOQUEADO EXTERNO | Flujos implementados, consultas clínicas explícitas y pruebas locales verdes | Designar admin; probar admin/supervisor/técnico con JWT reales |
| B4 — Operación | VERIFIED LOCAL / EXTERNO PENDIENTE | BuildKit secret, imagen por SHA, contenedor healthy, logs limpios y runbooks | VPS/HTTPS, backup/PITR y restore aislado |
| B5 — Promoción PoC | PROGRAMADO | Procedimiento de freeze/dry-run/cleanup listo | Aceptación profesional, SHA verde y autorización explícita de corte |

## Evidencia B0

- [x] Migraciones anteriores renombradas para coincidir con staging.
- [x] Migraciones `20260908140309` y `20260908140657` aplicadas en `ABA_staging`.
- [x] `authenticated` sin DML directo sobre `clients`, `guardians`, `siblings`, `client_context_profiles` y `clinical_history_entries`.
- [x] `anon` sin privilegios sobre los cuatro objetos detectados por la auditoría.
- [x] Defaults de objetos creados por `postgres` cerrados a `anon` y `authenticated`.
- [x] Tabla `test_data_batches` con RLS, FK compuesta, índices y estados `open/frozen/cleaned`.
- [x] Crear un fixture dummy exige admin y lote abierto; editar no acepta un lote suministrado por el cliente.
- [x] Congelar un lote retira sus capacidades; cleanup exige frozen y la repetición es idempotente.
- [x] Staging conserva 9 clientes dummy, 6 membresías y 3 organizaciones; no hubo limpieza.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build` pasan.

## Evidencia B1

- [x] `supabase/config.toml` inicializado y limitado al alcance MVP.
- [x] `npm run supabase:reset` reconstruye las 30 migraciones de staging y aplica el seed.
- [x] Seed: 2 clínicas, 4 membresías, 0 pacientes y 0 credenciales de login.
- [x] `npm run supabase:types:check` compara el contrato local con los tipos de staging.
- [x] CI incorpora job Docker para start, reset y control de deriva.
- [x] README actualizado y SDD Markdown movido fuera de `migrations/`.

## Evidencia B2

- [x] Matriz por firma publicada en `docs/supabase/SECURITY_DEFINER_EXCEPTIONS.md`.
- [x] 15 RPC definer justificadas; 5 RPC sin consumidor revocadas; 0 ejecutables por `anon`.
- [x] Operación de invitación privada y durable con estados `pending/completed`.
- [x] Membresía, auditoría y finalización se escriben en una transacción DB.
- [x] Reintento con mismo email reutiliza la operación pendiente y no duplica auditoría.
- [x] CORS deja de usar `*` y acepta sólo orígenes configurados o locales.
- [x] 24/24 pruebas, 17/17 DB, lint, tipos, build y 2/2 E2E pasan.
- [x] Migración `20260908150936` aplicada; staging conserva 9 clientes, 6 membresías y 3 clínicas.
- [x] Edge Function `invite-clinic-member` v2 desplegada y `ACTIVE`, con `verify_jwt=true`; una petición POST anónima devuelve `401`.
- [x] Security Advisor: 15 WARN definer documentados + 1 WARN de Auth.
- [x] Performance Advisor: sin FK no indexada; 60 INFO de índices sin uso por baja carga.

## Siguiente bloque ejecutable

- [x] Desplegar Edge Function v2 con CORS restrictivo; configurar `ABA_ALLOWED_ORIGINS` cuando exista hostname de staging/PoC.
- [x] Sustituir las diez lecturas clínicas con `select('*')` por proyecciones explícitas; lint, tipos, 24/24 pruebas y build pasan.
- [ ] Activar “Leaked password protection” en Supabase Auth.

## Evidencia B4 local

- [x] La clave estable de Server Actions se entrega al build como secreto BuildKit y no como `ARG`.
- [x] Compose etiqueta la imagen por SHA, espera healthcheck, reinicia servicios y limita el crecimiento de logs.
- [x] `deploy/.env` queda ignorado por Git y el puerto interno 3000 no se publica al host.
- [x] Runbooks de despliegue, rollback de aplicación y backup/restore aislado documentados.
- [x] CI incorpora build de contenedor con Buildx y una clave sintética entregada como secreto; no publica la imagen.
- [x] Docker Desktop 4.90 / Compose 5.5.1 construyen la imagen; contenedor `healthy`, respuesta exacta de `/api/health` y logs sin contenido clínico.
- [x] Imagen local validada `aba-clinico:local-validation` (`sha256:c742f8505811665efe192743daf767dbe6714453954e9ea3466773a5fd8a6d40`); contenedor y red de prueba retirados.
- [x] `npm audit --omit=dev` reporta 0 vulnerabilidades en dependencias de producción.
- [ ] Ejecutar restore aislado y medir RPO/RTO; no se restauró sobre `ABA_staging`.

## Decisiones y recursos del propietario

1. Confirmar si la cuenta privada provista por el propietario será **admin/clínica** o **profesional/supervisor**.
2. Entregar un segundo correo si son personas distintas; no compartir contraseñas.
3. Habilitar “Leaked password protection” en Supabase Auth.
4. Confirmar plan de backup/PITR y autorizar un restore aislado.
5. Informar cuando VPS y hostname temporal estén disponibles y coordinar la validación profesional.

Los lotes dummy permanecen abiertos sólo para desarrollo. La limpieza requiere congelamiento, confirmación exacta y autorización de corte; no se ejecuta durante B1/B2.
