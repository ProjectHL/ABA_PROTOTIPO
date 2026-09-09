# Despliegue de ABA Clínico en VPS

Este directorio despliega únicamente la aplicación Next.js y Caddy. Supabase
permanece gestionado en la plataforma. No copie respaldos clínicos ni claves de
base de datos a la VPS.

## Prerrequisitos

- VPS Linux con Docker Engine y el plugin Compose.
- Puertos 80 y 443 abiertos y un hostname apuntando a la VPS.
- SHA de Git candidato con CI verde.
- URL y clave **publicable** de Supabase. Nunca use `service_role` aquí.
- Redirect URLs de Auth preparadas para `https://HOST/auth/callback`.

## Preparación

1. Copie `.env.example` a `.env` dentro de este directorio.
2. Use el SHA candidato en `ABA_IMAGE_TAG`.
3. Genere una vez la clave de Server Actions con `openssl rand -base64 32` y
   guárdela en `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Manténgala estable entre
   builds; Compose la entrega a BuildKit como secreto y no como argumento.
4. Deje `ABA_TEST_RUN_ID` vacío para la PoC clínica.
5. Verifique que `.env` no aparezca en `git status`.

## Construcción y publicación

Desde `deploy/`:

```sh
docker compose config --quiet
docker compose build --pull app
docker compose up -d
docker compose ps
```

La aplicación no publica el puerto 3000 al host. Caddy es la única entrada,
solicita el certificado TLS y espera a que `/api/health` esté saludable.

## Smoke test y evidencia

```sh
curl --fail --silent --show-error "https://${APP_HOST}/api/health"
docker compose ps
docker image inspect "aba-clinico:${ABA_IMAGE_TAG}" --format '{{.Id}}'
docker compose logs --since 10m app
```

El healthcheck debe devolver `{"status":"ok","service":"aba-clinico"}`. Registre
SHA, ID de imagen, fecha y resultado, pero no copie cookies, JWT, correos ni
contenido clínico en el acta. Los logs rotan a un máximo aproximado de 50 MB por
servicio.

## Rollback de aplicación

El rollback no modifica Supabase. Conserve la imagen candidata anterior, cambie
`ABA_IMAGE_TAG` a ese SHA y ejecute:

```sh
docker compose up -d --no-build app
docker compose up -d --no-build caddy
```

Después repita el healthcheck. Las migraciones de base de datos se corrigen hacia
adelante; no use reset ni restore para revertir una versión de aplicación.

## Pendientes antes de pacientes reales

- Configurar `ABA_ALLOWED_ORIGINS` en la Edge Function con el hostname definitivo.
- Configurar Site URL y redirect URLs en Supabase Auth.
- Activar protección contra contraseñas filtradas si el plan lo permite.
- Completar el ensayo de backup/restore descrito en
  `docs/runbooks/BACKUP_RESTORE.md`.
