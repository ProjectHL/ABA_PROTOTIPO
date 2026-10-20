# Handoff R0 — shell, lista y ficha

Estado: REVISADO INVENTARIO; NO INTEGRADO. Inspección de solo lectura del agente, incorporada por el orquestador el 2026-09-12. Baseline dc1b0c4 frente al worktree sobre HEAD39071f8; los cambios existentes permanecen preservados.

Se vincularon 154 anclas léxicas originales/actuales de MainLayout, StudentsList y StudentDetail a acciones semánticas. Las etiquetas indican correspondencia, no persistencia ni aprobación. Las 64 anclas de programas vinculadas previamente siguen separadas. No se considera cerrado el inventario completo.

## Omisiones incorporadas

SHELL-013 registra el retiro de simulación de roles del shell: su sustitución es una utilidad exclusivamente local, no autorización arbitraria de producción. FICHA-025/026 cubren menú de tarjeta y cancelación de alta; 027 fecha de nacimiento; 028 Otro diagnóstico con texto libre/autocompletado; 029 búsqueda por diagnóstico; 030 contenido de tarjetas (sesión, acceso familiar, diagnóstico y profesional). HISTORIAL-018/019 cubren nombre de medicamento y cancelación sin persistir. CHAT-012 recupera navegación desde sidebar. COMERCIAL-013 cancela upgrade. SOPORTE-013/014 cubren menú y adaptación del chat de soporte a tickets locales sin promesas instantáneas.

Los componentes dinámicos no detectados léxicamente siguen siendo obligaciones: target del menú profesional (baseline MainLayout alrededor de274/current258), navItems chat original alrededor de126, Autocomplete de Otro diagnóstico original StudentsList277–282 y dropzone actual StudentDetail559–575. Las referencias son posiciones de la inspección, no IDs de controles generados. Deben conciliarse al implementar; no inventar anclas léxicas.

## Brechas funcionales verificadas

- Lista: alta deshabilitada; modal original y compartir retirados; búsqueda perdió diagnóstico; tarjetas perdieron información original. El filtro ficticio de tres estudiantes para terapeuta fue retirado correctamente y no debe restaurarse.
- Ficha: sesión/compartir/identificación/familia/medicación están deshabilitados o desconectados. Ver documento carece de handler y dropzone es decorativa. Programas arrancan vacíos y acciones muestran alerts en lugar de persistir.
- Medicación conserva cambios de estado y borrado solo en memoria que aparentan éxito; no equivalen a retirar/finalizar/reactivar persistido. Deben sustituirse con comandos trazables, no eliminarse del inventario.
- Shell: perfil fijo, polling parcial, búsqueda decorativa; logout no contempla error ni capturas offline pendientes. Ayuda/contacto no conectados. Chat de soporte retirado no es chat clínico.
- Cerrar diseñadores/captura/medicación es cancelación, nunca completar un programa o tratamiento. Los formularios preventDefault son anclas auxiliares, no nuevos comandos de persistencia.

Propiedad: A1 shell/identidad, A2 lista/ficha/historial/archivos, A3 programas/sesión, A4 compartir/chat/notificaciones, A5 soporte/comercial, A6 búsqueda, A7 pendientes offline. MainLayout es integración exclusiva del orquestador según propiedad compartida acordada.

No se ejecutaron suites, servicios, migraciones ni QA. El agente concluyó el diagnóstico; esta aceptación no constituye entrega de módulos funcionales.
