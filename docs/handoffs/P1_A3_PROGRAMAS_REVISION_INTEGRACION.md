# P1 — revisión de integración de Programación (2026-09-19)

Revisión estática: 47/49 acciones técnicas conciliadas. No hay QA aprobado.

- La pestaña original de ficha monta StudentProgramsPanel y ProgramManagementV2 con lectura autorizada por actor, clínica y estudiante.
- Diseñadores de adquisición y conducta conservan formularios durante reintentos/conflictos, validan antes de retener, bloquean dobles envíos y protegen el cierre. Título, pasos ordenados con ID, conjuntos/ítems, ayudas, generalización, funciones múltiples, precursores, reemplazo, procedimiento, crisis y campos compatibles V2 se envían completos.
- Guardar borrador, publicar, pausar, reactivar, lograr y discontinuar usan comandos versionados, recibos correlacionados y relectura autorizada. No se crean snapshots cliente después del ACK.
- Publicar incluye expectedDraftRevision y la migración 20260919001112 la comprueba bajo lock antes de activar. Conflictos exigen lectura y aceptación explícita sin reenvío automático.
- El dashboard separa adquisición/conducta, filtra estados y conecta diseño, sesión, estado y gráfico. Cerrar confirmaciones no cambia el estado.
- Versiones históricas autorizadas se expanden en modo lectura. Los diseños V1 aparecen identificados y conservan su JSON original; no se convierten a V2 ni se habilita edición implícita.

Pendientes: PROGRAMAS-039 exportación PDF real y PROGRAMAS-041 gráfico real pertenecen a P3/A6. Typecheck exit0; sin recorridos funcionales ni visuales.
