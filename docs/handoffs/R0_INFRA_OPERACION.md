# Handoff R0 — infraestructura y operación

Estado: REVISADO como diagnóstico de solo lectura; NO INTEGRADO como producto. Fecha: 2026-09-12. HEAD inspeccionado: 39071f8542968f334ab6732a9a4a222d4ad0a1a1, con cambios existentes preservados.

El agente de diagnóstico concluyó su paquete sin editar, arrancar servicios ni ejecutar suites. El repositorio activo es C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO; el directorio antiguo OneDrive no constituye un checkout utilizable.

## Riesgo prioritario para A1

scripts/run-local-auth-e2e.mjs ejecuta `supabase db reset --local` en finally, incluso ante fallo de lectura de status. supabase/README.md mezcla reset con arranque y recomienda reset después de pruebas. No ejecutar este runner sobre la base local habitual. A1 debe retirar el reset automático y documentar reconstrucción como acción explícita sobre destino validado. El arranque, parada y cierre de pruebas deben conservar datos; QA aislado no autoriza borrar desarrollo.

## Evidencia operativa

- Node de la shell: 24.15.0; npm 11.12.1. Node22 no localizado tras búsqueda autorizada de gestores y cachés. Dockerfile/CI usan22; README y metadatos deben alinearse con la spec.
- package-lock.json v3 existe, pero node_modules presenta instalación pnpm. Normalizar con lock existente sin regeneración arbitraria.
- Supabase CLI local fijado y comprobado: 2.117.0. No depende de CLI global.
- Docker Desktop4.90.0 instalado por usuario en C:/Users/Moonlabpc/AppData/Local/Programs/DockerDesktop. Cliente29.7.2; contexto desktop-linux; Server=null y pipe ausente. Instalación confirmada, motor no operativo.
- Config local: PostgreSQL17, API54321, DB54322, Studio54323, Mailpit54324; Storage y Realtime deshabilitados. auto_expose_new_tables=false conserva grants explícitos. Callbacks3000 no cubren runner3100.
- Seed tiene dos clínicas y cuatro identidades/membresías sin credenciales de login; no satisface todos los perfiles ni fixtures clínicos completos.
- deploy/compose.yml corresponde a VPS/Next+Caddy, no al entorno completo de desarrollo.
- public carece de PWA/IndexedDB; no hay colección Postman2.1. QA histórico pertenece al MVP anterior.

## Entrega exigida en R1

Preflight PowerShell común con Node22, CLI versionado, Docker per-user y motor; Compose dev separado del despliegue; URLs navegador/contenedor distintas; configuración local aislada; scripts start/status/stop/fixtures/cleanup sin reset implícito; cuentas sintéticas por lote y credenciales ignoradas; Mailpit y callbacks explícitos; manual de salud, recuperación y conservación de datos. Ejemplos Postman sin secretos; consolidación y ejecución final exclusivamente R5.

No se aplicaron migraciones ni se ejecutó QA. Estos hallazgos no equivalen a aprobación de R1.
