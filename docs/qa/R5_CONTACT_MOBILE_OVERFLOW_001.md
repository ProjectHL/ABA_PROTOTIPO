# R5-CONTACT-MOBILE-OVERFLOW-001

Estado: CERRADO FOCAL V8, 2026-10-09.

2026-10-09. Candidato de reproducción: V7, BUILD_ID FCT6l_uO6YDGRmI3UZFs2. Viewport móvil 390×844. Ficha sintética exclusiva QA-R5-LIFECYCLE-V5; contacto creado por el recorrido QA.

Reproducción: abrir Familia y Contacto, guardar un familiar con rol Contacto y principal, recargar, intentar pulsar Editar en su fila. La tabla de seis columnas desborda su Paper. Playwright resuelve un botón visible/habilitado/estable pero el Paper, celdas y header interceptan el puntero al desplazarlo. Dos intentos con el mismo contacto conservaron un único recibo de creación. No se forzó click ni se duplicó el contacto.

Esperado: acceder a las acciones de la fila en móvil mediante desplazamiento horizontal dentro del panel. Obtenido: el botón no recibe el puntero.

Corrección: envolver exclusivamente la tabla de contactos en Table.ScrollContainer minWidth=700. No cambia DTO, permisos, persistencia, comandos ni migraciones. Tipado pasa. Build/lint y repetición móvil/escritorio se registrarán al finalizar.

Pruebas: tests/e2e/r5.contact-controls-v7.spec.mjs, playwright.contact-controls-v7.config.ts. Evidencia de reproducción privada: .aba.local/qa/contact-controls-v7-mobile-before-primary-resume-20261009.json y journal móvil. El intento de escritorio V7 sí pasó con cinco recibos. El primer lector del arnés asumió incorrectamente 42501; se corrigió a la consulta REST autorizada y acotada de metadatos. Ese ajuste no fue un cambio de permisos del producto.

Validación: recorrido móvil pendiente retomado con el mismo contacto pasó12,1s. Recorridos completos nuevos escritorio/móvil2/2PASS30,0s. Regresión diseñador2/2PASS22,2s. Tipado/lint/buildwebpackPASS. BUILD_ID hBWDTZf8SyHXQcLh_yocw. Evidencias V8 fechadas en .aba.local/qa/contact-controls-v7-{desktop,mobile}-v8-safe-20261009.json. Comparación UX integral sigue pendiente.
