# R5 — programa publicado y captura real de cinco dimensiones

2026-09-27. Checkout Desktop autorizado, HEAD
39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios existentes preservados.
Progreso funcional parcial: no aceptación global, chat/R6 siguen excluidos.

## Evidencia ejecutada

- UI desktop: 2/2 pasan, 38.6s. Landing/login/contexto/ficha/edición por Server
  Action, programa QA R5 CONDUCTA LOCAL publicado y activo después de recarga.
  Sesión existente iniciada en intentos anteriores reutilizada sin duplicarla;
  cinco capturas enviadas, recarga conserva las cinco y finalización confirmada.
  Porcentaje: I observado, otros ensayos sin registrar; frecuencia: ventana y
  evento; intervalo: una ventana real de un segundo observada; duración: episodio
  cerrado; latencia: antecedente y respuesta. No reloj ni persistencia simulados.
- UI móvil 390x844: 2/2 pasan, 21.5s; ficha y programa persistidos, logout y
  protección de ruta. Esta ejecución no demuestra captura móvil de cinco dimensiones.
- API real: 73/73 pasan; ocho identidades de prueba, dos clínicas, diseño V2
  publicado y sesión finalizada con exactamente cinco IDs de registro distintos,
  enviados/no descartados, versión publicada y dimensiones exactas. Contratos
  canónicos de sesión/medición válidos y cinco métricas finitas. Identidades
  admin-b, externa y familiar sin vínculo reciben rechazo de lectura de programa.
  Repetición ampliada 83/83, 6.94s: porcentaje100% con nueve ensayos aún sin
  registrar (no NR), frecuencia reconciliada con segundos observados, intervalo
  observado después de terminar su ventana, duración y latencia conciliadas
  directamente con timestamps originales. No sustituye QA de PDF/CSV/dashboard.
- Regresión reloj: 5/5; colección Postman estática: 5/5. Total conjunto 83/83
  en 6.78s con API habilitada. Un primer comando utilizó una variable incorrecta
  y omitió los 73 casos: NO se cuenta; se repitió con el gate correcto.
- Lint focal y typecheck exit0. Catálogo conserva 99 migraciones; ninguna nueva
  migración/grant, reset, seed, limpieza o eliminación en este paquete.
- Build posterior a las correcciones exit0: Next16.3.4, 23 páginas estáticas,
  compiled11.4s/TypeScript13.1s; salida QA aislada en contenedor local, sin R6.
  Typecheck posterior también exit0. Huella318 archivos del gate R4:
  934d313621cc4d9760a31d755049be11d6f10739d4c0b228b426256cbf77ed54.
  La huella53d4... anterior es histórica, no este candidato actualizado.

## Defectos y repetición

1. Iniciar sesión produjo recibo confirmado, pero la vista falló después: su
   último tick podía preceder capturedAt/evento confirmado. SessionPage utiliza
   max(tick, capturedAt) antes del motor canónico, sin alterar eventos persistidos
   ni sustituir el motor. Regresión cubre started/paused/resumed/finished con
   reloj 300ms anterior; UI real ya no cae en app.error.
2. Programa aún no seleccionado aparecía sin título: el draft ahora lee la
   versión actual persistida. Las sesiones iniciadas conservan su snapshot.
3. Búsqueda y estado offline eran hermanos con la misma clave actor/clínica en
   MainLayout. Prefijos distintos conservan remount por alcance sin colisiones.
   Suite ahora detecta también Encountered two children with the same key;
   desktop y móvil repetidos pasan sin esa categoría ni hidratación/HTML inválido.
   No se afirma ausencia de toda advertencia de consola.

Fallas de localización de los radios de Mantine eran del test, no del producto:
se pulsan labels visibles asociados por for/id y se comprueba estado checked.
Confirmaciones de reconfiguración se aceptan sólo para el registro sintético.
No force clicks ni API en sustitución de Server Actions.

El watcher del volumen Windows conservaba la cabecera compilada antigua pese
al código nuevo visible en el contenedor. Se reinició sólo web; stack Supabase
y datos conservados. Repetición posterior elimina la colisión observada.

## Reproducción

```powershell
$env:ABA_QA_LOCAL_UI='1'
$env:ABA_QA_CAPTURE_UI='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test --config playwright.r5.config.ts --project desktop
$env:ABA_QA_LOCAL_READ='1'
$env:ABA_QA_LOCAL_CAPTURE_READ='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe node_modules/vitest/vitest.mjs run tests/local/api-read-contracts.test.mjs tests/local/session-display-clock.test.mjs tests/local/postman-collection.test.mjs
```

Precaución: el flujo UI de captura sirve para una sesión activa; una repetición
después del cierre puede crear otra sesión sintética. Para consultar el resultado
existente usar la suite API read-only, no repetir captura indiscriminadamente.
Ficha estable QA-R5-A-2155E99E tiene test_run_id=null; no elegible para cleanup
del lote. No datos clínicos reales. Screenshots privadas bajo .aba.local/qa,
ignoradas Git; la corrida móvil reemplazó las capturas desktop del output común.
Evidencia de la ejecución desktop y sus lecturas persiste en este registro.

## Continuación exacta

QA-006 aporta happy path de cinco dimensiones; sigue faltando cobertura de
ayudas/NR, borradores, corrección, pausas, conflictos y reintento/reconexión.
No cerrar QA-001–016 completos por 83 verificaciones. Continuar casos de sesión
y conciliación de resultados, después familia/documentos/agenda/notificaciones,
offline/revocación y restore aislado. ARCHIVOS-013 conserva gate de autorización
exacta previo a cualquier eliminación. Postman sigue preparado, no ejecutado.
