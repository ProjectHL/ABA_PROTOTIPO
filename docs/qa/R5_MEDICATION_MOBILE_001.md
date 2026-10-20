# R5-MEDICATION-MOBILE-001

Estado: CERRADO FOCAL V16.


## 2026-10-10 — medicación V16, prueba y UX focal terminadas

Escritorio1/1PASS12,5s y móvil1/1PASS11,7s sobre V16 SqXFb86Tn89rgGpuEGkKu / catálogo103; tipado, lintfocal y buildwebpackPASS. Se reutilizaron las cinco versiones históricas de cada medicamento sintético B y se conciliaron nombre/dosis/frecuencia/prescriptor/fechas/notas/predecessor. Desplegar/cerrar versiones, cancelar cambios, reabrir limpio, Escape y rechazar Finalizar preservaron DTO clínico/programas exactos: cero intentos de escritura. No se recreó el ciclo farmacológico ni se inventó nueva persistencia positiva.

R5-MEDICATION-MOBILE-001: a390px los nombres largos desbordaban la tarjeta y ampliaban la página a469px. Corregido únicamente StudentMedicationPanel: ajuste flexible y texto con salto; acciones debajo en móvil. V15 eliminó desborde pero revisión visual detectó columna estrecha; V16 probado y revisado conserva390px, nombre242px y acciones debajo. Capturas finales de panel, versiones, agregar y editar contrastadas contra baseline dc1b0c4 en escritorio/móvil. Modales capturados con opacity1 y viewport; transparencias de capturas anteriores eran animación, no defecto de producto. Adaptaciones por fechasISO/nullable/endDate/historia inmutable registradas en docs/qa/R5_MEDICATION_CONTROLS_V16_20261010.json. Evidencia funcional/visual focal completa; QA003/004/015 globales abiertos.

Candidato actual aba-local-qa-v16, BUILD_ID SqXFb86Tn89rgGpuEGkKu. V14/V15 preservados detenidos; Supabase y volúmenes sin cambio. QA11/16; restore103 y otros controles pendientes.
