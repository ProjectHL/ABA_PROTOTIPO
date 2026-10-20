# Propuesta QA-003 perfil/avatar V21 — preparada, NO ejecutada

Archivos exclusivos: `tests/e2e/r5.profile-persistence-v21.spec.mjs` y `playwright.profile-persistence-v21.config.ts`.

Cubre SHELL-008/010/011/015 focalmente: cinco campos profesionales con valores distintos, selección Canvas Personas, reemplazo Formas, retiro de fotografía, restauración exacta de campos/preset. Cada uno de cuatro guardados requiere comando UI real, versión recién consultada, payload exacto, ACK correlacionado, consulta persistida, recarga y formulario reabierto. Dos archivos PNG sintéticos quedan retenidos; ambos hashes se comprueban tras retiro/restauración. Resto del equipo debe conservar snapshot exacto. Perfil propio sólo cambia version/updatedAt tras restauración.

Guarda previa: lote sintético ready, admin-b y contexto clínica B, BUILD_ID Docker/host V21 exacto, nombre/profesión originales válidos, avatarObjectPath original NULL. Si tiene avatar histórico, se detiene ANTES de mutar: la UI no permite reponer la misma ruta original después de un reemplazo (subir bytes produce otra ruta). No asumir restauración de avatar histórico.

Serializar desktop primero y mobile después; mobile exige safe desktop terminal con valores restaurados. Opt-in ABA_QA_PROFILE_PERSISTENCE_V21=1. TEMP/TMP exclusivamente `.aba.local/qa/runtime-tmp`. No ejecutar ambos junto a otras pruebas con admin-b. Journal por proyecto es de uso único; si existe no reejecutar ni borrar. Ante resultado desconocido conserva comando/identidad/payload y estado actual, sin replay automático ni compensación con nueva identidad. Root revisa journal antes de recuperar.

Preparación 2026-10-13: node --check y ESLint de los dos archivos PASS. No Auth, navegador ni escritura DB ejecutados por este agente. Sin edición de producto/canonical.

Comparación previa: V5 sólo modificó descripción y subida PNG condicional; no demostraba cambios diferentes en los otros cuatro campos ni selección Canvas/reemplazo/retirada con cuatro ACK completos. Esta prueba agrega esos pendientes; no repite membresías/invitaciones ni declara todo QA-003 aprobado.
