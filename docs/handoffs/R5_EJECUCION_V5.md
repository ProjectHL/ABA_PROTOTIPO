# R5 — ejecución del plan V5 (en curso)

Corte 2026-10-01 UTC / 2026-09-30 Santiago. Checkout exclusivo Desktop; main, HEAD `39071f8542968f334ab6732a9a4a222d4ad0a1a1`. Los 264 cambios iniciales se preservaron. Candidato con cambios locales: no versión final ni aceptación.

## Entorno comprobado

100 migraciones; última `20260928182438`. Docker local, Auth y web saludables; bindings loopback. Web existente en 3000 con webpack; Edge mediante serve-edge.ps1. QA producción en contenedor aislado `aba-local-qa-v5`, 3001, build previo `l_fto87qBN6hoVn0jFp7C`; tras la corrección de producto de este corte requiere nuevo build. Sin staging, reset ni restauración sobre stack activo. Credenciales del lote se mantienen únicamente en .aba.local ignorado.

## Resultados ejecutados

| Paquete | Resultado | Evidencia privada relativa a .aba.local/qa/playwright |
|---|---|---|
| QA-012 V1 móvil | 1/1; PDF A4 inspeccionado visualmente, separación V1/V2 | r5-v5-v1-mobile |
| QA-012 cinco dimensiones V2 | 2/2 escritorio/móvil; diez PDFs renderizados e inspeccionados | r5-v5-v2-regression |
| QA-011 persistencia ACK fallida | 2/2; servidor confirmó, IndexedDB falló, comando exacto se recuperó con mismo recibo y versión | r5-v5-ack-persistence |
| QA-011 captura offline | 10/10; cinco dimensiones × escritorio/móvil, borrador/envío/corrección, dependencia de nota, recarga y RPC | r5-v5-offline-final-{Frecuencia,Porcentaje,Intervalos,Duración,Latencia} |
| QA-010 horarios | 6/6; hora ambigua DST, fin inválido sin persistir y cruce de medianoche | r5-v5-calendar-time |
| QA-006/007 concurrencia de captura | 2/2; dos vistas, rechazo stale, conservación de borrador, respuesta perdida y replay exacto sin duplicar versión | r5-v5-capture-conflicts-repeat |

Se reutilizó el lote 2155e99e-bda4-4c68-95cf-b74cacd84ecd. Las mutaciones de identidades/recursos compartidos se ejecutaron en serie. Nuevos registros, citas e invitaciones son sintéticos y se conservan; la sesión offline no se finalizó ni canceló.

## Incidencias y correcciones

- Harness: apertura antes de terminar carga y comparación de capturedAt que cambia legítimamente en revisión; corregidos los selectores/expectativas, conservada igualdad exacta de observaciones y notas. Repetición offline 10/10 y concurrencia 2/2.
- Resultados: conteo fijo de seis incompatible con nuevos registros sintéticos válidos. La expectativa verifica mínimo original, cinco dimensiones y conciliación de todos los registros. Repetición tras nuevas capturas pendiente.
- Producto: cambio de nivel externo confirmado permitía que refreshIdentity disparara lectura de efecto concurrente con readLatest; la lectura sustituida provocaba falso Conflicto conocido y bloqueaba revocación. SharedAccessPage evita refresco de fondo durante operación/consulta explícita; conserva guardas de generación. Lint focal pasa; repetición funcional y build final pendientes.
- Recorrido externo incompleto: quedó una invitación propia accepted/clinical-edit. Se conserva y sólo se reanuda el grant sintético identificado por mensaje y actores exactos. No se alteran invitaciones ajenas.
- Postman Desktop: colección 2.1 importada realmente, 103 solicitudes, sin Push to Cloud. Runner Local observado. Importación de datos de iteración mostró paywall; no se compró ni activó trial. Ejecución real pendiente; no se introdujeron secretos en la colección importada.

## Pendientes y gates

QA-001–013 y QA-015 permanecen parciales; QA-014 conserva evidencia histórica de restore aislado, pero tipos/lint/build deben repetirse sobre candidato corregido. QA-016 pendiente. Falta gate transversal, instalación/apertura real PWA, participantes adicionales, colaboración/familia integral, persistencia tras reinicio y versión final.

ARCHIVOS-013 no aplicado: requiere aprobación específica del preview 796f24cb-235e-4dc8-a3d8-bb6370b0047e, hash e470ec1131caa97fd160dbe7bf2e75b1a161de8d1648e5a9aa10e070f46b130c, tras revalidar respaldo/referencias. QA-009 depende de ello. No se solicita aceptación mientras existan gates pendientes.

## Segundo corte ejecutado — 2026-10-01 01:06 UTC

