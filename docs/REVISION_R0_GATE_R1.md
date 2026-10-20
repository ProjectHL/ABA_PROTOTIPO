# Revisión del orquestador — gate de base local

Fecha: 2026-09-13. Base inspeccionada: HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 con cambios existentes preservados. Esta revisión autoriza trabajo de R1; no declara producto integrado ni QA aprobado.

## Evidencia revisada

Spec maestra reproduce decisiones confirmadas. Baseline dc1b0c4 y sustitución de rutas afd30fb están documentados. Matriz vigente:434 acciones; índice:822 anclas originales/actuales, todas con referencias de matriz válidas y sin duplicados de IDs. Los tres handoffs de diagnóstico están aceptados como evidencia estática. Las32 propuestas restantes se incorporaron explícitamente; los controles dinámicos/auxiliares descritos en el handoff no se eliminan por no generar ancla léxica.

Contratos comunes presentes: ficha/personas, diseño V2, MeasurementV2 de cinco dimensiones, sesión/timeline, adjuntos, compartir/publicación familiar/chat, agenda, comercial, soporte, recibos y cola offline. Tipado del proyecto completo correcto en las últimas revisiones. Ningún contrato acredita persistencia efectiva: V1 histórico se conserva sin inventar detalles. Las brechas B01–B11 tienen propietario y dependencia explícitos.

## Resoluciones contractuales de las omisiones

Título de programa pertenece al comando de borrador, no al payload de medición. Iniciales/idioma/convivencia son campos propios de ficha. Retirar contacto no elimina identidad histórica. Archivo de sesión es distinto de cierre/cancelación. Captura agregada provisional sigue V1; no es capturador V2 ni conversión false→E/A/NR. Solicitud de autorización del propietario (aprobar/denegar) es distinta de aceptación/rechazo de invitación externa; A4 debe reutilizar ambas operaciones del motor vigente según actor y recurso. Reinicios/cancelaciones no completan recursos ni notifican guardado servidor. Iconos informativos no justifican comandos ficticios.

Los campos de gráficos, menús, filtros, cancelaciones y enlaces auxiliares permanecen obligaciones de sus paquetes aunque no requieran escritura. La comparación visual interactiva integral y persistencia tras reinicio son gates R5, no afirmaciones probadas por este inventario estático. R0 puede recibir correcciones de inventario durante implementación; no se asegura exhaustividad de un extractor léxico.

## Orden DB revisado para propuestas

Antes de comandos V2: extender identidad/contexto y crear ledger común de operaciones/recibos con alcance usuario/clínica/recurso y huella de payload; idempotencia no sustituye permiso vigente. Ficha/personas precede asociaciones de colaboración/agenda. La relación fotografía→adjunto se añade nullable en dos pasos si forma ciclo: nunca FK anticipada a tabla inexistente ni nombre inventado. Adjuntos preceden consentimiento/chat/publicación. Programas V2 preceden sesiones/captura/revisiones; agenda y gestión preceden sus proyecciones. Capacidades por ficha se amplían en el motor existente, no como evaluador paralelo. Reporting y sincronización consumen esos contratos, no alteran unidades ni autoridad.

Solo el orquestador crea/ordena/aplica migraciones con CLI versionado y ayuda consultada, sobre destino local validado. Agentes entregan SQL propuesto, grants/RLS/índices y estrategia forward-fix/rollback sin inventar historial aplicado. Tipos DB se regeneran del esquema efectivo. No reset en start/stop/finally; el runner histórico ya se corrigió preventivamente. QA integral y advisors de aceptación quedan trazados aR5 según alcance autorizado, sin suites intermedias.

## Inicio de R1 y propiedad

A1 inicia plataforma/identidad local. No arranca R2 antes de su handoff revisado. A4/A6/A7 no comienzan integración dependiente antes de R2. A8 permanece inactivo hasta producto integrado; A9 hasta aceptación local. R1 debe resolver Node22 y motor Docker operativos, instalación reproducible con lock existente, Compose dev/URLs separadas, credenciales locales ignoradas, fixtures por lote y todos los perfiles, Mailpit/Auth/callbacks, shell original/contexto/perfil/equipo sin mocks.

MainLayout se entrega como propuesta aislada para integración exclusiva del orquestador. app, src/domain, tipos DB, package/lock y migraciones son propiedad del orquestador. A1 puede proponer cambios fuera de propiedad en handoff, no editarlos simultáneamente. No se borran servicios provisionales hasta extraer su funcionalidad persistente y conectar rutas originales.

Estado: REVISADO PARA INICIAR R1. Matriz de implementación sigue PENDIENTE; no hay módulos funcionales entregados ni cierre local. Los registros anteriores que señalan R0 abierto documentan puntos de control históricos; esta revisión habilita base local sin convertir revisión documental en integración o QA.
