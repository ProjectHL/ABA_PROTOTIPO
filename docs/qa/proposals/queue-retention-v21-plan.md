# Queue retention V21 — preparada, NO ejecutada

Suite: `tests/e2e/r5.queue-retention-v21.spec.mjs`.
Config: `playwright.queue-retention-v21.config.ts`.
Opt-in: `ABA_QA_QUEUE_RETENTION_V21=1`.

Root ejecutará desktop y luego mobile, Auth serial, candidato V21 build 7AtdY0nw3olpUC5PDvk7o, localhost:3001. No depende de fixture raw inexistente ni inserta entradas en IndexedDB.

Secuencia real UI por viewport:
1. Verificar own94 sin sesiones activas, original intacto y versión clínica33.
2. Crear una sesión propia (ACK1), descargar ficha, guardar notas offline (pending).
3. Otra página/contexto del mismo usuario sintético guarda notas competidoras (ACK2).
4. Reconectar y obtener conflicto real; consultar versión y revisión explícita crea reemplazo enlazado (ACK3). Se conserva fila superseded con payload original.
5. Crear otro pending offline, volver por ruta cacheada a MainLayout. Cancelar Descartar conserva las3 filas; confirmar elimina sólo pending, conserva ACK+superseded byte a byte como JSON y caché.
6. Reconectar sin nueva escritura; cancelar (ACK4) y archivar (ACK5) sólo sesión creada. DTOs iniciales y original deben coincidir.

Cada comando/resultado completo se guarda antes/después de respuesta en journal privado; snapshots raw de la cola en cada hito. Guardas impiden comandos fuera de acción/etapa/ficha/sesión. 5ACK únicos más1conflicto, ninguna captura. Si falla, recuperar misma sesión del journal; no ejecutar de nuevo ni crear otra. La suite rechaza journal/safe ya existentes.

Verificación de preparación: `node --check` y ESLint focal de suite/config pasaron. Sin Auth, navegador ni test ejecutado por el agente. Root debe revisar antes de ejecutar. Los informes safe sólo se escriben si pasa toda la prueba.