- Postman Desktop 12.30.4, Runner Local, 103 solicitudes / 187 aserciones PASS, 0 failed/skipped/errors, una iteración, 6.477 s. Resumen visual privado .aba.local/qa/postman-r5-runtime-summary.jpg. Colección original 2.1 clonada sin modificar sus solicitudes; sólo se añadió bootstrap loopback de una entrega para pm.variables, cuyo alcance termina en el run. Sin Push to Cloud, secretos en JSON/YAML ni exportación de respuestas. La entrada premium de datasets no se usó. Listener cerrado; proyección temporal de credenciales eliminada; manifiesto original conservado. QA-001 parcial: colección sólo de lecturas/Auth, escrituras integrales pendientes.
- API real: 75 casos opt-in de ocho actores + cinco comprobaciones estáticas colección = 80/80. Unidad/harness existente: 75 passed, 75 skipped opt-in (no se presentan como probados).
- Acceso externo: 2/2 desde invitaciones nuevas en r5-v5-external-prod-complete. Aceptación, lectura sola, cambio a edición clínica, ausencia de membresía, equipo A/B denegado, revocación, ruta antigua denegada y rechazo de invitación independiente. Grant final no activo. Primeros intentos conservados: selectores antes de remount y dev sin actualización confiable del watcher; candidato producción comprueba el fix del efecto ligado al contexto.
- Build V5 producción con entorno enmascarado completo exit0, 23 páginas: VCbbCANvYUfu0La1l-gwx. Tipado/lint focal exit0. Primer build heredó NODE_ENV del contenedor dev y falló; no es candidato válido. Se retiraron únicamente includes temporales agregados por Next, preservando tsconfig previo.
- PWA: primer perfil nuevo reprodujo ausencia de controller tras login. sw.js y manifest eran redirigidos por sesión; effect inicial fallaba en login y no se repetía. Corrección exacta de matcher para sw.js/offline.html/manifest.webmanifest; preparación sólo después de usuario verificado online; rechaza cachear HTML redirigido. Assets no contienen datos clínicos; workspace/fichas conservan Auth. Build posterior o5OwpiATO7n-y49B6rYmB exit0; prueba Windows aún en repetición. Modificación de boundary obliga a regresiones relacionadas y permisos antes de aceptar candidato.
- ARCHIVOS-013 revalidación de sólo lectura en tests/local/attachment-cleanup-revalidate.mjs: 2026-10-01T01:01:59.665Z, mismo preview/hash, 2 PNG de68bytes,0referencias, autorización admin actual, dump/bytes/hash verificados, deleted=false. Aprobación específica solicitada; no inferida del plan.

Arranque QA reproducible: scripts/local/start-qa-candidate.ps1 -NextDist .aba.local/qa/next-build-v5-pwa -Apply. Sólo puerto loopback3001, contenedor etiquetado propio, anterior detenido/conservado y volúmenes intactos. No sustituye arranque operativo normal ni autoriza limpieza.

## Tercer corte — 2026-10-01, continuación local

- Se recuperó Docker Desktop cerrado con arranque normal oculto; volúmenes y contenedores conservados. Auth/web/Edge y candidato producción regresaron a HTTP200. Web mantiene `--webpack`. Hubo un fallo temporal del manifiesto mientras `npm ci` reinstalaba el volumen compartido; no persiste después de completar el arranque.
- QA-010 participantes: escritorio/móvil 2/2 en `r5-v5-calendar-participants-ready`; supervisor y técnico por IDs exactos, retiro de técnico y recarga, DTO versionado, rechazo de B y conservación de citas previas. Falta gate transversal.
- QA-006/007 ciclo online: escritorio 1/1 y móvil 1/1, `r5-v5-session-lifecycle-{desktop,mobile}`. Ficha dedicada `QA-R5-LIFECYCLE-V5` y programa propios creados por UI; sesión nueva por proyecto, pausa/recarga/reanudación, A con ayuda model y NR distinto de ausencia, borrador recuperado, envío, revisión con original preservado, finalización y ventanas activas conciliadas por RPC ordinario. La sesión offline original permanece activa.
- QA-011 PWA Windows: 1/1 en `r5-v5-pwa-standalone`. Chrome con perfil vacío único instaló mediante CDP y abrió la página hija del target exacto; dashboard, modo standalone, controller y scope/script verificados, PNG y recarga acreditados. El intento previo abría pestaña por preferencia predeterminada del instalador CDP; se seleccionó standalone exclusivamente en la app/perfil de prueba. No se modificó ni desinstaló una aplicación personal. Instalación Android/iOS no probada.
- Unidad existente: 75 passed / 75 skipped opt-in; tipos y lint fuente completos exit0, 0 errores/advertencias. Exclusión ESLint limitada a artefactos privados `.aba.local` y runtime descargado `.runtime.local`; retirado import no utilizado de workspace. Build funcional PWA sigue `o5OwpiATO7n-y49B6rYmB`; candidato final debe recompilarse tras retirar dicho import.
- Regresión V2 tras capturas detectó una expectativa histórica fija de un registro después de filtrar por profesional; ahora existen tres capturas legítimas. El harness se concilia contra actor/dimensión/fase/periodo reales, conservando comprobación exacta CSV y todas las observaciones. Repetición pendiente de resultado al emitir este corte.

