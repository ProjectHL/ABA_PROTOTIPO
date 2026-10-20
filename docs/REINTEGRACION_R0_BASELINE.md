# R0 — Baseline de reintegración integral

Estado: EN CURSO. Fecha: 2026-09-12. No acredita integración ni QA.

## Fuentes y ubicación

- Spec vigente: `SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md`, texto íntegro del alcance aprobado.
- Repositorio real: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
- El cwd antiguo en OneDrive contiene puntos de reanálisis sin Target visible y no permite consultar Git. No se presume que sea un alias funcional del repositorio real. Las escrituras se solicitan explícitamente sobre la ruta real.
- Baseline visual: commit inicial `dc1b0c4`, `src/App.tsx`, `src/pages`, `src/features`, tema y MainLayout.
- Baseline técnico: HEAD `39071f8`, rama main, seis commits locales adicionales a origin/main, más cambios existentes sin confirmar. Se preservan todos.
- Los informes QA históricos describen el MVP anterior; ninguna aprobación se hereda.

## Evidencia inicial de regresión de presentación

| Ruta | Baseline original | Presentación actual | Propietario | Estado |
|---|---|---|---|---|
| / | LandingPage | views/LandingPage | A5 | Revisar promesas y acciones comerciales |
| /login | LoginPage | views/LoginPage | A1 | Auth presente; revisar contrato UX y errores |
| /dashboard | DashboardPage | redirección /students | A6 | REINTEGRACIÓN PENDIENTE |
| /team | TeamPage | ClinicalPage sin ficha | A1 | REINTEGRACIÓN PENDIENTE |
| /shared-access | SharedAccessPage | redirección /team | A4 | REINTEGRACIÓN PENDIENTE |
| /students | StudentsPage | ClinicalPage | A2 | REINTEGRACIÓN PENDIENTE |
| /students/[studentId] | StudentsPage / StudentDetail | ClinicalPage | A2 | REINTEGRACIÓN PENDIENTE |
| /session/[studentId] | SessionPage | ClinicalPage, pestaña sessions | A3 | REINTEGRACIÓN PENDIENTE |
| /students/[studentId]/programs/[programId]/chart | ProgramChartPage | ClinicalPage, pestaña sessions | A6 | REINTEGRACIÓN PENDIENTE |
| no encontrada | NotFoundPage | app/not-found | A1 | Comparación pendiente |

La matriz anterior es un índice de rutas, NO el inventario completo de acciones. R0 debe desglosar cada pestaña, modal, botón, enlace y componente huérfano antes de cerrar.

## Gaps contractuales comprobados

- `clinical/contracts.ts` y `program-session/contracts.ts` duplican diseño y captura V1.
- Porcentaje persiste booleanos; no representa I/A/E/NR, ayudas ni ensayos sin registrar.
- Frecuencia conserva un total agregado; no conserva eventos individuales.
- Intervalos conserva booleanos/null y duración común; no conserva todos los tiempos originales.
- No hay duración ni latencia en los contratos persistentes actuales.
- Diseños tienen pasos/conjuntos como arrays de texto, función conductual única y carecen de las estructuras V2 acordadas.
- Ficha no acepta nombre, fotografía ni RUT; familiares/hermanos de entrada no incluyen ID estable.
- `clinicalContext()` requiere membresía general para elegir clínica; no sirve por sí solo como contexto de externo por ficha o portal familiar.
- Storage y Realtime están deshabilitados en `supabase/config.toml`; Mailpit/local_smtp sí está habilitado.

## Dependencias y límites de trabajo

1. R0: spec, inventario, contratos compartidos V2, propiedad y secuencia de migraciones.
2. R1 A1: entorno local, identidad, shell y equipo.
3. R2 A2/A3/A5: ficha/archivos, programas/captura, agenda/gestión.
4. R3 A4/A6/A7: colaboración, dashboard/reportes, offline.
5. R4: integrar rutas y retirar presentación provisional; conservar sus operaciones útiles.
6. R5 A8: una única fase QA integral del producto integrado.
7. R6 A9: solo tras cierre y aceptación local; requiere autoridad y acceso online posteriores.

R0–R4 no crean ni ejecutan suites intermedias. Se permite revisión y tipado. Solo el orquestador aplica/ordena migraciones; no se resetean bases para arrancar ni se usan proyectos remotos como entorno local.

## Handoffs de diagnóstico

| Paquete | Resultado | Integración |
|---|---|---|
| R0 frontend | Reintento entregó conciliación shell/lista/ficha; 154 anclas vinculadas y handoff R0_UX_SHELL_FICHA.md incorporado | REVISADO DIAGNÓSTICO; NO INTEGRADO |
| R0 backend | Reintento entregó 30 tablas/28 RPC y brechas B01–B11; handoff R0_BACKEND_PERSISTENCIA.md incorporado | REVISADO DIAGNÓSTICO; NO INTEGRADO |
| R0 infraestructura | Reintento entregó inventario operativo y riesgo de reset automático; docs/handoffs/R0_INFRA_OPERACION.md | REVISADO DIAGNÓSTICO; NO INTEGRADO |

El orquestador continúa la inspección local. Ningún paquete funcional A1–A9 está entregado o integrado todavía. La spec solicita Sol/Terra high para esos paquetes; máximo tres subagentes simultáneos.

## Operación comprobada / pendiente

- npm y package-lock existentes; Supabase CLI devDependency fijada en 2.117.0.
- Next 16.1.6 declarado; antes de código Next deben leerse sus guías locales según AGENTS.md.
- Node 22 requerido; shell comprobada: v24.15.0. Falta configurar el runtime 22 sin sustituir globalmente la instalación del usuario.
- CLI Supabase ejecutado: 2.117.0; ayuda consultada. Su lectura desde sandbox produjo EPERM y se verificó mediante ejecución autorizada.
- Docker localizado en `C:\Users\Moonlabpc\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`, cliente 29.7.2, contexto desktop-linux. Consulta autorizada `version`: Server=null; pipe dockerDesktopLinuxEngine inexistente. El motor no está disponible ahora. No se arrancaron procesos.
- No se han aplicado migraciones, ejecutado suites ni alterado fixtures en R0.

## Siguiente gate R0

Avance 2026-09-12: matriz semántica inicial de 378 acciones/requisitos creada en `MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md`; no se declara inventario visual exhaustivo. Esquemas compartidos ProgramDesignV2/MeasurementV2 añadidos, con lectura V1 sin conversión y tipado correcto; pendientes de integración RPC/pantallas/migraciones. Detalle en `CONTRATOS_V2_ABA_LOCAL.md`.

Inventario de acciones completo y trazable + contratos V2 compartidos + plan de migraciones y propiedad de archivos aprobados por revisión del orquestador. Hasta entonces R0 sigue abierto.
