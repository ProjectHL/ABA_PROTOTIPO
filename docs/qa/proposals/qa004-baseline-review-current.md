# QA-004 — revisión frontend base y preparación visual

Fecha: 2026-10-09T16:08:02.589Z. Baseline dc1b0c4 (dc1b0c43080408feaed574b30cf64be4b3514dfb); candidato aba-local-qa-v10, build oOsSbvhBdtZSHeN1230vG. **QA-004 NO validado:** código revisado, render baseline y comparación pareada pendientes. No se ejecutaron Auth, navegador, escrituras clínicas, instalación ni servicios.

## Hallazgo que impide aprobar por código

El dashboard original usa distribución lg5/7 con bienvenida y sesiones a la izquierda, KPI y gráficas a la derecha. El actual coloca KPI arriba, sesiones lg6/6 y gráficas lg6/6 abajo. La spec exige conservar distribución. Root debe comparar render y restaurar la composición o respaldar una adaptación autorizada; no clasificar automáticamente como cosmético. Fuentes: src/pages/DashboardPage.tsx@dc1b0c4 y src/views/DashboardPage.tsx:54–58.

## Adaptaciones y límites

- role-simulation: Selector Cambiar Vista cambia role cliente → Clínica activa y rol de membresía autorizado. adaptation documented.
- chat-deferred: Chat sidebar y chat desde ficha → No navegación activa. explicitly deferred by user.
- support-ticket: Chat de soporte/promesa instantánea → Ayuda/contacto y tickets locales. adaptation documented.
- avatar-local: URLs remotas Dicebear → LocalAvatarSelector genera PNG local. privacy adaptation; visual parity pending.
- clinical-identity: Datos mock y RUT como identificación → ID clínico/iniciales; RUT opcional, contexto e historial trazable. domain extension required by spec; placement pending.
- capture-durable: handleSave simulado localStorage + toast; duración/latencia placeholder → Recibos reales, draft/submit separados; cinco dimensiones operativas. required functional extension; original control roles must remain.

Shell conserva header70, sidebar280 y breakpoint sm; ficha mantiene cinco pestañas originales y agrega historial; compartir mantiene share/sent/active y agrega requests/received. Captura conserva fullscreen y las dimensiones; duración/latencia ya operativas. Estas observaciones son fuente, no aprobación visual. En captura revisar SegmentedControl, prompts, inglés de fase, botones al final y scroll. Avatar Escape anidado requiere revisar contra base. Contactos y tablas de acceso deben tener scroll local sin tapar acciones.

## Evidencia disponible

63 imágenes de aplicación/PDF/QA en ámbito (excluidos builds, perfiles PWA, iconos y mapa). Varias son repeticiones/candidatos anteriores. No se encontró un paquete de pares baseline/current. Suites focales y route-profiles prueban controles/lecturas, no fidelidad visual integral. Detalle de rutas, hashes y archivos en JSON compañero. 404 acciones y 25 familias; operación CLI requiere justificación no visual. Las822anclas son inventario léxico, no aceptación.

## Preparador y dependencias

Nuevo scripts/local/qa004-baseline-prepare.mjs: node --check PASS. Guard ABA_QA_PREPARE_UX_BASELINE=1, cwd Desktop exacto; destino .aba.local/qa/ux-baseline-dc1b0c4 ausente. Extrae sólo frontend src/public/index/package+lock/vite/tsconfig, blobs regulares, wx y manifiesto SHA256. Nunca extrae .agent/.gemini/.env, no checkout/reset, no scripts/deps/servicios. No ejecutado por este agente.

Docker existente tiene vite, React, Mantine, Recharts y lucide; faltan @vitejs/plugin-react y react-router-dom. Render fiel necesita instalación del lock original en volumen/contendor exclusivo mediante npm ci --ignore-scripts --no-audit --no-fund; no tocar dependencias producto. Tras instalación, Vite directo y loopback3011, sin conexión backend y con mocks baseline aislados. Reescribir router no es referencia fiel.

## Protocolo ejecutable de revisión

1. Root ejecutar preparador guardado. ABA_QA_PREPARE_UX_BASELINE=1; Node local scripts/local/qa004-baseline-prepare.mjs Desktop cwd, destino ausente, no checkout/reset; fuentes exactas y SHA manifest

2. Preparar dependencias exactas baseline sólo en Docker aislado. npm ci --ignore-scripts --no-audit --no-fund (package-lock baseline, volumen dependencias exclusivo) No host/global Windows, no npm scripts original, no modificar package/lock producto; comprobar disponibilidad red/cache antes

3. Render Vite baseline aislado. node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3011 --strictPort Puerto publicado sólo127.0.0.1:3011, no network Supabase; baseline mocks, volúmenes propios; egress bloqueado tras instalación

4. Capturar baseline y candidato serialmente.  Sólo datos sintéticos; sesiones actuales coordinadas por root; rutas públicas primero; no secretos/PII/trace/video; screenshot deliberate

5. Recorrer todas las familias/estados de inventario.  Diferencias de datos/mock no se comparan pixel idéntico; comparar distribución/control funcional y adaptaciones justificadas; no generar writes al abrir screenshots

6. Inspección humana/agente de pares y geometría.  Screenshot existente o locator visible no basta para comparación base; registrar ruta, perfil, actionIds, fuente baseline, PNGs, resultado y excepción específica

7. Conciliar cada acción y cerrar QA004 sólo tras auditoría completa.  404 acciones integradas con estado visual/adaptación/no-UI explicado; OPERACION CLI no visual justificado; 16QA y13upgrades separados; Chat diferido explícito; no aprobación global desde822anclas

Comparar desktop1440×900 y mobile390×844. Por ruta/familia capturar pantalla normal/vacía, tabs, menú, modal, scroll top/bottom, validación, denegaciones y recuperación pertinentes; registrar actionIds, perfil, commit/build, PNGs y decisión específica. Cosméticos que no afectan controles quedan diferidos; pérdida de control o distribución contractual debe tratarse antes de aprobar. Primero rutas públicas en curso por root; privadas seriales sin compartir identidades en paralelo. Los recorridos humanos finales permanecen pendientes.

## Render de referencia finalizado

Root extrajo71files y arrancó referencia Docker readonly en localhost3002 con lock original, ignore-scripts y volumen exclusivo. Suite tests/e2e/qa004.baseline-capture.spec.mjs + playwright.qa004-baseline.config.ts: rutas/estados **2/2PASS36,7s**, suplemento ensayos **2/2PASS2,6s**, lintPASS. Nueve rutas concretas y404;25screens desktop+26mobile+2porcentaje activo. Zero pageerrors; Dicebear externo bloqueado, placeholders deliberados. No Auth ni candidato3001 ni guardado mock.

Manifiestos: .aba.local/qa/ux-baseline-render/{desktop,mobile}/manifest.json. Dashboard.png disponible en ambos. Inspección directa de11imágenes confirma composición lg5/7 y orden móvil; compartir Activos es acordeón por alumno (candidate tabla requiere conciliación). Configurar→IniciarRegistro original y defaultsNR no deben restaurar falsas observaciones actuales: adaptación clínica explícita requerida. Mobileheader original ya envuelve selectorrol y tapa contenido, no replicar defecto histórico.

Diagnóstico inicial suplemento por heading ficticio del arnés preservado; fuente usa Text, selector corregido, repeticiónPASS. Capturas modalfullPage muestran viewport interno y fondo; falta scrollbottom específico para probar pie accesible. Este paquete acredita referencia renderizada; **no aprobación QA004 ni comparación completa del candidato**.
