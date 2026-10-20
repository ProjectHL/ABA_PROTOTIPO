# R5-SUPPORT-MOBILE-MENU-001

Estado: CERRADO FOCAL V11, 2026-10-09.

En viewport390x844 abrir navegación móvil, abrir Soporte, cerrar con Escape y reabrir; intentar pulsar Ayuda. Esperado: menú visible estable, navegación /help. Obtenido: Ayuda oscila horizontalmente fuera del viewport y el clic natural falla por inestabilidad. Ocho muestras alternan x=-171 y x=370, ancho190, y742.3125. Reproducción repetida sin force ni dispatch programático.

Evidencia: .aba.local/qa/support-mobile-v10-bounds-repro.json y captura móvil del menú. No se enviaron tickets ni comandos clínicos. El intento escritorio completo pasó sobre V10; móviles fallidos no se presentan como aprobados.

Corrección: IdentityShell usa top-start cuando el viewport corresponde al navbar móvil; escritorio conserva right-end. No nuevos contratos, permisos, dependencias de producto ni migraciones. Tipado/lint focal PASS; build y repetición V11 en curso. Repetir abrir/cerrar/navegar Ayuda/Contacto y cancelar ticket con confirmación nativa, snapshot soporte idéntico.


## 2026-10-09 — identidad pública/landing/soporte V11

Paquete completo escritorio+móvil2/2PASS19,3s. Login marca→landing, proveedores OAuth deshabilitados y simulación retirada; términos/privacidad abren/cierran; recuperación→volver acceso. Landing Conocer más y CTA login/contacto comercial/soporte; escritorio anchorscaracterísticas/entorno/documentación/brand. Gate anónimo de ayuda/soporte redirige login con redirectTo preservado. Formulario comercial vacío rechaza nativamente sin enviar; no nueva solicitud comercial acreditada aquí.404autenticado real/volverhistory. Shell Soporte abrir/cerrarEscape/Ayuda→guía→ticket/Contacto→support; formulario nuevo se cancela con confirmación sin envío, snapshots autorizados soporte iguales y cero comandos. Capturas de rutas públicas sirven como evidencia actual, aún no comparaciónUXglobal.

DefectoR5-SUPPORT-MOBILE-MENU-001 cerrado focal: right-end oscilaba x-171↔370 (ancho190) en390x844 y clic Ayuda fallaba. top-start sólo móvil conserva right-end escritorio; ocho muestrasV11idénticasx37/ancho190 y clics naturalesAyuda/ContactoPASS, sin force. Tipado/lint/buildwebpackPASS, V11 mZeZnMMBZ4vYp1uE31Kon loopback3001, V10detenido/preservado. Harness ajustó queryredirect legítima, espera DOMúnico y confirmaciónnativa; no cambios de autorización. Backend/contratos/migraciones sin cambio.

QA12/16 sin cierre automático003/004/015. Referencia dc1b0c4 extraída71blobsSHA, dependencias lockhistórico en volumen Docker exclusivo ignore-scripts; renderloopback3002 separadoSupabase, originalsourcesRO. QA004 comparación visual dashboard detecta distribución5/7→KPIarriba+6/6, pendiente corregir/verificar; baseline mocks sólo referencia, nunca aprobación del producto.
