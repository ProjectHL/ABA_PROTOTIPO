# Captura visual pendiente V21 — preparada, no ejecutada

Propietario: visual_finish. Root ejecuta en serie después de cualquier prueba con Auth/escrituras.

Script: `scripts/local/capture-remaining-ux-v21.mjs`. Opt-in `ABA_QA_REMAINING_UX_V21=1`; Node local del proyecto, TEMP/TMP bajo `.aba.local/qa/runtime-tmp`. Salida exclusiva `.aba.local/qa/ux-current-v21-remaining`; rechaza reutilización. Sin ejecución ni login por este agente. `node --check` pasó.

Guardas: checkout Desktop exacto, build V21 en contenedor; Supabase loopback; alumno original sesión97a con eventos exactamente [started]. Lee snapshots completos RPC de programas/sesiones y ficha clínica para original b347 y propio94, compara después de cada viewport y final. Bloquea comandos Next POST con operationId/idempotencyKey y submit fuera de login. No guarda programas/capturas, ni transiciona sesión. Descarta únicamente borradores locales v0 nuevos. Bloquea HTTP externo. Fallos conservan journal y revalidan snapshots cuando posible.

Capturas desktop1440×900 y móvil390×844: tableros adquisición/conducta; diseñadores nuevos top/footer; sesión original activa; cinco dimensiones top/footer; gráfico, ampliación y registros. Ayudas estímulo porcentaje: abrir opciones y cerrar Escape sin elegir; compara todos los valores/checked de inputs. Es evidencia DOM exacta, no afirma inspección del payload React oculto ni cubre ayuda de respuesta condicionada a A.

## Pares originales dc1b0c4

Cada nombre se refiere a `.aba.local/qa/ux-baseline-render/{desktop,mobile}/`.

| Captura actual | Original | Interpretación pendiente |
|---|---|---|
| board-skill / board-behavior | student-tab-4.png | Comprobar manifest: tabs originales mock; contenido V2 distinto. No afirmar igualdad de datos. |
| designer-skill-top/footer | program-design-modal.png | Misma familia de diseño; footer actual añade persistencia/publicación/exportación real. |
| designer-behavior-top/footer | Sin par específico existente | Requiere captura baseline de diseñador conducta o evaluación explícita de adaptación; no cerrar por par de skill. |
| session | session.png | Encabezado/tarjetas original vs estado y recibos reales. |
| capture-percentage | capture-percentage.png | V2 I/A/E/NR y ayudas frente a mock; revisar composición/visibilidad. |
| capture-frecuencia/intervalos/duración/latencia | mismo nombre .png | Revisar área útil, controles y scrolling; semántica V2 explícita. |
| capture-*-footer | Sin pares footer dedicados | Evaluar acceso a controles y no atribuir igualdad visual completa. |
| chart | chart.png | Datos sintéticos diferentes, verificar distribución y controles. |
| chart-expanded / chart-records | Sin par dedicado | Extensiones reales; evaluación explícita. |
| percentage-help-open | Sin par dedicado | Control local de ayuda; no cambio de selección. |

## Reutilización condicionada

No volver a capturar sin cambio relevante: header V19 (`R5_CLINICAL_HEADER_V19_20261011`), toolbar equipo V20 (`R5_TEAM_TOOLBAR_V20_20261011`), familia/documentos poblados V21 (`R5_POPULATED_FAMILY_DOCUMENTS_V21_20261011`), perfiles 16 pares (`proposals/profile-paired-v21`). Root debe verificar hashes fuente y alcance antes de incorporarlos al cierre QA004. No se afirma que todo el QA004 esté cubierto: colaboración/sidebar/soporte/upgrade/agenda/notificaciones/offline siguen su conciliación propia.

## Después de ejecutar

Inspeccionar imágenes originales/actuales, registrar diferencias justificadas frente a defectos reproducibles, repetir sólo captura afectada cuando proceda. No actualizar matriz como VALIDADO por mero éxito técnico. Captura no sustituye regresión funcional ni los tres recorridos humanos.

## Revisión de preparación — 2026-10-18

`withDialog(action)` registra un único handler con `page.on`, espera la acción y su aceptación, exige un solo diálogo `confirm` y retira el handler en `finally` con `page.off`. Reemplaza ambos `page.once` (cambio de dimensión y descarte local) para evitar handlers residuales. Total obligatorio: 42 imágenes (21 por viewport).

Selectores cotejados con fuente y prueba existente: footer de ambos diseñadores `Guardar Programa`/`Cancelar`; capturador `Cerrar` y acción local `Descartar registro local sin guardar`; ampliación de resultados `Ampliar`, dialog cuyo nombre contiene `gráfico ampliado`, cierre `.mantine-Modal-close`. Coinciden con `r5.results-controls-v21r4.spec.mjs` previamente ejecutado. La revisión es estática: este agente no ejecutó capturas, Auth ni pruebas funcionales. `node --check` pasó el 2026-10-18. La salida exclusiva aún no existía al revisar; root debe comprobarlo otra vez antes de ejecutar.