ARCHIVOS-013 continúa sin aplicar y sin autorización recibida. QA-001–013/015 permanecen parciales hasta reconciliar definición completa; QA-014 mantiene su límite local/sintético y QA-016 sigue pendiente.
Regresión V2 final focal: 2/2 en r5-v5-v2-after-captures-repeat, cinco dimensiones y filtros conciliados con los registros actuales, CSV exacto y PDF con cada ID autorizado. Diez PDF/14 páginas inspeccionadas visualmente sin recortes, solapamientos ni glifos faltantes. Detalle cosmético conservado: continuaciones de registros en página2 sin encabezado repetido ni numeración, contenido íntegro; no se amplía producto por ello. PNG PWA standalone inspeccionado sin fallo visual bloqueante.

Regresión familiar en producción aún abierta: el harness tenía Invitar.first global y consultas aún ocupadas; intenta ahora consultar/esperar respuesta y seleccionar sólo el familiar exacto. Los intentos fallidos se conservan, incluidos vínculos sintéticos pendientes; no se presentan como aprobados ni se limpian automáticamente.

## Cuarto corte — punto de continuidad 2026-10-01

- Candidato producción actual: main, HEAD 39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales preservados; BUILD_ID Q91hAGwYDkaVv3jWSO_0h, dist .aba.local/qa/next-build-v5-team, loopback3001. Build webpack exit0, 23 páginas; tipado/lint focal del ajuste TeamPage exit0. Arranque start-qa-candidate.ps1 compatible con PowerShell5.1 tras leer etiquetas Docker mediante JSON.
- Defecto reproducible TeamPage: lectura de equipo disparada antes de identidad/clínica verificadas y para perfiles sin permiso administrativo, con error500. El efecto ahora espera identidad verificada, clínica y rol admin. Sin cambios de contratos ni migraciones.
- Matriz UI de rutas/perfiles: 17 casos pasaron juntos en r5-v5-route-profiles-current-context; el caso móvil supervisor A pasó al repetir con menú abierto en r5-v5-route-profiles-mobile-clinic. Son 18 combinaciones cubiertas por ejecución y repetición, no una batería única 18/18. La membresía vigente del supervisor en dos clínicas se preserva y la selección de clínica es explícita. Falta recorrido positivo de ficha propia B y conciliación exhaustiva de diálogos/acciones.
- Colaboración familiar documental: escritorio y móvil 1/1 cada uno en r5-v5-family-documents-{unblocked,mobile-unblocked}; aceptación, publicación, descarga autorizada y revocación con URL antigua403. El vínculo sintético pendiente creado por selector global en un intento fallido se canceló por UI con ID/versión exactos; sin borrar datos ni alterar vínculos ajenos.
- Postman complementario: primera ejecución real tuvo 58/59 aserciones aprobadas y cinco errores de script. El ciclo de agenda pasó; la selección de PNG exigía una etiqueta de lote nula en los objetos históricos y dejó variables de recurso sin resolver. Esos negativos no cuentan como aislamiento aprobado. Colección corregida para el PNG sintético exacto 17834b36-a2d1-4821-aa7e-51ef251fcb04, creador admin A, 68bytes y SHA256 comprobados, sin modificar metadatos históricos. Reimportada; repetición pendiente de resultado. La colección base conserva su resultado 103 solicitudes/187 aserciones PASS.
- Pendientes del gate: Postman complementario válido, entrega Realtime efectiva (el polling no basta), correo local, persistencia tras reinicio controlado, cobertura completa y regresiones relacionadas del candidato. ARCHIVOS-013 sigue sin aplicar: aprobación específica pendiente; QA-009 depende de limpieza y recuperación acreditadas. QA-016 no presentado como aceptado. QA-001–013/015 continúan parciales; QA-014 mantiene evidencia local/sintética y límites de restore documentados.

## Quinto corte vigente — 2026-10-04

[R5_CLI_GATE_V5.md](R5_CLI_GATE_V5.md) registra resultados reales por CLI y sustituye los pendientes resueltos: HTTP36/66; Realtime real1/1; ARCHIVOS-013 aprobado, aplicado y recuperado en destino aislado; reinicio/persistencia77proyecciones; defecto callback Auth y correo desktop1/1. R5 completo y aceptación siguen pendientes.

