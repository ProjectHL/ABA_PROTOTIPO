# Reauditoría SDD — ABA Clínico

Fecha: 2026-09-07. Proyecto: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
Baseline: `AUDITORIA_SDD.md`, 2026-09-02. HEAD: `794b794`, con cambios locales y archivos nuevos no versionados. Esta revisión corresponde al árbol de trabajo, no exclusivamente al commit.

## Dictamen

La base Next.js funciona y estudiantes cuenta con lectura real desde Supabase. El proyecto está en integración parcial: todavía no entrega un recorrido clínico persistente de extremo a extremo. **No cumple la salida a piloto con datos clínicos reales.**

La mejora principal es la sustitución de la lista/ficha mock por lectura autorizada y el bloqueo de varias escrituras ficticias en esa ficha. Permanecen dominios simulados, pruebas de seguridad sin ejecutar y discrepancias entre permisos organizacionales, asignaciones y controles de interfaz.

Entregables relacionados: [mapa de estado y checklist](STATUS_MAP_2026-09-07.md) y [spec SDD-07](SPEC_SDD_07_POC_CLINICA.md). Esta reauditoría actualiza conclusiones; conserva los documentos anteriores como historial.

## Evidencia y límites

| Comprobación ejecutada el 07-09 | Resultado |
|---|---|
| `npm.cmd run test` | 2 archivos, 3 pruebas aprobadas: redirect y mapper de estudiante. |
| `npm.cmd run lint` | Sin errores ni advertencias en la salida. |
| `npm.cmd run build` | Next 16.3.4: compilación y TypeScript aprobados. |
| Rutas emitidas por build | 4 dinámicas: lista, ficha, sesión y gráfico; las restantes listadas son estáticas. Proxy activo. |
| Supabase `get_project` | `ABA_staging` / `arfwuctpwnnuhdgjtxaa`, `ACTIVE_HEALTHY`, PostgreSQL 17. |
| Catálogo PostgreSQL | 25 tablas públicas, 25 con RLS. |
| Security Advisor actual | 10 WARN por RPC definer ejecutables por authenticated; 1 WARN por protección de contraseñas filtradas; 1 INFO por auditoría sin políticas. |
| Migraciones remotas | 23; última `20260831230235`, sin nuevas migraciones respecto del inventario anterior. |
| Migraciones y pruebas RLS locales | Documentos Markdown; no se encontraron migraciones `.sql` ni tests RLS ejecutables. |
| Reproducción de redirect | Importación del helper real en Node: acepta `/\evil.example`; `new URL(resultado, 'https://aba.example').origin` resulta `https://evil.example`. |

Se inspeccionaron rutas, proveedores, repositorios, flujos mock, pruebas, configuración y catálogos/funciones/políticas remotos mediante consultas de solo lectura. No se leyeron filas clínicas para esta auditoría. No se aplicaron cambios remotos ni correcciones de producto. Las verificaciones locales generan artefactos normales de build/test.

No se ejecutaron E2E en navegador, pruebas con JWT de diferentes usuarios, escrituras clínicas, restauraciones ni auditoría de vulnerabilidades de dependencias. No se verificó la configuración de esquemas expuestos de Data API ni el plan actual de Branching. El rechazo de Branching de septiembre 2 sigue siendo evidencia histórica, no una comprobación actual. Los hallazgos estáticos no equivalen a explotación demostrada.

## Avances respecto de la auditoría anterior

- Se eliminó el selector de rol y el valor inicial `admin`; ahora se consulta una membresía activa.
- Ficha, sesión y gráfico consultan capacidades en servidor antes de renderizar.
- Lista/ficha de estudiantes consultan `clients`; existen DTO, mapper y clientes con genérico `Database`.
- Crear estudiante y varias ediciones de ficha están deshabilitados; la ficha comienza con programas vacíos.
- Login utiliza `redirectTo`, está en español y retiró enlaces ficticios de recuperación/términos.
- Se retiró el enlace a `/chat` y los archivos ejecutables de Vite del árbol actual.
- Hay Vitest con 3 pruebas. Esto sustituye el hallazgo anterior de ausencia absoluta de tests, pero no resuelve la falta de pruebas de autorización.

## Hallazgos

### A01 · P0 · La captura anuncia guardado y elimina el único registro local

Evidencia: `src/features/dataCollection/DataCollectionEngine.tsx:43`: `handleSave` escribe localStorage, registra el payload en consola, muestra éxito y elimina la clave sin llamada de persistencia. `src/views/SessionPage.tsx:98` considera completado un programa cuando se cierra el modal, incluso por cancelación. La finalización promete guardar registros.

Impacto: si se habilita el motor con datos reales, produce pérdida de datos y falsa confirmación. Actualmente el flujo normal también está obstaculizado por A02; no se afirma que se hayan perdido registros reales. Salida: confirmación del servidor, borrador recuperable, cancelación independiente, protección de doble envío y logs sin payload clínico. Hasta implementarlo, bloquear captura real también por URL.

