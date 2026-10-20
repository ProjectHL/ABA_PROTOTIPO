# QA final consolidado — candidato MVP

Fecha: 2026-09-11  
Alcance: árbol local actual, Supabase local reconstruido desde migraciones y
preflight público no destructivo de `ABA_staging`.  
Datos: exclusivamente sintéticos; no se crearon usuarios ni registros remotos.

## Resultado ejecutivo

**PASS del gate automatizado.** El código actual compila, el contrato TypeScript
coincide con Supabase local, los recorridos públicos funcionan y los tres perfiles
pasan el E2E autenticado aislado. El candidato queda listo para UAT manual en
`ABA_staging`, pero todavía no está autorizado para pacientes reales ni publicado.

## Evidencia de la corrida única

| Verificación | Resultado | Evidencia |
|---|---|---|
| ESLint | PASS | `eslint .` finalizó sin errores después de retirar una sincronización de estado React inválida del panel heredado de programas. |
| TypeScript | PASS | `tsc --noEmit`. |
| Suite funcional/DB | PASS | Vitest: 5 archivos, 24 pruebas. |
| E2E público | PASS | Playwright: 2/2; acceso a login/recuperación y preservación de deep link protegido. No envía correo de recuperación. |
| E2E autenticado local | PASS | Playwright: 3/3; admin aislado por clínica, supervisor asignado y técnico con lectura/captura sin edición. |
| Build de producción | PASS | Next.js 16.3.4 compiló, tipó y generó las páginas estáticas y rutas dinámicas. |
| Tipos Supabase | PASS | El generador local coincide exactamente con `src/lib/supabase/database.types.ts`. |
| Auth staging | PASS | Proyecto esperado; settings 200; signup público deshabilitado; anónimo deshabilitado; Email activo; confirmación requerida; Edge anónima rechazada con 401. |
| Compose VPS | PASS | `docker compose config --quiet` con el archivo de ejemplo. |
| Higiene de diff | PASS | `git diff --check`. |

El primer preflight de Auth recibió un 504 transitorio del endpoint público de
settings; el único reintento respondió 200 y todos los controles quedaron en
PASS. La primera comparación de tipos detectó que cuatro firmas RPC estaban en
un orden distinto al generado; se sincronizó el archivo y la comprobación final
pasó. Ninguno de esos ajustes modificó datos.

El E2E autenticado creó identidades y fichas sólo en Supabase local y ejecutó su
reconstrucción al finalizar. El núcleo local de Database, Auth y API quedó
operativo; los servicios opcionales no usados por este MVP (Realtime, Storage,
transformación de imágenes, Analytics, Vector y Pooler) permanecen detenidos.

## Gates manuales pendientes

1. Repetir el flujo real de recuperación de contraseña: solicitar enlace, abrir
   `/auth/confirm`, establecer una contraseña nueva y entrar nuevamente. Se deja
   al final por los límites de correo del proyecto Free.
2. Ejecutar en `ABA_staging` el UAT secuencial de la cuenta designada como admin,
   supervisor y técnico, usando sólo una ficha dummy. El procedimiento reversible
   está en `docs/runbooks/UAT_SECUENCIAL_PERFILES.md` y
   `docs/runbooks/UAT_ROLE_TRANSITIONS.md`. El snapshot remoto y la combinación
   compatible de cuenta de resguardo + ficha dummy ya fueron seleccionados en
   memoria operativa, sin escrituras.
3. Elegir y operar la recuperación remota: Supabase Pro o dumps lógicos cifrados
   externos con RPO/RTO aceptados.
4. Proveer VPS y hostname, desplegar el SHA candidato, configurar redirects de
   Auth, verificar HTTPS, healthcheck y persistencia tras reboot.
5. Obtener aceptación profesional, respaldar, limpiar exclusivamente los lotes
   dummy identificados y comprobar listas clínicas vacías antes de abrir la PoC.

## Dictamen

- Lógica y persistencia automatizada: **cerradas para pasar a UAT**.
- Recuperación de contraseña real: **pendiente de repetición manual**.
- UAT profesional: **pendiente**.
- Recuperación remota, VPS/HTTPS, limpieza y publicación: **pendientes**.
- Uso con pacientes reales: **no autorizado todavía**.

No se realizó commit ni push.
