# R5 — interfaz real, ficha positiva y compilación

2026-09-27. Progreso parcial verificable, no aceptación local integral.
Checkout Desktop confirmado; copia OneDrive no intervenida. Chat/R6 excluidos.
HEAD 39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios existentes preservados.

## Entorno y suite

Reutilizados Chrome y Playwright instalados; no nuevos frameworks/dependencias.
playwright.r5.config.ts apunta exclusivamente al servidor local ya iniciado;
no webServer npm dev, para no cargar env staging del host. Preflight comprueba
checkout, aislamiento Supabase y respuesta exacta de /api/health. Traces/video
y screenshots automáticas deshabilitados; no credenciales en evidencia.
tests/e2e/r5.local.spec.mjs utiliza la cuenta admin-a del manifiesto privado
del lote ready 2155e99e-bda4-4c68-95cf-b74cacd84ecd. No crea cuentas ni clínicas.
Los scripts/fixtures anteriores que apuntan a otro stack no se ejecutaron.

Comando desde el checkout autorizado, con runtime portátil:

```powershell
$env:ABA_QA_LOCAL_UI='1'
& ./.runtime.local/node-v22.23.2-win-x64/node.exe node_modules/@playwright/test/cli.js test --config playwright.r5.config.ts
```

## Defecto real corregido

Alta desde modal original → Server Action real → comando V2 → recibo →
navegación al detalle. El alta se persistió, pero el detalle falló al validar
el DTO: faltaban hasActiveSession, familyAccessEnabled y assignedProfessional.
No se debilitó Zod ni se fabricaron defaults. Forward
20260927161726_qa_student_detail_card_contract.sql incorpora las tres consultas
persistidas ya utilizadas por la lista. Conserva SECURITY INVOKER, STABLE,
search_path vacío, student.view canónico y RLS; no cambia ACL ni escrituras.
Dry-run/aplicación sólo al stack aislado, sin reset/seeds/roles.

Catálogo comprobado: 99 migraciones, última 20260927161726. Función invoker,
STABLE, path fijo, EXECUTE authenticated=true/anon=false. Advisors all: sin
hallazgos. Las once advertencias SQL históricas siguen clasificadas como deuda.

El primer fallo de localización exacta de Email pertenecía al test; se corrigió
usando el rol accesible observado. No se modificó el formulario por ese fallo.
La navegación desde landing pasa en Chrome; el click sin efecto de la anterior
observación IAB no se reprodujo y no se considera defecto ABA demostrado.

## Datos mínimos y resultados

Revalidación 2026-09-28 después del restore aislado y reinicio web:
`ABA_QA_LOCAL_UI=1` con `r5.local.spec.mjs` pasó **4/4** en escritorio y
móvil (1,3 min), `.aba.local/qa/playwright/baseline/.last-run.json` informó
`passed` y cero fallos. Reutilizó la misma ficha/programa sintéticos; no creó
cuentas ni clínicas, no limpió datos. Este corte confirma de nuevo navegación,
login, contexto, persistencia tras recarga, programa y logout con la versión
actual, pero no sustituye los casos QA restantes.

Una sola ficha estable: QA-R5-A-2155E99E, nombre QA SINTETICO LOCAL A, en la
clínica sintética A. Se reutiliza por identificador en cada ejecución, sin reset
ni duplicación. El alta UI de producción guarda test_run_id=null: esta ficha
NO está etiquetada con el lote y no debe considerarse eliminable por cleanup
del lote. Identificarla por clínica sintética + ID exacto; no ejecutar limpieza.
Diagnóstico/datos de prueba son ficticios, sin RUT, contactos ni adjuntos reales.

- UI escritorio 1440x900 y móvil 390x844: 4/4 pasan (33.3s).
- Landing → login real → dashboard/contexto → ficha → edición por Server Action
  → confirmación → recarga y valor persistido → logout → ruta protegida redirige.
- DB agregado confirmó una única ficha sintética y versión3 después de desktop
  y mobile. Una repetición posterior desktop genera otra versión legítima; no
  congelar la versión3 como estado actual ni repetir alta para recuperar lectura.
- Suite ampliada detecta categorías de hidratación/HTML anidado/key y desktop
  repite 2/2 (17.5s), sin esas categorías. La captura móvil muestra badge de
  desarrollo «3 Issues»; no se identifica su causa con esta clasificación ni se
  declara consola completa limpia. Diagnóstico focal pendiente si se reproduce.
- API real ampliada 72/72 (6.41s): DTO del detalle completo, coincidencia de sus
  tres campos con lista, y null para admin-b/externo/familia sin vínculo.
- Capturas únicamente de ficha sintética bajo .aba.local/qa/playwright,
  ignoradas Git. Móvil revisada visualmente: ficha/campos visibles; no demuestra
  fidelidad del resto de pantallas ni comportamiento móvil de todas las funciones.
- Lint de suite UI/config y API exit0; typecheck posterior al build exit0.

## Compilación actual

Next16.3.4 dentro del contenedor web local, con archivos env staging enmascarados
por configuración Compose existente. NODE_ENV=production y
NEXT_DIST_DIR=.aba.local/qa/next-build: no sustituye la salida .next del servidor
dev, no reinicia DB/Auth/Storage/web y no publica otro servicio. Compilación
exit0: compiled12s, TypeScript13s, 23 páginas estáticas generadas. Ruta /chat
aparece compilada como pantalla no operativa por decisión de alcance, no feature
aceptada. No se inició R6 ni servidor de producción público.

Next añadió automáticamente sus includes de tipos QA a tsconfig.json y regeneró
next-env.d.ts apuntando a dicha salida. Entradas anteriores conservadas; son
efectos de compilación, no cambios de contratos ni segunda aplicación.

Huella final actual (algoritmo del gate R4): 318 archivos,
53d4cb25976e08ba95a2b798815e6e67fd408cb9bfb9910f65ae5bc0203173ec.
La huella b154... anterior a la generación de configuración no identifica este
corte final. Build exitoso no equivale a release aceptado.

## Pendientes exactos del cierre

Continuar QA positivo de programas/publicación/cinco dimensiones/sesiones y sus
conflictos/reintentos; luego familia/colaboración/adjuntos/agenda/notificaciones,
offline/revocación, conciliación PDF/CSV/resultados, reinicio y restore aislado.
Completar cobertura/ejecución Postman y ARCHIVOS-013 con autorización exacta del
lote antes de eliminación. Los QA-001–016 siguen pendientes de aceptación
integral; estos resultados aportan evidencia parcial a QA-002/003/004/005/013/
014/015, no cierran esas filas ni las 404 integradas. No nuevos pendientes
cosméticos/refactors ni auditoría general.