### A02 · P0 · La ruta autoriza un estudiante real y la vista busca otro contrato mock

Evidencia: `app/session/[studentId]/page.tsx` autoriza `record.capture`, pero `src/views/SessionPage.tsx:32` consulta `studentsData` y `programsData`. Los fixtures usan IDs `std-001`; los IDs de `clients` son UUID. Un UUID real autorizado no se encuentra en esos fixtures. El gráfico presenta la misma separación; `src/views/ProgramChartPage.tsx:51` busca el programa solo por ID y genera métricas ficticias.

Impacto: sesión y gráfico no completan el recorrido desde una carpeta real. Además, la ruta de gráfico no verifica en servidor que `programId` pertenezca a `studentId`. Hoy no se demostró una fuga de datos reales de programas: la vista usa mocks. Salida: cargar estudiante/programa/versiones por relación y capacidad, o declarar la ruta no disponible hasta integrar el dominio.

### A03 · P0 · El plan de revocación rompería el acceso directo protegido por RLS

Evidencia: `SDD-03_HARDENING.md`, bloque SQL, y `supabase/migrations/SDD-03_RPC_RLS_AUDITORIA.md` proponen revocar EXECUTE de `private.has_student_capability` a authenticated. Las políticas actuales de `clients`, `programs` y `clinical_sessions` llaman directamente a esa función. La inspección de privilegios confirma que authenticated puede ejecutarla hoy; anon no.

Impacto: revocarla sin cambiar y verificar las políticas puede impedir SELECT/INSERT/UPDATE legítimos. Probar solo las diez RPC definer, como propone el documento, no cubre esta regresión. El permiso SQL para evaluar una política y la exposición de una función por REST son controles distintos. No se ha comprobado que `private` sea un esquema expuesto por Data API.

Salida: reemplazar la revocación indiscriminada por inventario de consumidores y pruebas de tablas directas más RPC. Mantener los privilegios mínimos necesarios para políticas en un esquema no expuesto, o rediseñar explícitamente sus dependencias. Revisar también el `revoke ... on all functions in schema public`, cuyo alcance excede el inventario de diez RPC. No aplicar el bloque antiguo tal cual.

### A04 · P0 · Supervisor principal no valida el inicio de vigencia de la asignación

Evidencia remota actual: `private.has_student_capability` y `private.student_assignment_role` verifican `effective_at <= now()`. `private.is_primary_student_supervisor` comprueba estado activo, rol, is_primary y membresía, pero omite esa fecha. `public.decide_student_authorization` y `public.record_consent_reference` dependen de este último helper.

Impacto inferido: una asignación principal activa con inicio futuro puede habilitar operaciones privilegiadas antes de su vigencia. Las restricciones inspeccionadas no prohíben fecha futura; sí exigen `ended_at IS NULL` para una asignación activa, por lo que no se presenta una asignación activa vencida como escenario demostrado. Falta reproducción con fixture/JWT y comprobación de mecanismos adicionales.

Salida: definir una única regla temporal, probar inicio futuro/inicio vigente/inactivo/membresía suspendida y aplicarla a los helpers y consumidores pertinentes.

### A05 · P0 · Seguridad de datos pendiente de verificación ejecutable

Evidencia: Advisor conserva las diez funciones definer y el aviso de contraseña; auditoría tiene RLS sin políticas. Las pruebas locales solo cubren un mapper y redirecciones básicas; `supabase/tests/SDD-03_PRUEBAS_RLS.md` es un plan.

Impacto: no existe evidencia automatizada de aislamiento entre organizaciones, asignaciones, vigencias y roles. Un aviso definer no demuestra vulnerabilidad por sí solo, y auditoría sin políticas no implica acceso público: requiere estrategia verificable de escritura interna/lectura administrativa.

Salida: base aislada reproducible, matriz positiva/negativa, inventario/grants revisados, evidencia de auditoría y excepciones justificadas por función. No exigir cero avisos mediante revocaciones que rompan funciones necesarias.

### A06 · P1 · Redirección parcialmente corregida, pero aún admite destino externo

Evidencia: `src/lib/security/redirect.ts:2` verifica `/` y rechaza `//`, pero acepta barra inversa. La reproducción con el helper real admite `/\evil.example` y el parser URL resuelve otro origen. No se ejecutó el exploit mediante el navegador de Next. `src/lib/supabase/proxy.ts:28` conserva solo pathname dentro de redirectTo; pierde el query del destino. `src/lib/navigation.ts` utiliza `router.push`, no replace.

Salida: rechazar barras inversas/controles, validar el origen tras normalizar la URL, mantener pathname+search y reemplazar historial al iniciar sesión. Incluir pruebas adversariales y E2E. Logout (`MainLayout.tsx:115`) también debe comprobar el error devuelto antes de comunicar salida o navegar.

