# Runbook de despliegue VPS/HTTPS — ABA Clínico

Este paquete despliega únicamente la aplicación Next.js y Caddy. Supabase
permanece gestionado en la plataforma. La VPS no es un destino de respaldos
clínicos ni de claves de base de datos.

El despliegue se considera **preparado**, no publicado. Ejecutar los comandos de
este documento sobre una VPS requiere una autorización y una ventana de cambio
separadas.

## Arquitectura y persistencia

- `app` ejecuta el artefacto `standalone` de Next.js como usuario no root y no
  publica el puerto 3000 al host.
- `caddy` es la única entrada por 80/443, termina TLS y enruta a `app:3000`.
- Ambos servicios usan `restart: unless-stopped`. Esta política sólo persiste
  entre reinicios si Docker está habilitado al arrancar el sistema.
- La aplicación no guarda estado clínico en disco local. Los volúmenes
  `caddy_data` y `caddy_config` conservan certificados y estado operativo de
  Caddy; `docker compose down -v` los elimina y no debe usarse en operación.
- `/api/health` es una sonda de vida de Next.js. No consulta Supabase a propósito:
  la conectividad y autorización del backend se validan con el smoke autenticado
  y la UAT, evitando reinicios en cascada por una caída externa.

## Gates antes de abrir la PoC

No continuar si falta cualquiera de estos puntos:

1. VPS Linux mantenida, Docker Engine y plugin Compose instalados.
2. Docker habilitado al arranque (`systemctl is-enabled docker` devuelve
   `enabled`) y hora del sistema sincronizada.
3. DNS `A` y, si corresponde, `AAAA` del hostname apuntando a la VPS. No dejar un
   `AAAA` incorrecto: impide la emisión o renovación de TLS.
4. Entrada TCP 80/443 permitida en firewall de proveedor y host; salida HTTPS y
   acceso a los emisores ACME permitidos. Restringir SSH por la política del
   operador.
5. Checkout limpio del SHA candidato y resultado de CI aceptado. No construir una
   imagen de un árbol con cambios locales.
6. URL y clave **publicable** del proyecto Supabase correcto. Nunca usar
   `service_role` en este paquete.
7. Site URL y redirect URL `https://HOST/auth/callback` configuradas en Supabase
   Auth, y `ABA_ALLOWED_ORIGINS` de la Edge Function con el origen HTTPS final.
8. Estrategia de recuperación aceptada según
   `../docs/runbooks/BACKUP_RESTORE.md` y ventana de UAT acordada.

## Directorio operativo y variables

Mantenga un único checkout persistente, por ejemplo `/opt/aba-clinico`, con
acceso limitado al usuario operador. Desde `deploy/`:

```sh
umask 077
cp .env.example .env
chmod 600 .env
```

Complete todas las variables antes de renderizar Compose:

| Variable | Regla |
|---|---|
| `APP_HOST` | Hostname público, sin `https://`, puerto, ruta ni comodín. |
| `ABA_IMAGE_TAG` | Identificador inmutable de la versión; use el SHA Git completo. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL HTTPS del proyecto Supabase objetivo. Queda embebida en el build. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable del mismo proyecto. Queda embebida en el build. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Base64 de 32 bytes, privada y estable entre builds/despliegues. |
| `ABA_TEST_RUN_ID` | Vacía para la PoC; UUID sólo en ensayos dummy autorizados. |

Genere la clave de Server Actions una sola vez y consérvela también en el gestor
de secretos operativo:

```sh
openssl rand -base64 32
```

No rote esa clave durante un despliegue ordinario: los clientes con una versión
anterior pueden conservar referencias de Server Actions. Compose la entrega al
build como secreto de BuildKit, no como argumento. Las variables `NEXT_PUBLIC_*`
son públicas por diseño, pero cambiar cualquiera exige reconstruir la imagen;
reiniciar el contenedor no cambia los valores ya compilados.

En cada shell operativa, exporte el archivo antes de invocar Compose. La
interpolación de `.env` no basta para un secreto definido mediante
`environment:`:

```sh
set -a
. ./.env
set +a
```

## Preflight local en la VPS

```sh
set -eu
set -a
. ./.env
set +a
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$ABA_IMAGE_TAG"
test "$(printf '%s' "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" | base64 -d | wc -c)" -eq 32
docker info >/dev/null
docker compose version
docker compose config --quiet
```

`docker compose config --quiet` falla si falta una variable crítica. No archive
la salida expandida de Compose: aunque las claves publicables no son secretas,
el acta de despliegue sólo necesita el resultado PASS/FAIL.

## Construcción y puesta en marcha

```sh
docker compose build --pull app
docker image inspect "aba-clinico:${ABA_IMAGE_TAG}" --format '{{.Id}}'
docker compose up -d --remove-orphans
docker compose ps
```

