# Despliegue con Dokploy — ABA Clínico

Este paquete despliega la aplicación Next.js y su PostgreSQL en el mismo
proyecto de Dokploy. Ya no depende de Supabase ni de Caddy: Dokploy/Traefik
termina TLS y enruta el dominio público a `app:3000`.

El despliegue se considera **preparado**, no publicado. Ejecutar estos pasos
sobre un servidor requiere autorización y una ventana de cambio separadas.

## Servicios

| Servicio | Rol | Persistencia |
|---|---|---|
| `db` | PostgreSQL 17. Aloja esquema, RLS y funciones. RAM acotada por `DB_MEMORY_LIMIT` (5g por defecto). | `postgres_data` |
| `migrate` | Aplica `db/bootstrap.sql` y las migraciones pendientes. Termina y se detiene. | — |
| `app` | Next.js `standalone` como usuario no root. | `storage_data` (`/data/storage`) |

- `migrate` corre antes que `app` (`service_completed_successfully`). Si una
  migración falla, la aplicación no arranca.
- `app` no publica puertos al host. En Dokploy, asigne el dominio al servicio
  `app`, puerto `3000`.
- `app` no guarda estado clínico fuera de `storage_data`; los adjuntos y avatares
  viven en ese volumen privado y se sirven sólo a través de rutas autenticadas.
- `/api/health` es una sonda de vida de Next.js. No consulta la base a propósito:
  evita reinicios en cascada cuando PostgreSQL está momentáneamente ocupado.

## Variables requeridas

Genere el archivo con secretos reales (no se versiona, queda con permisos 600):

```sh
NEXT_PUBLIC_APP_URL=https://tu-dominio npm run env:init
```

Eso escribe `infra/.env` desde `infra/.env.example`. Después edite `SMTP_*`.
También puede copiar el contenido al panel de entorno de Dokploy: el comando
que ejecuta Dokploy lee `infra/.env`, así que las variables deben existir en ese
archivo o en el entorno del proceso.

Variables:

| Variable | Regla |
|---|---|
| `ABA_IMAGE_TAG` | SHA Git completo de la versión desplegada. |
| `POSTGRES_PASSWORD` | Contraseña larga y aleatoria. |
| `AUTH_SECRET` | Al menos 32 bytes aleatorios; firma las cookies de sesión. |
| `NEXT_PUBLIC_APP_URL` | Origen público exacto, por ejemplo `https://app.example.com`. Se usa en enlaces de invitación y recuperación. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Base64 de 32 bytes, estable entre despliegues. Se entrega al build como secreto de BuildKit. |
| `SMTP_HOST` | Host del servidor de correo. El despliegue usa `email.shiftium.xyz`. |
| `SMTP_PORT` | `25` para el docker-mailserver (STARTTLS oportunista). `465` sólo con TLS implícito. |
| `SMTP_SECURE` | `false` en el puerto 25; `true` en 465. |
| `SMTP_EHLO_NAME` | FQDN que la app presenta en EHLO (`email.shiftium.xyz`). Postfix puede rechazar un hostname corto de contenedor. |
| `SMTP_FROM` | Remitente del dominio: `ABA Clínico <no-reply@email.shiftium.xyz>`. |
| `SMTP_USER` / `SMTP_PASS` | Sólo si el servidor exige autenticación en ese puerto. |
| `SMTP_IGNORE_TLS` | `false` salvo que el servidor no ofrezca STARTTLS. |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `true`; `false` sólo con una CA privada confiable. |

### Cuenta de envío

La app envía como `no-reply@email.shiftium.xyz`. Si el servidor exige
autenticación (puertos 587/465), el buzón tiene que existir en
docker-mailserver y sus credenciales van en `SMTP_USER` y `SMTP_PASS`:

```sh
# En el contenedor del mailserver, una sola vez
docker exec -it <mailserver> setup email add no-reply@email.shiftium.xyz 'UnaClaveLarga'
```

