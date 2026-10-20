# Cabecera y compartir desde tarjeta — V19, 2026-10-11

PASS focal: escritorio 1/1 (16,1s), móvil 1/1 (15,5s). Tres perfiles sintéticos por tamaño; cero comandos, proyecciones clínicas/programas/invitaciones y originales idénticos. Candidato `aba-local-qa-v19`, BUILD_ID `A7t-LPX5vzBg-DMDbF8_z`, catálogo103. Tipado, lint focal y build webpack PASS.

Se recuperó el acceso original Compartir en la cabecera según capacidad por recurso, usando el mismo modal y contrato. Los indicadores de sesión/familia dependen del DTO. Todos los flags encontrados eran false: se prueba ausencia correcta, sin afirmar render true.

V17 detectó navegación de la tarjeta al abrir el menú Compartir. V18 bloqueó la navegación, pero cerrar el dropdown desmontaba el componente y el modal. V19 detiene propagación del árbol interactivo y mantiene montado el menú. Regresión: abrir desde cabecera/lista, escribir correo, cancelar, Escape, X, reabrir limpio, recargar; la lista conserva URL y tarjeta. Supervisor/técnico B sin authorization.decide no ven el botón. Sin enviar invitaciones. Fallos V17/V18 y candidatos previos preservados.

Inspección visual desktop/móvil contra la cabecera dc1b0c4: acceso recuperado, header y modal legibles; actual móvil390px sin desborde. Foto/archivar/iniciar son controles reales añadidos. No existe par original del modal en este paquete; no equivale a QA004 completo. Evidencia con SHA en el JSON.

QA global11/16:003,004,014,015,016 abiertos. Restan captura/offline/V1/métricas, pares UX restantes, conciliación404, restore103 y gate final. Recorridos humanos al final.
