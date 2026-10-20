# Runbook de Auth — PoC ABA

## Estado verificado

Proyecto: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`). El preflight usa únicamente settings públicos y una llamada anónima negativa a la Edge Function; no crea usuarios ni envía correos.

Estado confirmado por preflight remoto el 2026-09-11:

- proveedor email activo;
- confirmación de email requerida;
- Edge Function de invitación rechaza llamadas anónimas con `401`;
- signup público por email deshabilitado;
- Anonymous Sign-Ins deshabilitado;
- organización en plan Free;
- advisor informa protección contra contraseñas filtradas deshabilitada.

## Decisión de plan

Supabase documenta que leaked-password protection está disponible en Pro o superior: <https://supabase.com/docs/guides/auth/password-security>. Pro también aporta backups diarios con siete días de retención: <https://supabase.com/docs/guides/platform/backups>.

Recomendación para pacientes reales: subir la organización a Pro. Si la PoC permanece temporalmente en Free, el propietario debe aceptar por escrito estos controles compensatorios:

- signup público deshabilitado;
- sólo invitaciones administrativas;
- contraseña única, no reutilizada, de al menos 12 caracteres y con mayúsculas, minúsculas, números y símbolos;
- dump lógico cifrado antes del corte y periodicidad compatible con el RPO;
- una sola profesional inicial y revocación inmediata de cuentas temporales.

## Cambios de Dashboard

Con autorización del propietario, en la configuración general de `Authentication > Sign In / Providers` y en el proveedor Email:

1. [x] deshabilitar la creación pública de nuevos usuarios;
2. [x] mantener Email habilitado para login e invitaciones;
3. [x] mantener confirmación de email activa;
4. fijar contraseña mínima de 12 caracteres y el conjunto más fuerte de caracteres;
5. si la organización ya es Pro, habilitar protección contra contraseñas filtradas;
6. [x] deshabilitar Anonymous Sign-Ins.

En `Authentication > URL Configuration`, cuando exista hostname:

1. Site URL: `https://HOST`;
2. redirect permitido: `https://HOST/auth/callback`;
3. retirar URLs temporales al terminar la transición, conservando sólo las necesarias.

No pegar contraseñas, JWT, claves ni tokens en tickets, commits o actas.

## Verificación

Ejecutar:

```powershell
npm run supabase:staging:auth-preflight
```

Resultado 2026-09-11: todos esos controles devolvieron `true`; Auth queda **PASS** para continuar con UAT sintética. Después ejecutar el advisor: el hallazgo `auth_leaked_password_protection` debe desaparecer en Pro; en Free queda como riesgo compensado y aceptado, nunca como falso PASS.

Finalmente, verificar una invitación administrativa real sólo durante la UAT autorizada. No probar auto-registro creando cuentas externas.