### A07 · P1 · Rol organizacional todavía se usa como permiso clínico

Evidencia: `src/context/RoleContext.tsx:30` toma la membresía activa más reciente (`limit(1)`) sin selección explícita de organización; la política `memberships_select_self` sí restringe a la identidad actual, por lo que no se atribuye a este código lectura de membresías ajenas. El mapper usa family como fallback para cualquier rol no reconocido. La ficha sigue usando `isSupervisor/isTherapist`; no recibe capacidades por estudiante.

Impacto: controles incoherentes para usuarios multiorganización o con distinto rol de asignación. En la base, supervisor asignado recibe capacidades amplias; coordinator tiene lectura/captura y permisos adicionales temporales; family no obtiene capacidades con el helper actual. Además, la RPC de capacidades incluye decidir/revocar para supervisor no principal aunque otras RPC exigen principal.

Salida: identidad/organización explícitas, capacidades por recurso y condición de supervisor principal coherente; rol desconocido debe quedar sin permisos. Probar la igualdad entre lo que ofrece la UI y lo que admite cada RPC.

### A08 · P1 · La ficha convierte información desconocida en ausencia clínica

Evidencia: `students.repository.ts` asigna `medications: []`, `familyMembers: []`, `hasActiveSession: false`, `familyAccessEnabled: false` sin consultar esas entidades. `StudentDetail.tsx:598` muestra “No hay medicación activa”. El mismo componente, líneas 355 y 428, rotula `clinical_id` como RUT/Identidad y presenta iniciales bajo Nombre Completo.

Impacto: un dato no integrado aparenta estar verificado como negativo, y un identificador clínico se confunde con identidad civil. Salida: tipos/estados explícitos de no disponible, vacío confirmado y error; etiquetas “Iniciales” e “Identificador clínico”; cargar cada dominio antes de afirmar ausencia.

### A09 · P1 · Frontera de estado y errores de estudiantes incompleta

Evidencia: `StudentsPage.tsx:20` copia initialStudents a useState solo al montar; el efecto retorna si recibe initialStudents. Si Next conserva la instancia y cambian las props, el estado no se actualiza. No existen `app/**/error.tsx` ni `loading.tsx`; las consultas iniciales servidor lanzan errores antes de que el Alert cliente pueda renderizarse.

Impacto: riesgo de ficha/lista obsoleta durante refresh/navegación y errores iniciales sin recuperación específica. La retención de instancia no fue reproducida en navegador. Salida: props como fuente de lectura o sincronización deliberada, prueba de navegación entre dos estudiantes y límites de error/carga con reintento.

### A10 · P1 · Dashboard, equipo y accesos continúan simulados

Evidencia: `DashboardPage.tsx`, `TeamPage.tsx`, `SharedAccessPage.tsx`, `MainLayout.tsx:61` importan mocks. El layout utiliza un email fijo, polling cada 2 s y mutación local de invitaciones con mensajes de acceso concedido. La lista de estudiantes aún pasa `supervisorProfile` mock al layout.

Salida: integrar cada dominio aprobado o deshabilitarlo con estado claro. No presentar una aceptación local como autorización efectiva. Upgrade/búsqueda/notificaciones requieren alcance definido. Chat ya no se publica en navegación; InvitationsPage sigue sin ruta independiente.

### A11 · P2 · Base de calidad y reproducción aún incompleta

Evidencia: package.json incluye test, pero no typecheck explícito ni pipeline CI encontrado. No hay SQL local para reconstruir las 23 migraciones remotas. ESLint ya no usa Vite, pero no incluye reglas específicas de Next. Dependencias conservan rangos; no se ejecutó npm audit. README sigue describiendo estudiantes como futura integración y no lista el comando test. Tipos Database existen y se utilizan, pero no se verificó su igualdad completa con el esquema remoto.

Salida: CI desde checkout limpio, SQL reproducible, comprobación de drift de tipos, documentación actualizada y revisión de dependencias. La eliminación de Vite está implementada en el árbol, pendiente de consolidación en Git.

## Orden recomendado

1. A03–A05: corregir especificación de seguridad y preparar pruebas aisladas; A01–A02: contener funcionalidades clínicas incompletas.
2. A06–A09: cerrar identidad, redirección, semántica de ficha y comportamiento de lectura.
3. Completar contrato/escritura de estudiantes; después programas y captura persistente.
4. A10–A11: integrar funciones aprobadas y consolidar CI/operación, iniciando CI desde la primera entrega.

Fundamento consultado para grants/políticas: [documentación oficial RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). Las conclusiones del proyecto se sustentan en su código y catálogos actuales. El índice changelog.md no pudo leerse por restricción de contenido del lector web; no se implementaron cambios de API.