Caddy espera a que `app` esté saludable antes de arrancar. La primera emisión de
certificado necesita que DNS y 80/443 ya sean accesibles desde Internet. No exponga
temporalmente el puerto 3000 para sortear un fallo de TLS.

## Smoke y evidencia

```sh
docker compose exec -T app wget -q -O - http://127.0.0.1:3000/api/health
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
curl --head --fail --silent --show-error "http://${APP_HOST}/api/health"
openssl s_client -connect "${APP_HOST}:443" -servername "${APP_HOST}" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
docker compose ps
docker compose logs --since 10m app caddy
```

La sonda debe devolver `{"status":"ok","service":"aba-clinico"}`; HTTP debe
redirigir a HTTPS y el certificado debe cubrir `APP_HOST`. Complete luego un
smoke autenticado con el usuario UAT: login, apertura de una ficha sintética y
logout. Esto valida la conexión real a Supabase y los redirects de Auth; no use
datos de pacientes.

Registre fecha, operador, SHA, ID de imagen, hostname, estado de ambos servicios,
resultado de sondas y vigencia del certificado. No copie `.env`, cookies, JWT,
claves, correos completos ni contenido clínico. Los logs Docker rotan hasta un
máximo aproximado de 50 MB por servicio.

Un contenedor `unhealthy` no se reinicia automáticamente sólo por tener
`restart: unless-stopped`: la monitorización debe alertar y el operador debe
inspeccionar logs antes de ejecutar `docker compose restart app`. Reinicios por
caída del proceso y por reboot del host sí están cubiertos por la política.

## Verificación de persistencia tras reboot

Primero compruebe la configuración sin reiniciar:

```sh
systemctl is-enabled docker
docker compose ps
docker volume ls
```

El nombre concreto del contenedor depende del nombre de proyecto de Compose; la
fuente de verdad es `docker compose ps`. En una ventana autorizada, reinicie la
VPS y, al volver, ejecute desde el mismo `deploy/`:

```sh
docker compose ps
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
docker compose logs --since 10m app caddy
```

La aceptación exige ambos servicios levantados sin ejecutar `docker compose up`,
health HTTPS correcto y los volúmenes terminados en `caddy_data` y
`caddy_config` presentes. Un reboot controlado es una prueba de operación y no
forma parte de la revisión local de este repositorio.

## Renovación de aplicación

1. Registre el tag actualmente activo como candidato de rollback.
2. Obtenga y verifique el nuevo SHA en un checkout limpio.
3. Actualice `ABA_IMAGE_TAG` y reconstruya: las variables públicas pertenecen a
   la imagen, no a un reinicio del contenedor.
4. Ejecute el preflight, `docker compose build --pull app`, `docker compose up -d`
   y todo el smoke.
5. Conserve la imagen anterior hasta que termine la ventana de observación.

No ejecute `docker system prune` como parte del despliegue: puede retirar la imagen
de rollback. Programe por separado cualquier limpieza y liste primero los objetos
exactos que se eliminarían.

## Rollback de aplicación

El rollback no modifica Supabase. Confirme primero que la imagen anterior sigue
localmente, coloque su SHA en `ABA_IMAGE_TAG` y ejecute:

```sh
docker image inspect "aba-clinico:${ABA_IMAGE_TAG}" --format '{{.Id}}'
docker compose config --quiet
docker compose up -d --no-build app
docker compose ps
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
```

Si la imagen no existe, aborte y escale; no reconstruya a ciegas desde un árbol
distinto. Las migraciones de base de datos se corrigen hacia adelante: no use
`reset`, restore ni borrado de volúmenes para revertir una versión de aplicación.

## TLS y operación periódica

Caddy renueva automáticamente los certificados mientras DNS, 80/443, sus
volúmenes y el proceso estén disponibles. Al menos mensualmente y después de
cambios DNS:

```sh
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
openssl s_client -connect "${APP_HOST}:443" -servername "${APP_HOST}" </dev/null 2>/dev/null \
  | openssl x509 -noout -dates
docker compose logs --since 24h caddy
docker compose ps
```

Escalar ante certificado con menos de 14 días, reinicios repetidos, servicio
`unhealthy`, 5xx o fallo de login. Un health verde no autoriza publicación si
backup/restore, UAT o limpieza de datos sintéticos siguen pendientes.

## Bloqueadores antes de pacientes reales

- Elegir Supabase Pro o aprobar y operar dumps lógicos cifrados externos con RPO
  y RTO aceptados; el plan Free actual no ofrece evidencia de backup gestionado.
- Proveer VPS, hostname/DNS y accesos del operador.
- Ejecutar el despliegue y verificar HTTPS/persistencia en una ventana autorizada.
- Ejecutar UAT profesional con datos sintéticos y aceptación registrada.
- Ejecutar la limpieza por lote y el gate final de publicación definidos en
  `../OPERACION_POC.md`.
