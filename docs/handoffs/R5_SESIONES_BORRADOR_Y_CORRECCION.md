# R5 — pausa, borrador, ayudas/NR y revisión real

2026-09-27. Progreso parcial, no cierre integral. Checkout Desktop autorizado;
HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios existentes conservados.
Chat/R6 siguen excluidos. Sin nuevos grants/migraciones, reset o limpieza.

## Defecto funcional corregido

Editar notas de sesión antes del inicio hacía caer la página en app.error:
onChange leía event.currentTarget dentro del updater de estado diferido. Se
captura el string sincrónicamente antes de setSession; sin inventar recibos,
modificar contratos o suavizar validación. El primer caso cayó antes de iniciar
otra sesión. Tras la corrección se inició y persistió la sesión sintética.

Las esperas posteriores eran del test: el hover sobre el aviso top-right pausa
su cierre y puede cubrir Pausar. No force click ni ocultamiento de CSS. El caso
mueve el puntero fuera y espera el auto-close real. Una primera interacción con
el botón cerrar coincidió con su desmontaje; se sustituyó por espera acotada.
Health tras reinicio web también tiene espera acotada, sin reiniciar por timeout.
Reinicio únicamente de web para cargar cambios en volumen Windows; Supabase y
sus datos conservados.

## Evidencia ejecutada

- tests/e2e/r5.sessions.spec.mjs: desktop1/1 pasa, 23.0s. Interfaz original y
  Server Actions reales, no llamadas API sustitutas.
- Una sesión adicional en la ficha sintética existente, notas exactas
  QA UI TRANSICIONES. Intentos parciales reutilizaron esta sesión; no se borró
  historial. Pausa/recarga mantiene estado y bloquea Nuevo registro; reanudar
  habilita captura. Pares adicionales de pausa/reanudación son historia legítima.
- Captura porcentaje: ensayo A con ayuda model, segundo NR, ocho sin observar;
  guardar borrador, cerrar, recargar y reabrir mantiene valores exactos. Envío
  confirmado; revisión bloqueada sin motivo, luego motivo y nota explícitos,
  confirmación/recarga conserva corrección. Finalización confirmada.
- API real74/74 más regresiones10/10: total84/84, 6.66s. Una sesión con marcador,
  timeline terminado válido, started/finished y pausas/reanudaciones equilibradas.
  Un registro enviado v3 (borrador→envío→revisión), una revisión con motivo y nota
  previos. Los diez ensayos anteriores permanecen idénticos; A/model y NR distintos
  de ocho no registrados, métrica0% I. Repetidas las lecturas de aislamiento y
  cinco dimensiones de la sesión anterior, sin escrituras clínicas API.
- Lint focal y tipos exit0. Build actualizado exit0, Next16.3.4, compiled8.0s,
  TypeScript4.8s, 23 páginas estáticas; salida QA aislada en contenedor local,
  sin iniciar R6. Typecheck posterior exit0.
- Huella318 archivos del gate R4:
  2031eafc23964252767c0e43d9ae08390408702d59951ab164dabba130bcaad0.
  La huella934d... del corte anterior es histórica. Catálogo99 conservado.
- Captura sesion-transiciones.png revisada: finished, notas persistidas, programa
  y registro enviado; screenshot sintética ignorada Git. Aviso aún visible no
  equivale a confirmación ficticia; API confirmó el estado terminado.

## Reproducción y precaución

```powershell
$env:ABA_QA_LOCAL_UI='1'
$env:ABA_QA_SESSION_UI='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test --config playwright.r5.config.ts --project desktop --grep 'QA-006/007'
$env:ABA_QA_LOCAL_READ='1'
$env:ABA_QA_LOCAL_CAPTURE_READ='1'
$env:ABA_QA_LOCAL_SESSION_READ='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe node_modules/vitest/vitest.mjs run tests/local/api-read-contracts.test.mjs tests/local/session-display-clock.test.mjs tests/local/postman-collection.test.mjs
```

No repetir UI indiscriminadamente tras terminar: SessionPage propone otra sesión
cuando no hay ninguna activa. La suite API read-only valida las dos sesiones ya
finalizadas sin duplicarlas. Nuevos outputs separados sessions/capture/baseline
evitan que una corrida de ficha reemplace las capturas de sesión. Ficha sintética
QA-R5-A-2155E99E tiene test_run_id=null, no elegible para cleanup del lote.
No se imprime manifiesto privado, contraseñas ni tokens. No autorización de borrado.

## Pendientes exactos

QA-006/007 siguen parciales: conflictos simultáneos, reintento de resultado
incierto, correcciones concurrentes y V1 requieren evidencia. Próximo bloque:
conflicto por dos vistas reales y conciliación de resultados/exportaciones;
después familia/documentos/agenda/notificaciones/offline/revocación, operación
y restore aislado. ARCHIVOS-013 requiere validación y autorización exacta del
preview antes de cualquier eliminación. Postman parcial preparado no ejecutado.
No se marcan QA-001–016 ni 404 integradas como aceptadas por estos resultados.
