# Captura métricas V19 — preparación

Suite opt-in readonly; no Auth, navegador ni pruebas funcionales ejecutados. Sintaxis Node y lint focal PASS; tipado global Docker PASS (tsc --noEmit --incremental false).

Reutiliza20registros finales de journalsV9/V10 con SHA exacto, comprueba currentDTO completo y calcula expectativas por observaciones/timestamps sin importar motor producción. Compara CSV de resultados (métricas, payload, revisiones, fase,actor,versión) y filas UI con unidades y localees-CL máximo2decimales. Comprobación activaDocker+BUILD_IDhostycontenedor.

Root ejecuta escritorio y luego móvil, con Auth exclusivo y ABA_QA_CAPTURE_METRICS_V19=1. Config playwright.capture-metrics-v19.config.ts. Preparar TEMP/TMP dentro de ABA según arnés existente.

No cubre drafts históricos abiertos,pending/null live,V1,discard/offline,otrosroles,PDF ni QA completo. ArchivoJSON contiene comandos, límites y hashes de fuentes.
