# Auditoría de implementación MVP — ABA Clínico

Fecha: 2026-09-07. Proyecto: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`. Esta auditoría sustituye el dictamen operativo de la [reauditoría previa](AUDITORIA_SDD_2026-09-07.md), que se conserva como historial de hallazgos.

## Dictamen

La implementación local y el backend de staging cubren técnicamente G0–G3: identidad por sesión, alcance de clínica, tres perfiles MVP, ficha ampliada, programas versionados, captura persistente y resultados básicos. Los P0 de falsa persistencia, mezcla mock/real, revocación incorrecta de helpers, vigencia de supervisor y redirect externo quedaron corregidos en las rutas publicadas.

**El proyecto aún no está autorizado para pacientes reales.** Falta cerrar G4 y dos verificaciones de G1–G3: designar la primera cuenta admin, probar el recorrido remoto autenticado con las cuentas finales, obtener aceptación profesional, habilitar protección de contraseñas filtradas, ensayar respaldo/restauración y desplegar en la VPS.

## Evidencia local

| Control | Resultado |
|---|---|
| Lint | Aprobado, sin errores |
| TypeScript | Aprobado con tipos regenerados del esquema remoto |
| Unitarias/integración | 5 archivos, 20 pruebas aprobadas |
| PostgreSQL aislado | 13 pruebas; dos clínicas, admin, supervisor, técnico, suspensión e inicio futuro |
| E2E público | 2 pruebas Chrome aprobadas |
| Build | Next.js 16.3.4 aprobado; 11 rutas |
| Contenedor | Compose válido; imagen Alpine construida; healthcheck 200; proceso `nextjs` no root |
| Dependencias de producción | `npm audit --omit=dev`: 0 vulnerabilidades |

La base aislada usa PGlite/PostgreSQL real y reproduce todas las migraciones SQL. Cubre lectura y escritura directa, permisos RPC, aislamiento de clínicas, identidad inmutable, control de versión, programa/versión, captura idempotente, finalización y limpieza por lote.

## Evidencia de staging

- Proyecto `ABA_staging` (`arfwuctpwnnuhdgjtxaa`), PostgreSQL 17.
- 27 migraciones remotas; cuatro migraciones MVP aplicadas el 07-09.
- Tipos TypeScript regenerados después de migrar.
- Edge Function `invite-clinic-member` ACTIVE v1, con JWT obligatorio. Una llamada sin Authorization devolvió 401 y no ejecutó la función.
- Performance Advisor: 54 INFO por índices aún no utilizados en el pequeño dataset, 0 WARN y 0 claves foráneas sin índice.
- Security Advisor: 17 WARN. Dieciséis corresponden a RPC públicas `SECURITY DEFINER` deliberadamente invocables por authenticated y con autorización interna; uno pide activar protección de contraseñas filtradas.
- El ledger `student_access_audit_events` conserva revokes y ahora declara una política deny explícita.
- No se borraron pacientes, sesiones, cuentas ni fixtures remotos.

## Controles implementados

- Admin limitado a su clínica; no existe superadmin global.
- Supervisor/técnico dependen de asignación vigente; solo admin o supervisor principal decide/revoca privilegios.
- Membresía suspendida pierde acceso inmediatamente; no puede retirarse el último admin activo.
- Comandos clínicos validan Zod y vuelven a comprobar relaciones/propiedad en servidor/RPC.
- Ficha atómica con conflicto visible; historial y medicación son append-only con referencia a corrección.
- Captura separa cancelar, borrador, envío y finalización; usa UUID idempotente y rechaza payload distinto con versión obsoleta.
- Resultados se calculan desde registros persistidos, no fixtures de interfaz.
- La limpieza exige admin, clínica, lote UUID y frase de confirmación exacta; preserva Auth, membresías y organización.
- Chat, facturación, upgrade, calendario, adjuntos, duración, latencia, familia y offline no están en las rutas operativas del MVP.

## Hallazgos abiertos

### I01 · P0 operacional · No existe una cuenta admin en staging

Las seis membresías remotas siguen con roles históricos `clinician` o `viewer`. La cuenta privada provista por el propietario existe como `clinician`. Hasta designar la primera cuenta admin no se puede probar administración/invitación desde una sesión normal.

### I02 · P0 de salida · Infraestructura y aceptación no disponibles

No hay VPS/hostname entregados ni evidencia de HTTPS, backup/restauración o aceptación de la profesional. Los artefactos de despliegue están listos, pero no equivalen a una publicación.

### I03 · P1 · Protección de contraseñas filtradas pendiente

El Security Advisor mantiene [este aviso y su remediación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El cambio requiere configuración de Auth en el panel y comprobación posterior.

### I04 · P1 · Falta E2E remoto autenticado

La matriz SQL local pasa y el endpoint de invitación rechaza anónimos, pero no se dispone de credenciales de prueba para ejecutar en navegador el recorrido completo con admin/supervisor/técnico contra staging. No deben compartirse contraseñas por chat; la prueba puede realizarse con invitaciones y recuperación de contraseña.

### I05 · P2 · Código mock histórico no enrutable

Permanecen módulos antiguos con fixtures dentro del repositorio, pero las rutas MVP fueron redirigidas al espacio clínico persistente. No bloquean la PoC mientras continúen fuera del grafo de rutas; conviene retirarlos después del congelamiento para reducir deuda.

## Conclusión por puerta

| Puerta | Resultado de auditoría |
|---|---|
| G0 | Implementación y pruebas cerradas; ajuste Auth manual pendiente |
| G1 | Implementado; bloqueado por designación de admin y prueba de correo |
| G2 | Implementado; pendiente aceptación profesional/remota |
| G3 | Implementado; pendiente aceptación profesional/remota |
| G4 | Abierto: VPS, URLs/secrets, respaldo/restauración, aceptación y corte limpio |

La condición de salida sigue siendo estricta: no publicar con datos clínicos reales hasta cerrar I01–I04 y comprobar que el corte comienza sin fichas ni sesiones dummy.