Después definí `SMTP_USER=no-reply@email.shiftium.xyz` y `SMTP_PASS` en
`infra/.env` (permisos 600) o en el panel de secretos de Dokploy. Nunca
commitees la contraseña. El puerto 25 normalmente no autentica: autoriza por
IP del host (`mynetworks`) o rechaza el relay con `554 relay access denied`.

### Verificación de correo

El script de diagnóstico conecta con el SMTP configurado y, si se lo pide,
envía un mensaje real. Nunca imprime credenciales:

```sh
# En una máquina con las variables en el entorno o en infra/.env
npm run mail:check
npm run mail:check -- --to=tu@correo.com

# Contra el stack desplegado, usando la imagen y el entorno de Dokploy
docker compose --env-file infra/.env -f infra/docker-compose.yml run --rm --no-deps \
  app node /app/mail-check.mjs --to=tu@correo.com
```

Qué revisar si falla:

- `ECONNECTION` / `ETIMEDOUT`: el VPS o el firewall bloquea el puerto 25
  saliente. Es habitual en proveedores cloud; hay que pedir el desbloqueo o
  enviar por el 587 con autenticación.
- `EAUTH`: `SMTP_USER`/`SMTP_PASS` inválidos, o el servidor no acepta AUTH en
  el puerto 25.
- `EENVELOPE` / `554 relay access denied`: el docker-mailserver no autoriza a
  la app a enviar a destinatarios externos. Hay que permitir la IP del host en
  `mynetworks` o usar autenticación en el 587.
- `ETLS`: certificado inválido para `email.shiftium.xyz`. Emitir uno válido;
  no desactivar la verificación salvo con una CA privada propia.
- Los enlaces de invitación usan `NEXT_PUBLIC_APP_URL`. Si apunta a
  `localhost`, el correo llega pero el enlace no abre desde otra máquina.

Para entregabilidad real, el dominio remitente necesita SPF, DKIM y DMARC
publicados (docker-mailserver los configura con `setup config dkim`), y el PTR
del servidor debe coincidir con `email.shiftium.xyz`.

Genere los secretos una sola vez:

```sh
openssl rand -base64 48   # AUTH_SECRET
openssl rand -base64 32   # NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

No rote `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` en un despliegue ordinario: los
clientes con una versión anterior pueden conservar referencias de Server
Actions.

## Primer despliegue en Dokploy

1. Cree un proyecto Compose apuntando a este repositorio y a
   `infra/docker-compose.yml`.
2. Cargue las variables del apartado anterior en el panel de Dokploy.
3. Asigne el dominio al servicio `app`, puerto `3000`. Dokploy emite el
   certificado; no hace falta publicar 80/443 a mano.
4. Despliegue. El orden es `db` saludable → `migrate` completado → `app`.
5. Verifique:

```sh
docker compose -f infra/docker-compose.yml ps
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
```

La sonda debe devolver `{"status":"ok","service":"aba-clinico"}`. Complete luego
un smoke autenticado con el usuario UAT: invitación, definición de contraseña,
apertura de una ficha sintética y cierre de sesión.

## Primer acceso

La base arranca sin usuarios y no hay registro público. Cree el primer administrador una sola vez, dentro de la imagen desplegada:

```sh
docker compose --env-file infra/.env -f infra/docker-compose.yml run --rm --no-deps \
  -e ADMIN_PASSWORD='UnaClave12!Segura' app node /app/create-admin.mjs \
  --email admin@clinica.test --name 'Nombre Apellido' --org 'Clínica Demo'
