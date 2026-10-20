# QA funcional consolidado — Supabase local

Fecha: 2026-09-10  
Entorno: Next.js local + Supabase Docker local  
Datos: exclusivamente sintéticos (`QA-FINAL-001` y cuentas `qa-*@example.test`)

## Resultado

**PASS funcional.** El recorrido clínico principal persiste y reabre datos desde la aplicación. Se ejecutaron 46 comprobaciones REST/RPC dentro de una sola corrida consolidada; todas pasaron. El typecheck final (`tsc --noEmit`) también pasó.

Después del hardening final, ocho controles de mínimo privilegio y aislamiento pasaron. La compilación de producción (`next build`) y la validación de Compose también pasaron.

## Recorrido verificado desde la interfaz

- Inicio de sesión con admin y técnico.
- Alta de ficha con responsable, recarga y reapertura desde una nueva sesión de aplicación.
- Edición de ficha y retiro persistido del responsable.
- Guardado y recuperación de contexto.
- Creación, reapertura, edición y activación de un borrador de programa.
- Consulta del diseño completo de cada versión con perfil técnico.
- Guardado de borrador de medición, cancelación de cambios no guardados, reapertura, envío y finalización.
- Historial y gráficos visibles para porcentaje, frecuencia e intervalos.

## Contratos REST/RPC verificados

- Ficha: edición, `updated_at`, conflicto por versión obsoleta, archivar y reactivar.
- Contexto: persistencia y vaciado explícito de campos opcionales.
- Historial/medicación: corrección por `supersedes_id` y estado anterior `superseded`.
- Consentimiento: alta, reemplazo y revocación.
- Asignaciones: supervisor y técnico; retiro y reasignación.
- Membresía: suspensión y reactivación con una sesión JWT ya emitida.
- Programas: pausa, reactivación, sucesor, preservación de versión anterior, logrado y discontinuado.
- Medición: porcentaje, frecuencia e intervalos; creación, edición de borrador, reintento idempotente, rechazo de versión obsoleta, envío, finalización y archivado.
- Validaciones negativas: denominador vacío, conteo negativo, duración cero e intervalo incompleto.
- Semántica de intervalos: `false` conserva “no ocurrió” y `null` conserva “no registrado”.
- Descarte: permitido sólo para un borrador no enviado; un registro enviado no se elimina.

## Correcciones realizadas durante el QA

- El selector de programa queda bloqueado después del primer guardado persistido de una captura.
- Los perfiles de consulta pueden desplegar el diseño completo de las versiones de programa.
- Reabrir y descartar borradores sólo se muestra al actor que creó el registro.
- Los borradores de programas cerrados ya no muestran acciones incompatibles con su estado.
- La ficha conserva las referencias de consentimiento como bloque de lectura cuando no hay capacidad de edición.
- Se retiró la implementación visual antigua de programas/captura/resultados que ya no era alcanzable.

## Fuera de este resultado

Este PASS prueba lógica y persistencia local. La revisión final de Auth/RLS, promoción a staging, respaldo/restauración, despliegue HTTPS y aceptación profesional continúan pendientes antes de trabajar con pacientes reales.
