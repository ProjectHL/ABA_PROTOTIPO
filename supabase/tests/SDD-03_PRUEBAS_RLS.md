# Simulación de pruebas — SDD-03

Estado: plan de prueba. Requiere entorno Supabase aislado y fixtures no clínicos.

## Fixtures mínimos

- Organización A y organización B.
- Un supervisor principal y un terapeuta asignado en A.
- Un supervisor no principal y un usuario sin asignación en A.
- Un usuario de B.
- Un cliente por organización.

## Casos

| Caso | Actor | Resultado esperado |
|---|---|---|
| RPC sin autenticación | Anónimo | Permiso denegado/no invocable. |
| Cliente de otra organización | Usuario de A sobre cliente B | 42501 o cero filas. |
| Escalamiento de rol | Terapeuta/coordinador | No puede decidir, revocar ni asignar. |
| Sin asignación | Usuario de A sin cliente | Sin capacidades ni escritura clínica. |
| Doble decisión/revocación | Supervisor principal | Segundo intento falla sin estado duplicado. |
| Auditoría | Operación autorizada | Un evento interno; navegador no puede leer ni insertar. |
| Regresión de helpers | RPC autorizada | La RPC sigue operativa aunque los helpers no sean invocables directamente. |

## Criterio de salida

Todos los casos pasan y Security Advisor queda sin avisos nuevos o sin excepciones
explícitamente aprobadas. Solo entonces se genera una migración SQL real.
