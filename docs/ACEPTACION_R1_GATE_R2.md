# Aceptación R1 y autorización de R2

Fecha: 2026-09-14. Orquestador: root. Estado: R1 BASE LOCAL ACEPTADA; R2 AUTORIZADO. No constituye aceptación final del producto ni QA aprobado.

## Entrega aceptada

Se acepta el handoff `docs/handoffs/A1_R1_PLATAFORMA_IDENTIDAD.md` tras revisar código, contratos, diff y tipado Node22 final exit0. Login/cambio/recuperación, contexto de clínica, shell/perfil y equipo base consumen Auth/PostgreSQL/Storage reales. Las rutas de identidad y equipo están conectadas al frontend original. Se preservaron cambios previos y operaciones clínicas útiles; no hay autorización por metadata ni aceptación local simulada.

Entorno: Docker Desktop operativo, SupabaseCLI2.117 y Next16.3.4 con Node22.23.2/npm10.9.8. Proyecto aislado `aba-reintegration-local`, web Compose `aba-local`, red propia. API54321/DB54322/Studio54323/Mailpit54324/web3000 publicados solo en loopback. Cuatro archivos.env de staging enmascarados RO en Next; originales del usuario intactos y secretos fuera de Git/contextoDocker.

Root creó, revisó y aplicó38 migraciones en orden, sin reset ni seeds. `migration list --local` confirmó38/38 coincidentes y tipos public regenerados. Lote único `2155e99e-bda4-4c68-95cf-b74cacd84ecd` ready: dos clínicas/ocho identidades Auth; externo/familia sin membresía general. La utilidad secuencial local utiliza una cuenta designada y cambios de membresía reales; su comprobación funcional corresponde a R5.

Primera invitación: Auth createUser sin correo → recibo de membresía → worker delivery común. Reenvío explícito: operación/clave canónica, reserva/claim/finish durables, bloqueo por clínica+target. Pending sin claim caduca conocido sin SMTP; claimed caduca unknown y exige resolución explícita. Clientes no pueden declarar sent ni ver claimToken. Authaccepted no equivale a correo recibido o invitación aceptada. Las decisiones desconocidas no se convierten en reenvíos automáticos.

SyncFunctions por baseline/hashes y preview terminaron exit0. Root recreó SOLO Edge; metadata de ambas funciones confirma verifyJWT=true/entrypoint. IDs/StartedAt de los diez servicios noEdge (nueve Supabase + web) permanecieron exactamente iguales. Proceso foreground `serve-edge.ps1 -Apply`, sesión76753, ACTIVO y conservado: no reiniciar por timeout. No se invocaron las funciones de correo como prueba.

## Estados del inventario

Se acepta integración de35 acciones base, no su QA:

- IDENTIDAD-001,003..015.
- SHELL-001,003,006..008,012..016.
- EQUIPO-001..007,010..013.

La matriz conserva399 acciones PENDIENTE. Las diez acciones A1 con dependencias de otros paquetes siguen pendientes, aunque su base R1 esté entregada:

| Acción | Dependencia que impide declararla completa |
|---|---|
| IDENTIDAD-002 | A7 aviso/decisión ante capturas pendientes antes del logout |
| SHELL-002,004,005 | Rutas y módulos dashboard/ficha/shared originales plenamente integrados en R2–R4 |
| SHELL-009..011,017 | A2 servicio común de adjuntos/metadatos/versiones/cleanup; selección local/persistencia base ya existentes |
| EQUIPO-008,009 | A2/root/R4 ampliar gestión de supervisor principal/vigencia sobre motor existente; RPC actual solo rol/status, crea primary=false |

ESTADOS-009 no se marca completo por cerrar alertas A1: aún faltan propietarios de los otros módulos. Los slots búsqueda/campana/planes/soporte/offline son dependencias declaradas, no mocks ni funciones operativas por existir un placeholder.

## Siguiente etapa y límites

A1 concluye su paquete; podrá recibir correcciones de su propiedad en integración/QA si hacen falta. Se autoriza R2 con A2 ficha/documentos, A3 programas/captura y A5 agenda/gestión, máximo tres agentes simultáneos. Contratos y propiedad en `GATE_ENTRADA_R2_MODULOS_BASE.md`, `CONTRATOS_V2_ABA_LOCAL.md` y `PROPIEDAD_Y_DEPENDENCIAS_REINTEGRACION_ABA_LOCAL.md`.

Root sigue siendo único propietario/aplicador de migraciones y tipos/contratos comunes/rutas/package. Agentes entregan SQL propuesto y ejemplos manuales, no suites ni consultas funcionales. QA completo/Postman permanece exclusivamente R5/A8; publicación online R6/A9 después de aceptación local final.

No se hereda aprobación histórica ni se declaran verificadas funcionalmente Auth/Mailpit/RLS/revocación/replay/backup/Storage/responsive. Las garantías de código y disponibilidad de servicios son evidencia de integración, no de cumplimiento de escenarios QA. Ninguna dependencia documentada elimina alcance de la spec.
