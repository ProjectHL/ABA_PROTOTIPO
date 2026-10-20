# Tableros de programas — corrección móvil V22

Defecto reproducido y corregido: las tablas de Programación expandían el viewport móvil390→398px y el selector recortaba Borradores/Todos. ProgramsDashboard añade ScrollArea al selector y Table.ScrollContainer(minWidth700) a ambas tablas. V22 verifica seis filtros por viewport, filas/títulos exactos contra RPC, acceso horizontal a acciones, abrir/cerrar ambos diseñadores, cero comandos y snapshots completos intactos. Doce comprobaciones de ancho PASS:1440 escritorio y390 móvil. Ocho capturas actuales; inspección focal de tabla y acciones completada, sin atribuir cierre visual global.

Build: FgNwRAIHnpp1xvN3xuuEX. Tipado, lint focal y build webpack PASS.

- V22 es candidato focal nuevo, no entrega final aceptada. QA003/004/014/015/016 abiertos; QA11/16.
- V21 detenido y preservado; build fallido inicial y pruebas con selector incorrecto retenidos. El error JSX detectado por lint fue corregido antes del build exitoso.
- Evidencia anterior V21 mantiene su alcance histórico; no se declara repetida toda la batería en V22.
- Pendientes: revisión visual restante, diseñoV1 específico, aceptación inicial/cambio de clínica/alta y callback, renovación103 y recorridos humanos finales.
