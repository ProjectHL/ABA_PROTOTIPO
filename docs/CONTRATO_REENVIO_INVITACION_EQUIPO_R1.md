# Reenvío de invitación de equipo — contrato propuesto R1

Estado: diseño root, no implementado ni QA aprobado. Complementa EQUIPO-003; no altera accesos externos por ficha de A4.

## Recurso y autorización

Reenviar es un comando explícito distinto de completar una membresía. Identifica clínica, invitación canónica, operación de entrega UUID estable y clave de idempotencia UUID. El servidor deriva email/usuario/rol del registro de invitación: nunca envía a un email arbitrario aportado por quien llama.

En cada reserva, consulta y reconocimiento se exige usuario Auth actual y administrador activo de esa clínica. Se revalida tras el bloqueo de clínica; invitación debe pertenecer a ella y miembro objetivo conservar estado/rol esperados. No modifica roles, suspensiones ni contraseña. El usuario confirmado se presenta como invitación ya aceptada: puede iniciar sesión, no recibe otro enlace de alta ni recuperación solicitada por terceros.

La fuente oficial Auth invite.go distingue usuario existente no confirmado (puede enviar invite) de confirmado (EmailExists). Debe verificarse también el tag de Auth usado localmente antes de implementar el adaptador, no inferir comportamiento de pruebas históricas.

## Registro durable de entrega

Tabla privada separada de clinic_invitation_operations: clínica, invitación, actor, operación, clave, huella calculada en servidor, estado, timestamps y error seguro. IDs/clave únicos por clínica/actor; FK compuestas e identificación de lote para datos sintéticos. RLS/revokes impiden escrituras directas; wrappers públicos invoker llaman implementaciones privadas autorizadas. No conservar token de invitación, enlace secreto, contraseña ni clave service-role en esta tabla.

Estados de implementación propuestos:

- pending: reserva creada, todavía sin efectuar llamada a Auth.
- claimed: una ejecución obtuvo el derecho a enviar. Reintentos de otra ejecución no llaman Auth.
- sent: Auth reconoció envío, no implica correo leído ni identidad aceptada. Registro mantiene el comprobante original para replay.
- failed: rechazo definitivo conocido de Auth; motivo visible seguro. No confundirlo con timeout/red desconocida.
- unknown: ejecución interrumpida o respuesta ambigua después de claimed. No afirmar éxito ni repetir automáticamente el envío.

Repetir misma operación/clave/huella devuelve su estado, sin otro correo. Reutilizar IDs con otro payload produce conflicto. Una nueva solicitud explícita solo se admite después de resolver una entrega unknown o confirmar failed; no existe reenvío ciego por recarga. El UI conserva campos/IDs y muestra el estado pendiente o incierto.

Para unknown, reconciliación local con Mailpit y logs Auth usa metadatos mínimos de destinatario/tiempo/operación, sin publicar contenidos ni tokens. Si no se puede probar entrega, se requiere decisión visible de reintento como nueva operación, advirtiendo posible duplicado. No se anuncian garantías de exactly-once entre PostgreSQL y Auth/SMTP, que no comparten transacción.

## Integración y gate

Root ordena/aplica migración; A1 implementa Edge/Server Action y recorrido original de reenvío. Plantilla type=invite y callback interno ya existen. No se reutiliza completed de membresía como comprobante de email. Ejemplos Postman documentan reserve/replay/estado seguro; A8 comprueba idempotencia, errores, usuario confirmado, permisos y correo en R5. EQUIPO-003 no se marca integrado por este documento.

Fuente: [Auth Invite](https://github.com/supabase/auth/blob/master/internal/api/invite.go).
