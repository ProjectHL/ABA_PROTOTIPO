<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ABA — ejecución SDD y cierre local

- Fuente de alcance: SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md. Estado: docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md y último apartado vigente de docs/R2_EJECUCION_ACTUAL.md; los apartados históricos no sustituyen evidencia actual.
- Checkpoint de continuidad para operadores: docs/status-map/ABA_LOCAL.json y su reporte HTML. Al actualizarlo, usar la skill `status-map`, contrastar con la evidencia vigente y no tratar sus porcentajes de hitos como aceptación funcional ni como fuente superior al checklist.
- Checkout autorizado: C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO. No editar la copia antigua de OneDrive. Confirmar raíz antes de escribir y respetar permisos del host; no ampliar sandbox desde scripts.
- Entregar paquetes funcionales completos: requisito → contrato → persistencia → pantalla → ruta real → evidencia. No declarar integración por existir un componente o pasar TypeScript.
- En R0–R4 sólo revisión de código, tipado, compilación y metadatos: no crear ni ejecutar suites funcionales. QA integral/Postman pertenece a R5; publicación sólo tras aceptación local.
- Preservar frontend original dc1b0c4 y mejoras posteriores. No crear segunda aplicación clínica ni otro motor de autorización.
- Reutilizar scripts/local. Sin reset/seeds/limpieza automática, sin datos reales ni secretos en evidencia. Operaciones destructivas requieren alcance y autorización explícitos.
- Root controla contratos compartidos, rutas app, dependencias, migraciones y tipos DB. Agentes entregan propuestas SQL; sólo root aplica/ordena migraciones.
- Delegar paquetes independientes cuando acelere la entrega; máximo tres subagentes simultáneos y un propietario por archivo. Leer docs/PROPIEDAD_Y_DEPENDENCIAS_REINTEGRACION_ABA_LOCAL.md antes de asignar.
- Reutilizar mecanismos comunes de comandos: validar antes de retener, reintentar identidad/payload exactos, aceptar éxito sólo con recibo correlacionado, conservar borrador y revisar conflictos. Fallo de refresco no invalida un recibo confirmado.
- Cerrar cada paquete con archivos, acciones cubiertas, evidencia estática y pendientes. Actualizar documentación al cierre del paquete, no por cada edición.
- No construir frameworks de agentes, grafos, MCP o hooks como requisito de cierre. Automatizar sólo repetición concreta que reduzca el trabajo actual.

## Límite operativo fijado por el usuario (2026-10-05)

- Acceso exclusivamente a esta carpeta Desktop ABA_PROTOTIPO y a Docker. Prohibido leer, modificar o configurar Windows y otras carpetas; tampoco utilizar la copia OneDrive ni herramientas de skills ubicadas fuera del proyecto.
- PowerShell autorizado únicamente como intérprete para ejecutar comandos en esta carpeta y órdenes Docker. Esta autorización no amplía el acceso a archivos o configuración del sistema.
- Mantener volúmenes y cambios existentes. Cualquier intervención sobre Windows la realiza manualmente el usuario.
- Los tres recorridos humanos de clínica, supervisor y técnico quedan planificados para la prueba final antes de VPS; no darlos por ejecutados.
