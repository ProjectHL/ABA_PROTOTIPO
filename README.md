# ABA

Aplicación clínica multiclínica para gestionar fichas, profesionales, programas de intervención, sesiones, mediciones y resultados. Incluye colaboración por recurso, publicaciones para familiares, agenda y documentos privados.

## Documentación

- [Desarrollo](docs/DEVELOPMENT.md): entorno, comandos y contribuciones.
- [Arquitectura](docs/ARCHITECTURE.md): frontend, backend, datos, perfiles y flujos.
- [Pruebas](docs/TESTING.md): cobertura mantenida, CI y aceptación de usuario.
- [Despliegue](deploy/README.md): contenedores y configuración del servicio web.

## Stack

Node.js 22, Next.js 16, React 19, TypeScript, Mantine, Zod y Supabase (PostgreSQL, Auth, Storage, Realtime y Edge Functions). Vitest y Playwright cubren pruebas automatizadas. Las versiones exactas están en `package-lock.json`.

## Inicio de desarrollo

1. Instalar Node.js 22 y usar la versión de npm indicada en `package.json`.
2. Ejecutar `npm ci`.
3. Crear `.env.local` a partir de `.env.example` y completar los valores del entorno de desarrollo autorizado.
4. Ejecutar `npm run dev -- --webpack`.

La configuración de ejemplo no permite operar con datos reales. El backend debe estar provisionado y sus migraciones aplicadas; ver [desarrollo](docs/DEVELOPMENT.md). No subir `.env.local`, credenciales, copias de base de datos ni datos de pacientes.

## Verificación

```sh
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
```

La CI comprueba código, pruebas y construcción de contenedor. Su aprobación no sustituye la aceptación clínica: los recorridos finales de administración, supervisión y registro técnico requieren validación humana antes de producción. Chat y sus adjuntos quedan fuera del alcance de entrega actual.
