# Captura y descarte offline — escritorio V21

Prueba de recuperación ejecutada: 1/1 PASS, 15,0 s. BUILD_ID 7AtdY0nw3olpUC5PDvk7o.

La primera ejecución verificó cierre y reapertura del borrador local, cancelación/confirmación de descarte, borrador Frecuencia con ventana abierta y recarga sin finalizarla, y archivo del borrador persistido conservando su payload. Se detuvo por una expectativa incorrecta del texto UI, después de tres recibos confirmados.

La recuperación reutilizó la misma sesión y registro. Restauró offline la identidad y payload exactos del pendiente retenido; verificó bloqueo de quitar descarga, cancelación y confirmación del descarte desde el control real del layout. Sólo reconectó con cola vacía: cero escrituras offline y snapshot servidor idéntico. Quitar descarga se probó con cancelar y confirmar. Cancelación y archivo de la sesión aportaron dos recibos nuevos: cinco únicos en total, registros originales preservados.

Límite: faltaba snapshot clínico completo previo al inicio original; la recuperación conserva el snapshot clínico actual salvo hasActiveSession true→false, versión33. No acreditar una comparación clínica inicial más fuerte. No prueba V1, documentos ni preservación de otras filas de cola. Móvil sigue separado. QA003 continúa abierto.
