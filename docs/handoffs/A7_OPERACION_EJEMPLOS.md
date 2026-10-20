# A7 — operación offline y ejemplos de contrato

Fecha: 2026-09-26. Evidencia documental R3/R4; no constituye QA aprobado.
No ejecutar estos comandos durante R0–R4. Ejecución con cuentas y recursos
sintéticos autorizados, colección Postman y recorridos de interfaz: R5.
Chat y adjuntos de chat quedan fuera de alcance.

## Flujo de interfaz

1. Con identidad online verificada, abrir `/session/<studentId>` y descargar
   explícitamente la ficha. El snapshot se guarda en IndexedDB por usuario/clínica.
2. Seleccionar documentos/versiones autorizados desde la ficha; descargar un
   snapshot no descarga automáticamente todos sus documentos.
3. Desconectado, usar `/offline-workspace` para abrir una ficha descargada. La
   identidad cacheada permite consulta local, no autorización de servidor.
4. Guardar sesión/captura produce pendiente local sólo después del commit
   IndexedDB; no incrementa progreso confirmado por servidor.
5. Si falla ese commit, conservar el formulario abierto: el reintento usa la
   misma operación y payload en memoria. No afirmar durabilidad ni prometer
   recuperación después de cerrar la pestaña cuando IndexedDB rechazó la escritura.
6. Al reconectar, revalidar identidad y permiso de la ficha. Sincronizar por
   dependencias y conservar el comando exacto ante resultado incierto.
7. Un conflicto conserva payload/error. Consultar versión vigente y resolver
   explícitamente mediante operación supersedente; no hay sobrescritura automática.
8. Permiso revocado bloquea el envío, sin eliminar la observación local. Un fallo
   de red o identidad incierta no se presenta como revocación confirmada.
9. Logout/cambio de clínica advierte sobre pendientes. Retirar una ficha no borra
   silenciosamente operaciones pendientes; descartar exige decisión explícita.

No existe endpoint REST de cola offline: IndexedDB y su recuperación se operan
en la interfaz. Los ejemplos siguientes describen los RPC que consume el adaptador,
no sustituyen ese recorrido ni añaden otro backend.

## Lectura autorizada

`POST /rest/v1/rpc/read_program_session_v2`, autenticación local del actor y clave
pública configuradas fuera de este documento. Sustituir variables por UUID reales
de recursos sintéticos ya autorizados; no crear fixtures como parte de este ejemplo.

```json
{
  "p_clinic_id": "{{clinicId}}",
  "p_student_id": "{{studentId}}"
}
```

## Sesión

`POST /rest/v1/rpc/command_session_v2`:

```json
{
  "p_clinic_id": "{{clinicId}}",
  "p_command": {
    "schemaVersion": 2,
    "operationId": "{{operationId}}",
    "idempotencyKey": "{{idempotencyKey}}",
    "studentId": "{{studentId}}",
    "sessionId": "{{sessionId}}",
    "expectedVersion": 0,
    "action": "start",
    "occurredAt": "2026-09-26T12:00:00Z",
    "notes": "",
    "programs": [{"programId": "{{programId}}", "programVersionId": "{{programVersionId}}"}],
    "terminalConfirmation": false
  }
}
```

Inicio nuevo usa versión 0. Para `pause`, `resume`, `update-notes`,
`select-programs`, `finish` y `cancel`, tomar la versión confirmada del recurso y
generar claves nuevas por intención nueva. Conservar snapshot de programas y
cronología válida; `finish`/`cancel` requieren `terminalConfirmation: true` y una
confirmación real del usuario. Un reintento incierto conserva todos los campos,
incluidos fecha y versión original; no usar claves nuevas para el mismo intento.
Guardar localmente no equivale a confirmar un evento de servidor.

## Captura: borrador porcentual

`POST /rest/v1/rpc/command_capture_v2`:

```json
{
  "p_clinic_id": "{{clinicId}}",
  "p_command": {
    "schemaVersion": 2,
    "operationId": "{{operationId}}",
    "idempotencyKey": "{{idempotencyKey}}",
    "recordId": "{{recordId}}",
    "sessionId": "{{sessionId}}",
    "studentId": "{{studentId}}",
    "programId": "{{programId}}",
    "programVersionId": "{{programVersionId}}",
    "expectedVersion": 0,
    "action": "save-draft",
    "measurement": {
      "schemaVersion": 2,
      "dimension": "percentage",
      "phase": "treatment",
      "capturedAt": "2026-09-26T12:01:00Z",
      "notes": "",
      "trials": [{"id": "{{trialId}}", "order": 1, "response": null,
        "recordedAt": null, "responsePrompt": null, "stimulusPrompts": [], "notes": ""}]
    },
    "revisionReason": null
  }
}
```

`response: null` es sin registrar, no NR. Para enviar una observación usar
`submit` y una respuesta observada con su timestamp; I/A/E/NR se representan como
`independent`/`prompted`/`error`/`no-response`. Una revisión de registro enviado
usa `revise`, versión vigente y motivo no vacío; `discard` conserva trazabilidad.
Cada intención nueva requiere claves nuevas; el reintento no cambia medición.

Las otras dimensiones conservan el mismo envelope y su MeasurementV2 específico:

- Frecuencia: `windows` (inicio/cierre) y `events` dentro del tiempo observado;
  enviar exige ventanas cerradas y tiempo positivo.
- Intervalos: `method` whole/partial/momentary e `intervals` con inicio, fin,
  observación y `occurred`; null no equivale a false.
- Duración: `episodes` con inicio/cierre/notas; enviar exige episodios cerrados.
- Latencia: `trials` con antecedente/fecha, respuesta/fecha, outcome y cierre;
  pendiente no se transforma en no-response para permitir el envío.

Fuente exacta de los campos y validaciones: `src/domain/measurements/measurement-v2.ts`.
Los payloads históricos V1 permanecen sin interpretación inventada.

## Recibos, recuperación y límites

El adaptador correlaciona operationId, idempotencyKey y resourceId antes de aceptar
un recibo. Un refresh fallido no anula una escritura reconocida. Recuperar cola
no debe restaurar una captura reconocida antigua encima de una versión más nueva
ni reemplazar observaciones no guardadas del formulario.

Con Web Locks hay exclusión entre pestañas por alcance. Sin esa API la exclusión
es por proveedor; la idempotencia de servidor sigue siendo obligatoria. Una
revocación no puede conocerse mientras el dispositivo está desconectado.

Pendiente R5: comprobar estos recorridos en navegador, recarga, fallos de cuota/
transacción, transporte incierto, concurrencia, conflicto y revocación. Este
documento no es una suite ni acredita que esos escenarios hayan sido ejecutados.
