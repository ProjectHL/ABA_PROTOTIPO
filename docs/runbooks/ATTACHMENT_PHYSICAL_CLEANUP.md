# Limpieza física de adjuntos por lote

Estado 2026-09-27: utilidad administrativa implementada en scripts/local/attachment-cleanup.mjs y wrapper .ps1; guardas y preview verificados en R5. Borrado/respaldo con objetos y recuperación parcial todavía pendientes de validación. No disponible desde la ficha clínica.

## Alcance y autorización

La retirada ordinaria archiva la referencia y conserva historial. La eliminación física requiere un lote explícito, autorización del operador y evidencia de que cada objeto quedó sin referencias activas. Nunca forma parte de `start`, `stop`, fixtures, archivo de ficha o cierre de P1.

Antes de ejecutar se debe:

1. Identificar clínica, lote, bucket, ruta y versión exacta de cada objeto candidato.
2. Excluir objetos `pending-upload`, disponibles, vinculados a consentimientos, fotografías, documentos comerciales o cualquier referencia activa.
3. Confirmar que el periodo de conservación acordado terminó y que no existe una operación incierta sobre el objeto.
4. Generar un preview sin secretos con candidatos, referencias encontradas y motivos de exclusión.
5. Obtener autorización explícita para ese preview exacto y preparar respaldo de metadatos y Storage.

## Utilidad local y preparación

Usar exclusivamente el checkout Desktop autorizado y Node 22 portátil. La utilidad
reutiliza las comprobaciones existentes de proyecto, red y puertos loopback.
Requiere un access token Auth vigente del administrador en
`ABA_CLEANUP_ACCESS_TOKEN`, sólo en el entorno privado de la shell; nunca pegarlo
en documentos, historial compartido, Git o evidencia. El operador Auth debe
coincidir con ActorId y tener membresía admin activa en la clínica activa del lote.
La credencial administrativa de Storage se obtiene sólo en memoria del stack local;
no se concede DELETE/EXECUTE nuevo a usuarios ni se añade endpoint público.

Preview no elimina objetos ni modifica registros clínicos:

```powershell
& ./scripts/local/attachment-cleanup.ps1 -Mode preview -ClinicId 'UUID_CLINICA' -BatchId 'UUID_LOTE' -ActorId 'UUID_ADMIN' -RetentionDays 30 -OperationsSettled
```

30 es sólo un ejemplo: informar el periodo acordado, nunca adoptar este valor
como política real automática. No hay default de retención. OperationsSettled
exige que el operador haya conciliado operaciones inciertas antes de continuar.
El preview registra cada versión, clínica/lote/bucket/ruta exactos y razones de
exclusión. No incluye credenciales ni nombres clínicos; las rutas siguen siendo
información privada, por lo que el JSON se conserva fuera de Git.

Todos los artefactos se guardan en `.aba.local/attachment-cleanup/UUID_PREVIEW`,
ignorado por Git. No se sobrescriben previews ni respaldos completos.

- `backup UUID_PREVIEW`: reautentica/revalida permisos y objetos bajo locks;
  guarda dump completo de metadatos y bytes por versión, verificando tamaño/hash.
  El dump contiene Auth y datos sensibles: acceso privado del operador, no compartir.
- `apply UUID_PREVIEW CONFIRMACION_EXACTA`: sólo después de autorización explícita
  sobre el preview. La confirmación liga UUID y SHA-256 completo; el respaldo debe
  coincidir con ese mismo preview. No ejecutar sólo porque exista requiredConfirmation.
- `reconcile UUID_PREVIEW`: consulta existencia y recibos, sin eliminar objetos.

Estos verbos se ejecutan con el Node portátil sobre attachment-cleanup.mjs o mediante
el wrapper PowerShell (Mode/PreviewId/Confirm). No se incluye un comando de borrado
preautorizado ni se considera este runbook autorización.

## Ejecución y fallos parciales

La utilidad toma advisory lock por clínica/lote y mantiene una sesión PostgreSQL
con locks de referencia y autorización durante cada I/O de Storage. Timeout o
drift abortan, sin sustituir el plan por otro lote. Comprueba foto, consentimiento,
documentos comerciales, manifiestos familiares y referencias de chat sin habilitar
chat. Conserva incluso referencias históricas de evidencia; no elimina sus bytes.
Una FK nueva hacia el registro/versiones sin revisión hace fallar la utilidad.

Sólo considera student-document con registro Y versión archivados, retención
cumplida y sin referencias. Objetos failed o pending-upload también quedan fuera:
no se interpreta una carga fallida como una operación ya reconciliada.

Revalida objeto/hash/permisos antes de eliminar exclusivamente una ruta mediante
Storage API; nunca DELETE SQL sobre storage.objects. Guarda delete-intent con fsync
antes del I/O y recibo por objeto con actor, lote, preview, timestamp y resultado.
Conserva registros/versiones/eventos/ledger PostgreSQL; no marca el batch como cleaned.
Un fallo parcial devuelve exit 1 y complete=false, manteniendo trabajo confirmado.

Reejecutar el mismo preview autorizado omite objetos confirmados después de verificar
que siguen ausentes. Un intento incierto se reconcilia por ausencia y recibo de
intención; una ausencia sin intento registrado no se declara éxito. Si reaparece
un objeto confirmado, no se vuelve a borrar automáticamente. Cambios de referencia,
metadatos o autorización exigen revisión, no nuevas claves o autorización implícita.
Un respaldo parcial incompatible exige otro preview; se conserva para inspección.

## Recuperación

Los bytes quedan respaldados por versionId y el dump conserva metadatos completos.
Restaurar sólo en destino aislado mediante el runbook BACKUP_RESTORE y subir los
bytes a las rutas exactas con Storage API, sin upsert automático sobre objetos
existentes. Una restauración en desarrollo o con datos reales requiere autorización
adicional; no forma parte del retry. Verificar hashes y referencias antes de afirmar
recuperación. La presencia de archivos de respaldo no acredita una restauración probada.

R5 pendiente: respaldo con bytes, borrado de lote sintético previamente autorizado,
fallo parcial, retry/reconciliación y recuperación en destino aislado. Las 28 pruebas
de guardas y el preview local vacío no sustituyen esos escenarios.

Referencia de implementación: [Supabase Delete Objects](https://supabase.com/docs/guides/storage/management/delete-objects).
