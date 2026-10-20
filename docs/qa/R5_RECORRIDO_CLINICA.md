# Recorrido 1 — clínica / administración

Planificado el 2026-10-05; NO EJECUTADO. Actor propuesto: usuario propietario, admin de la clínica local acordada. Depende de [G0 y reglas del plan maestro](R5_ENSAYO_FINAL_PERFILES.md). No supone crear una clínica nueva desde UI: usar la clínica local confirmada; si falta, resolver preparación explícitamente sin presentar alta SQL como funcionalidad del producto.

## Primera parte: preparar el trabajo clínico

| ID | Acción del usuario | Esperado y evidencia |
|---|---|---|
| C-01 | Login, selección de clínica, dashboard/búsqueda/navegación | Identidad y clínica exactas; recursos sólo autorizados; recarga conserva contexto. |
| C-02 | Abrir perfil; cancelar borrador; editar datos/avatar y guardar | Cancelar no cambia DB; guardado versionado y avatar privado con hash; nuevo login conserva. |
| C-03 | Invitar supervisor nuevo desde equipo | Rol supervisor, cuenta/membresía y comprobante exactos. UI no confunde envío con aceptación. |
| C-04 | Repetir/reconsultar invitación y gestionar reenvío cuando corresponda | Sin cuentas ni membresías duplicadas; estado durable, error explícito si correo falla. |
| C-05 | Invitar técnico nuevo | Mismo flujo, rol therapist; activación se completa en T-01, sin alta manual que omita UI. |
| C-06 | Consultar equipo, filtros y perfiles | Nuevos miembros/estados visibles, datos actuales; sin editar perfiles ajenos fuera de permisos. |
| C-07 | Crear ficha sintética; validar errores y cerrar borrador previo | Campos requeridos claros; ningún cambio al cancelar; ID único y persistencia tras guardar. |
| C-08 | Editar información general, nombre/iniciales/idioma/convivencia | Versión actual, cambio confirmado y recarga; datos previos y ajenos conservados. |
| C-09 | Crear/editar familiar-contacto y hermano; contacto principal | Roles coherentes, una persona principal; historial/identidades retenidos al retirar un registro propio. |
| C-10 | Historial y medicación: alta/corrección/evolución/fin/reactivación | Versiones inmutables y encadenadas, estado correcto; no borrar historia clínica. |
| C-11 | Consentimientos: alta/corrección/reemplazo/revocación | Versiones, estado, otorgante y referencias exactas, recarga consistente. |
| C-12 | Documentos/fotografía: límites, carga, lectura, sustitución y archivo | Tipo/tamaño rechazados correctamente; bytes/hash y referencias vigentes; sin eliminación física automática. |
| C-13 | Asignar supervisor y técnico a la ficha; consultar capacidades | Función y vigencia efectivas; roles de clínica no sustituyen asignación; otras fichas intactas. |
| C-14 | Preparar agenda con participantes/zona, editar/recurrencia/cancelar prueba | Persistencia y recibos; sólo participantes previstos; cita de captura apta identificada. |

Salida G1: supervisor/técnico activan sus propias cuentas; ficha y asignaciones confirmadas. Conservar IDs, roles y versiones actuales para entregar al supervisor.

## Retorno después de captura y revisión

| ID | Acción del usuario | Esperado y evidencia |
|---|---|---|
| C-15 | Consultar sesión/resultados/dashboard y descargar reportes | Datos del técnico y revisión del supervisor coinciden con métricas y exportaciones. |
| C-16 | Gestionar solicitud interna: denegar una, aprobar otra elegible | COMPARTIR-030/031, motivo/alcance/vigencia/decisión versionada; no confundir con invitación externa. |
| C-17 | Externo: invitar, aceptar/rechazar, modificar acceso y revocar | Sólo ficha/alcance acordados, sin membresía general; denegación posterior real. |
| C-18 | Familiar: invitar/aceptar, publicar programa/resultados/documento y agenda, revocar | Portal muestra únicamente versiones seleccionadas, descarga exacta, sin ficha general; acceso retirado al revocar. |
| C-19 | Suspender/reactivar miembro; retirar/restablecer asignación propia del ensayo | Acceso cambia en sesión abierta y nuevo login; otro admin se mantiene activo; historiales conservados. |
| C-20 | Planes/documentos comerciales, soporte/ticket, ayuda/contacto | Acciones vigentes según matriz, versiones/recibos y aislamiento; sin compra/cobro externo inventado. |
| C-21 | Archivo/reactivación de ficha de ensayo con cancelación previa | Cancelar no cambia estado; transiciones explícitas, historia y referencias preservadas. |
| C-22 | Nuevo login tras reinicio, revisión de cuentas/recursos y manuales | Persistencia intacta; inventario de lo conservado, ningún borrado automático; entrega operable. |

## Negativas obligatorias

Desde admin A intentar recursos B mediante UI/URL/API; no acceso cruzado. Desde cuentas supervisor/técnico verificar administración/equipo/planes denegados cuando no tengan capacidad. Manipular identificadores en una petición propia controlada y comprobar rechazo sin mutación. Invitar con correo inválido/rol inválido/repetición y validar contratos. Probar sesión caducada y comando de versión vieja sin falso éxito.

Completar todas las variantes de la matriz asociadas, escritorio y móvil. Los casos X del maestro siguen obligatorios aunque estas tablas pasen. Cierre de este recorrido: todos sus casos aplicables aprobados, alta real de cuentas comprobada, entrega al siguiente actor consistente y ningún defecto bloqueante. Este plan no declara que ya ocurrió.
