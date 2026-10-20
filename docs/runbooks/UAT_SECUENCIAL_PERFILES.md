# UAT secuencial de perfiles con una cuenta designada

## Propósito y límite

Este recorrido comprueba las restricciones reales de `admin`, `supervisor` y
`therapist` usando **la misma cuenta designada** en tres sesiones separadas. No
mantenga esa cuenta como admin para simular los otros perfiles: tendría todas las
capacidades y el resultado no sería válido.

Las escrituras operativas y la restauración están detalladas en
`UAT_ROLE_TRANSITIONS.md`.

No cree pacientes reales ni use recuperación de contraseña. No modifique Auth,
RLS, grants, VPS ni datos remotos fuera de las operaciones UAT autorizadas. Use
una ficha y una cuenta auxiliar exclusivamente sintéticas.

## Precondiciones

- La cuenta designada parte con membresía `admin` activa y es el admin habitual
  de la clínica.
- Existe una segunda cuenta sintética que el operador puede promover como
  admin temporal. No representa un cuarto perfil bajo prueba. El inventario
  remoto verificado el 2026-09-11 confirmó que `ABA_staging` ya contiene cuentas
  sintéticas confirmadas y activas, por lo que no se debe crear ni invitar una
  cuenta adicional para este recorrido.
- Las cuentas sintéticas existentes conservan roles heredados (`clinician` o
  `viewer`) que no se ofrecen como perfiles del MVP. El operador debe restaurar
  ese valor exacto mediante el MCP; no se sustituye por un perfil nuevo desde la
  interfaz.
- Hay una ficha dummy identificable; no contiene información clínica real.
- El operador tiene disponible el MCP de Supabase para cambiar y verificar la
  membresía de la cuenta designada entre sesiones. La cuenta sintética temporal
  actúa sólo como resguardo del último admin y no necesita iniciar sesión.
- Antes de cada cambio de perfil, la cuenta designada debe cerrar sesión. El
  operador conserva el snapshot inicial de membresía y asignación para restaurarlo.

## Operación exacta

1. Antes de modificar roles, el operador resuelve los cuatro identificadores y
   toma el snapshot indicado en `UAT_ROLE_TRANSITIONS.md`. Debe conservar los
   valores originales de ambas membresías y asignaciones hasta terminar el UAT.
2. Con la cuenta designada como admin, abra **Administración** y cambie una de
   las cuentas sintéticas existentes a `Admin / clínica`, estado `Activa`.
   Espere el aviso de confirmación del servidor y recargue la lista de equipo.
   Deben existir dos admins activos. No use recuperación de contraseña ni envíe
   una invitación nueva.
3. Cierre la sesión de la cuenta designada y confirme al operador que quedó fuera.
   El operador cambia la membresía
   designada a `supervisor` activa y confirma una asignación `supervisor` activa
   sobre la ficha dummy mediante el MCP. Cada escritura se verifica con una
   lectura inmediata; no se modifican tablas clínicas.
4. Inicie una sesión nueva de la cuenta designada.
   Compruebe que no aparece **Administración**, que puede abrir la ficha dummy
   asignada y que los cambios permitidos se confirman y sobreviven a una nueva
   apertura de la ficha. Cierre sesión.
5. Confirme al operador que la sesión quedó cerrada. El operador cambia la
   membresía designada a `therapist` activa y su asignación a `therapist` activa,
   conservando otro supervisor primario en la ficha. Verifica ambas escrituras.
6. Inicie una sesión nueva de la cuenta designada. Compruebe
   que no aparece **Administración**, que sólo se expone la ficha dummy
   asignada y que la captura/consulta permitida del técnico se conserva al
   reabrir. Cierre sesión.
7. Confirme al operador que la sesión quedó cerrada. El operador restaura en una
   transacción la membresía `admin` y la asignación inicial de la cuenta designada,
   además de la membresía y asignación originales del resguardo. La restauración
   del rol heredado del resguardo se hace por MCP porque la UI no lo expone.
8. Inicie una sesión nueva de la cuenta designada. Debe volver a aparecer
   **Administración**. El operador repite las lecturas del snapshot y confirma
   coincidencia exacta para ambas cuentas y asignaciones. Registre el resultado y
   la hora, sin anotar correos completos, JWT, cookies ni contenido clínico.

## Evidencia de persistencia y controles

- La pantalla **Administración** carga el equipo mediante `mvp_team` y guarda
  rol/estado mediante `mvp_set_member`; la acción sólo muestra éxito si la RPC
  responde con datos.
- `mvp_set_member` actualiza una única membresía por pareja
  organización/usuario, registra `clinic_admin_events` y rechaza bajar o
  suspender al último admin activo. La UI bloquea el cambio de la propia sesión
  admin para que el flujo use el admin temporal.
- **Asignaciones** guarda con `set_student_assignment`; el estado `inactive`
  equivale a retirar la asignación, sin borrar la membresía ni la ficha.
- La nueva sesión es obligatoria después de cada cambio porque el contexto
  clínico se calcula desde la membresía activa en cada petición.
- Los cambios de rol ejecutados por el operador mediante MCP sirven sólo para
  preparar cada identidad UAT. No sustituyen la validación del CRUD administrativo,
  ya cubierta por la corrida funcional consolidada.

## Criterios de aborto

Detenga el UAT si la confirmación persistida no llega, el perfil nuevo no
coincide al iniciar una sesión nueva, falta un admin activo, se ve una ficha no
asignada o se pretende usar datos reales. No intente compensarlo con cambios
manuales en Auth o SQL remoto; conserve la evidencia y escale al propietario.