```

Es idempotente. Después entre por `/login` e invite al resto desde Equipo.

## Migraciones

`migrate` es idempotente: registra cada archivo aplicado en
`public.schema_migrations` y salta los ya presentes. Para correrlas desde una
máquina con acceso a la base:

```sh
DATABASE_URL=postgresql://aba:...@host:5432/aba npm run db:migrate
```

El usuario de base debe poder crear roles (`CREATEROLE`): `db/bootstrap.sql`
crea `anon`, `authenticated` y `service_role`. En el PostgreSQL del compose el
usuario es superusuario, así que no requiere ajustes.

Las migraciones se corrigen **hacia adelante**. No use `reset`, restauración ni
borrado de volúmenes para revertir una versión de aplicación.

## Respaldo y restauración

- `postgres_data` contiene la historia clínica. Programe dumps lógicos cifrados
  externos al servidor y pruebe la restauración en una base separada.
- `storage_data` contiene adjuntos y avatares. Un dump de PostgreSQL sin este
  volumen deja referencias sin bytes: respalde ambos con la misma frecuencia.
- Registre RPO/RTO aceptados antes de cargar datos reales.

## Actualización y rollback

Actualización:

1. Registre el tag activo como candidato de rollback.
2. Construya y publique la nueva imagen con el SHA completo.
3. Cambie `ABA_IMAGE_TAG` y despliegue. `migrate` aplica sólo lo pendiente.
4. Ejecute el smoke completo y conserve la imagen anterior durante la ventana de
   observación.

Rollback: vuelva a `ABA_IMAGE_TAG` anterior y redespliegue. Si esa versión
requiere un esquema anterior, no lo revierta con `reset`: prepare una migración
correctiva hacia adelante.

## Operación periódica

- Alerta sobre contenedores `unhealthy`, 5xx y fallos de login.
- `restart: unless-stopped` cubre caída del proceso y reboot del host, pero no
  reinicia un contenedor `unhealthy`: la monitorización debe avisar.
- Revise espacio en `postgres_data` y `storage_data`; los logs rotan a 10 MB por
  servicio (5 archivos).
- No ejecute `docker system prune` como parte del despliegue: puede borrar la
  imagen de rollback.

## Bloqueadores antes de pacientes reales

- Backup/restore probado con RPO y RTO aceptados.
- SMTP real verificado (invitación y recuperación de punta a punta).
- UAT profesional con datos sintéticos y aceptación registrada.
- Limpieza por lote y gate final de publicación definidos en
  `../OPERACION_POC.md`.

## Memoria y disco

La base corre con `DB_MEMORY_LIMIT=256m` y ajustes de PostgreSQL pensados para ese techo (`shared_buffers=64MB`, `max_connections=30`, `work_mem=2MB`). Son suficientes para una clínica pequeña; si `pg_stat_activity` o el log muestran presión, subí a `384m` o `512m`. No uses `5g`: el contenedor reserva ese techo y el kernel puede matarlo por OOM igual si no hay RAM libre en el VPS.

Docker no puede limitar el tamaño de un volumen con nombre sobre ext4. Para un tope real de disco, `db-disk-quota.sh` crea una imagen ext4 de tamaño fijo y la monta como loop device:

```sh
sudo ./db-disk-quota.sh /srv/aba-db 5G
```

Después definí `DB_DATA_DIR=/srv/aba-db` en `.env` y redesplegá. Cada stack necesita su propio directorio (`/srv/aba-dev`, `/srv/aba-prod`). Al llenarse, PostgreSQL devuelve "No space left on device" en vez de llenar el disco del VPS.

Si ya tenés datos en el volumen con nombre, migralos antes de cambiar `DB_DATA_DIR`: `docker run --rm -v <proyecto>_postgres_data:/from -v /srv/aba-db:/to alpine cp -a /from/. /to/` con el stack detenido, y luego `chown 70:70 /srv/aba-db`.

## Datos de demostración

Nunca en producción. Para un ambiente de test, con la clínica ya configurada:

```sh
docker compose --env-file .env exec app node seed-demo.mjs --force
```

Carga seis fichas ficticias y las cuentas `clinico@demo.test` / `lector@demo.test`. La imagen incluye `seed-demo.mjs` y `seed/demo.sql`; el script se niega a correr con `APP_ENV=production`.
