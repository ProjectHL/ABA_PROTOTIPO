# Conciliación funcional404 — propuesta 2026-10-14

Revisión documental sin ejecutar pruebas. Candidato V21,103 migraciones. No modifica el ledger canónico ni cierra casos QA.

Distribución: {"evidence-sufficient":322,"concrete-gap":82}. Brechas por tipo: {"documentary-binding":74,"execution-proof":7,"candidate-renewal":1}.

Una brecha de trazabilidad NO significa que falte ejecutar otra prueba. Revisar las referencias antes de repetir. Suficiencia se limita al control focal documentado; perfiles, regresión y comparación visual siguen separados.

## Prioridades concretas

- **P1 IDENTIDAD-005**: Las dos pruebas invite-email conservadas declaran inviteAcceptanceExecuted=false y passwordSetExecuted=false. Vincular aceptación inicial real o ejecutar alta/invitación nueva con identidad sintética y recibo; puede integrarse al recorrido humano final.
- **P1 IDENTIDAD-007**: Login redirectTo V21 desktop/móvil 2/2 PASS15,4s: absolute, protocol-relative, backslash, encoded-control rechazados a /dashboard y /team válido conservado; recarga,0externas,0comandos, identidad idéntica. Callback /auth/confirm next inválido NO ejecutado: brecha restante específica.
- **P1 IDENTIDAD-008**: Selector de la suite histórica es condicional; falta demostrar cambio efectivo a otra clínica autorizada y lecturas/recarga posteriores del contexto seleccionado.
- **P1 FICHA-001**: r5.local.spec.mjs:57-69 crea únicamente si no existe ficha. PASS agregado no identifica la rama; localizar recibo/ejecución inicial o añadir alta mínima explícita.
- **P1 PROGRAMAS-037**: La tarjeta de captura V1 frecuencia sólo lectura no demuestra lectura del diseño V1. Localizar diseño V1 autorizado y comparar sin inventar estructura ni escribir.
- **P2 PORCENTAJE-026**: Capture variants abre menú y selecciona ayuda; no demuestra abrir/cerrar sin selección conservando ensayo y cero comandos.
- **P1 OFFLINE-016**: Descarte de pendiente aislado acreditado V21; falta retención exacta de entradas acknowledged/superseded reales. Suite preparada no equivale a ejecución.
- **P1 OPERACION-012**: Restore102 histórico preservado; candidato actual tiene103 migraciones y nuevas escrituras/objetos. Renovar backup/restore103 aislado tras quiescencia con límites explícitos.

## Pendientes obsoletos resueltos documentalmente

Perfil/avatar/teléfono y selección offline ya tienen pruebas V21; RESULTADOS018/019 también. Controles pequeños V16, diseño conductual V14 y métricas V19 sustituyen los textos antiguos en evidenceAudit. No repetir esos paquetes por el estado anidado obsoleto.

## Inventario por acción

| Acción | Clasificación | Tipo de brecha | Control |
|---|---|---|---|
| IDENTIDAD-001 | evidence-sufficient | — | Login |
| IDENTIDAD-002 | concrete-gap | documentary-binding | Logout con aviso de pendientes offline |
| IDENTIDAD-003 | evidence-sufficient | — | Recuperar contraseña por correo local |
| IDENTIDAD-004 | evidence-sufficient | — | Cambiar contraseña |
| IDENTIDAD-005 | concrete-gap | execution-proof | Aceptar invitación de clínica |
| IDENTIDAD-006 | evidence-sufficient | — | Sesión caducada |
| IDENTIDAD-007 | concrete-gap | execution-proof | Redirección interna validada |
| IDENTIDAD-008 | concrete-gap | execution-proof | Seleccionar clínica activa |
| SHELL-001 | evidence-sufficient | — | Abrir/cerrar sidebar móvil |
| SHELL-002 | evidence-sufficient | — | Dashboard desde sidebar |
| SHELL-003 | evidence-sufficient | — | Mi Equipo desde sidebar |
| SHELL-004 | evidence-sufficient | — | Carpetas desde sidebar |
| SHELL-005 | evidence-sufficient | — | Accesos Compartidos desde sidebar |
| SHELL-006 | evidence-sufficient | — | Abrir menú profesional |
| SHELL-007 | evidence-sufficient | — | Editar perfil |
| SHELL-008 | evidence-sufficient | — | Guardar nombre/título/profesión/descripción |
| SHELL-009 | evidence-sufficient | — | Cargar avatar |
| SHELL-010 | evidence-sufficient | — | Seleccionar avatar disponible |
| SHELL-011 | evidence-sufficient | — | Retirar/sustituir avatar |
| SHELL-012 | concrete-gap | documentary-binding | Estados de carga/vacío/error/no disponible |
| BUSQUEDA-001 | evidence-sufficient | — | Abrir búsqueda |
| BUSQUEDA-002 | evidence-sufficient | — | Buscar estudiantes/programas/documentos autorizados |
| BUSQUEDA-003 | evidence-sufficient | — | Abrir resultado sin ampliar permisos |
| DASHBOARD-001 | evidence-sufficient | — | Bienvenida profesional real |
| DASHBOARD-002 | evidence-sufficient | — | Consultar estudiantes activos |
| DASHBOARD-003 | evidence-sufficient | — | Consultar programas activos |
| DASHBOARD-004 | evidence-sufficient | — | Consultar sesiones en curso |
| DASHBOARD-005 | evidence-sufficient | — | Expandir sesión activa |
| DASHBOARD-006 | evidence-sufficient | — | Abrir programa de sesión |
| DASHBOARD-007 | evidence-sufficient | — | Consultar sesiones finalizadas |
| DASHBOARD-008 | evidence-sufficient | — | Expandir sesión finalizada |
| DASHBOARD-009 | concrete-gap | documentary-binding | Abrir detalle finalizado |
| DASHBOARD-010 | evidence-sufficient | — | Consultar historial de logros |
| DASHBOARD-011 | evidence-sufficient | — | Filtrar gráficos |
| DASHBOARD-012 | evidence-sufficient | — | Ampliar gráfico |
| DASHBOARD-013 | concrete-gap | documentary-binding | Modo aplicador (simulación actual) |
| FICHA-001 | concrete-gap | execution-proof | Alta de estudiante (botón deshabilitado actual) |
| FICHA-002 | evidence-sufficient | — | Buscar por nombre/iniciales/ID clínico/RUT |
| FICHA-003 | evidence-sufficient | — | Filtro Vigentes |
| FICHA-004 | evidence-sufficient | — | Filtro Antiguos |
| FICHA-005 | evidence-sufficient | — | Filtro Todos |
| FICHA-006 | evidence-sufficient | — | Abrir tarjeta |
| FICHA-007 | evidence-sufficient | — | Menú Ver carpeta |
| FICHA-008 | evidence-sufficient | — | Volver a lista |
| FICHA-009 | evidence-sufficient | — | Consultar pestaña General |
| FICHA-010 | evidence-sufficient | — | Editar identificación |
| FICHA-011 | evidence-sufficient | — | Nombre completo con fallback iniciales |
| FICHA-012 | evidence-sufficient | — | RUT opcional normalizado y validado |
| FICHA-013 | evidence-sufficient | — | Identificador clínico separado |
| FICHA-014 | concrete-gap | documentary-binding | Cargar/sustituir fotografía |
| FICHA-015 | evidence-sufficient | — | Editar diagnóstico reportado |
| FICHA-016 | evidence-sufficient | — | Editar motivo de consulta |
| FICHA-017 | evidence-sufficient | — | Editar contexto hogar/escuela/adaptaciones |
| FICHA-018 | evidence-sufficient | — | Consultar pestaña Familia |
| FICHA-019 | evidence-sufficient | — | Crear familiar/contacto |
| FICHA-020 | evidence-sufficient | — | Editar familiar/contacto con ID estable |
| FICHA-021 | evidence-sufficient | — | Marcar contacto principal |
| FICHA-022 | evidence-sufficient | — | Gestionar hermanos con ID estable |
| FICHA-023 | evidence-sufficient | — | Archivar ficha con confirmación |
| FICHA-024 | evidence-sufficient | — | Reactivar ficha |
| HISTORIAL-001 | evidence-sufficient | — | Crear diagnóstico/evaluación/procedimiento |
| HISTORIAL-002 | evidence-sufficient | — | Consultar historial |
| HISTORIAL-003 | evidence-sufficient | — | Corregir entrada con revisión |
| HISTORIAL-004 | evidence-sufficient | — | Consultar versión anterior |
| HISTORIAL-005 | evidence-sufficient | — | Consultar pestaña Medicación |
| HISTORIAL-006 | evidence-sufficient | — | Crear medicación (deshabilitado actual) |
| HISTORIAL-007 | evidence-sufficient | — | Editar medicación |
| HISTORIAL-008 | evidence-sufficient | — | Guardar corrección |
| HISTORIAL-009 | evidence-sufficient | — | Guardar actualización tratamiento |
| HISTORIAL-010 | evidence-sufficient | — | Finalizar tratamiento |
| HISTORIAL-011 | evidence-sufficient | — | Reactivar tratamiento |
| HISTORIAL-012 | evidence-sufficient | — | Consultar historial expandido de medicamento |
| HISTORIAL-013 | evidence-sufficient | — | Retirar referencia sin borrar evidencia |
| HISTORIAL-014 | evidence-sufficient | — | Persistir dosis separada |
| HISTORIAL-015 | evidence-sufficient | — | Persistir frecuencia separada |
| HISTORIAL-016 | evidence-sufficient | — | Persistir prescriptor separado |
| HISTORIAL-017 | evidence-sufficient | — | Persistir fechas y notas separadas |
| ARCHIVOS-001 | evidence-sufficient | — | Consultar pestaña Documentos |
| ARCHIVOS-002 | evidence-sufficient | — | Cargar PDF/JPEG/PNG hasta 20 MiB |
| ARCHIVOS-003 | evidence-sufficient | — | Listar documentos autorizados |
| ARCHIVOS-004 | evidence-sufficient | — | Visualizar documento |
| ARCHIVOS-005 | evidence-sufficient | — | Descargar documento |
| ARCHIVOS-006 | evidence-sufficient | — | Sustituir creando versión |
| ARCHIVOS-007 | concrete-gap | documentary-binding | Consultar versión anterior |
| ARCHIVOS-008 | evidence-sufficient | — | Retirar archivando referencia |
| ARCHIVOS-009 | evidence-sufficient | — | Vincular consentimiento a archivo |
| ARCHIVOS-010 | evidence-sufficient | — | Crear/corregir/revocar consentimiento |
| ARCHIVOS-011 | evidence-sufficient | — | Rechazar formato/tamaño no permitido |
| ARCHIVOS-012 | evidence-sufficient | — | Acceso temporal autorizado por recurso |
| PROGRAMAS-001 | evidence-sufficient | — | Consultar tablero Adquisición |
| PROGRAMAS-002 | evidence-sufficient | — | Consultar tablero Conducta |
| PROGRAMAS-003 | evidence-sufficient | — | Crear adquisición |
| PROGRAMAS-004 | evidence-sufficient | — | Crear conducta |
| PROGRAMAS-005 | evidence-sufficient | — | Abrir diseñador |
| PROGRAMAS-006 | evidence-sufficient | — | Guardar borrador |
| PROGRAMAS-007 | evidence-sufficient | — | Reabrir/editar borrador |
| PROGRAMAS-008 | concrete-gap | documentary-binding | Editar objetivo/antecedente |
| PROGRAMAS-009 | evidence-sufficient | — | Agregar paso |
| PROGRAMAS-010 | concrete-gap | documentary-binding | Editar paso |
| PROGRAMAS-011 | evidence-sufficient | — | Retirar paso |
| PROGRAMAS-012 | evidence-sufficient | — | Reordenar pasos manteniendo ID |
| PROGRAMAS-013 | evidence-sufficient | — | Agregar conjunto |
| PROGRAMAS-014 | concrete-gap | documentary-binding | Editar nombre conjunto |
| PROGRAMAS-015 | evidence-sufficient | — | Retirar conjunto |
| PROGRAMAS-016 | evidence-sufficient | — | Agregar ítem |
| PROGRAMAS-017 | concrete-gap | documentary-binding | Editar ítem |
| PROGRAMAS-018 | evidence-sufficient | — | Retirar ítem |
| PROGRAMAS-019 | concrete-gap | documentary-binding | Editar procedimiento |
| PROGRAMAS-020 | concrete-gap | documentary-binding | Editar ayudas/desvanecimiento |
| PROGRAMAS-021 | concrete-gap | documentary-binding | Editar corrección error |
| PROGRAMAS-022 | concrete-gap | documentary-binding | Editar criterio logro |
| PROGRAMAS-023 | concrete-gap | documentary-binding | Editar generalización/mantención |
| PROGRAMAS-024 | evidence-sufficient | — | Editar topografía/definición operacional |
| PROGRAMAS-025 | evidence-sufficient | — | Editar dimensión actual descriptiva |
| PROGRAMAS-026 | evidence-sufficient | — | Editar precursores |
| PROGRAMAS-027 | evidence-sufficient | — | Seleccionar múltiples funciones |
| PROGRAMAS-028 | evidence-sufficient | — | Editar conducta reemplazo |
| PROGRAMAS-029 | evidence-sufficient | — | Editar plan crisis |
| PROGRAMAS-030 | evidence-sufficient | — | Conservar campos backend adicionales |
| PROGRAMAS-031 | evidence-sufficient | — | Activar versión con confirmación |
| PROGRAMAS-032 | evidence-sufficient | — | Pausar programa |
| PROGRAMAS-033 | evidence-sufficient | — | Reactivar programa |
| PROGRAMAS-034 | evidence-sufficient | — | Marcar logrado con confirmación |
| PROGRAMAS-035 | evidence-sufficient | — | Discontinuar con confirmación |
| PROGRAMAS-036 | evidence-sufficient | — | Crear sucesor de versión publicada |
| PROGRAMAS-037 | concrete-gap | execution-proof | Leer diseño V1 sin inventar estructura |
| PROGRAMAS-038 | evidence-sufficient | — | Cancelar/cerrar diseñador sin completar programa |
| PROGRAMAS-039 | concrete-gap | documentary-binding | Exportar diseño PDF y CSV reales |
| PROGRAMAS-040 | evidence-sufficient | — | Abrir registro |
| PROGRAMAS-041 | evidence-sufficient | — | Abrir gráfico |
| PROGRAMAS-042 | evidence-sufficient | — | Cancelar confirmación de cambio de estado sin persistir ni completar programa |
| SESION-001 | evidence-sufficient | — | Seleccionar programas/versiones |
| SESION-002 | evidence-sufficient | — | Iniciar sesión estudiante |
| SESION-003 | concrete-gap | documentary-binding | Iniciar programa |
| SESION-004 | evidence-sufficient | — | Pausar sesión |
| SESION-005 | evidence-sufficient | — | Reanudar sesión |
| SESION-006 | evidence-sufficient | — | Consultar temporizador activo desde eventos |
| SESION-007 | evidence-sufficient | — | Editar notas sesión |
| SESION-008 | evidence-sufficient | — | Registrar varios bloques por programa |
| SESION-009 | evidence-sufficient | — | Guardar borrador durable |
| SESION-010 | evidence-sufficient | — | Reabrir borrador |
| SESION-011 | evidence-sufficient | — | Enviar captura |
| SESION-012 | concrete-gap | documentary-binding | Descartar/cancelar captura |
| SESION-013 | evidence-sufficient | — | Cerrar modal sin finalizar programa |
| SESION-014 | evidence-sufficient | — | Finalizar sesión con confirmación persistida |
| SESION-015 | evidence-sufficient | — | Cancelar sesión con evento |
| SESION-016 | evidence-sufficient | — | Revisar registro enviado con motivo |
| SESION-017 | evidence-sufficient | — | Reintentar con clave idempotente |
| SESION-018 | evidence-sufficient | — | Mostrar conflicto conservando trabajo |
| SESION-019 | evidence-sufficient | — | Leer captura V1 indicando detalles ausentes |
| PORCENTAJE-001 | evidence-sufficient | — | Configurar fase |
| PORCENTAJE-002 | evidence-sufficient | — | Configurar cantidad ensayos |
| PORCENTAJE-003 | concrete-gap | documentary-binding | Iniciar registro |
| PORCENTAJE-004 | evidence-sufficient | — | Registrar I |
| PORCENTAJE-005 | evidence-sufficient | — | Registrar A |
| PORCENTAJE-006 | evidence-sufficient | — | Registrar E |
| PORCENTAJE-007 | evidence-sufficient | — | Registrar NR explícito |
| PORCENTAJE-008 | evidence-sufficient | — | Mantener ensayo sin registrar como null |
| PORCENTAJE-009 | evidence-sufficient | — | Seleccionar ayuda física total |
| PORCENTAJE-010 | evidence-sufficient | — | Seleccionar ayuda física parcial |
| PORCENTAJE-011 | evidence-sufficient | — | Seleccionar gestual |
| PORCENTAJE-012 | evidence-sufficient | — | Seleccionar sombra |
| PORCENTAJE-013 | evidence-sufficient | — | Seleccionar modelado |
| PORCENTAJE-014 | evidence-sufficient | — | Seleccionar ecoica total |
| PORCENTAJE-015 | evidence-sufficient | — | Seleccionar ecoica parcial |
| PORCENTAJE-016 | evidence-sufficient | — | Seleccionar verbal total |
| PORCENTAJE-017 | evidence-sufficient | — | Seleccionar verbal parcial |
| PORCENTAJE-018 | evidence-sufficient | — | Seleccionar ayuda no específica |
| PORCENTAJE-019 | evidence-sufficient | — | Registrar ayudas estímulo |
| PORCENTAJE-020 | evidence-sufficient | — | Conservar timestamps y notas |
| PORCENTAJE-021 | evidence-sufficient | — | Volver a configurar sin pérdida silenciosa |
| PORCENTAJE-022 | evidence-sufficient | — | Guardar sin finalizar programa |
| PORCENTAJE-023 | evidence-sufficient | — | Derivar I/(I+A+E+NR) excluyendo sin registrar |
| FRECUENCIA-001 | evidence-sufficient | — | Registrar evento con ID/tiempo |
| FRECUENCIA-002 | evidence-sufficient | — | Deshacer evento conservando edición/revisión |
| FRECUENCIA-003 | evidence-sufficient | — | Iniciar tiempo observado |
| FRECUENCIA-004 | evidence-sufficient | — | Pausar observación |
| FRECUENCIA-005 | evidence-sufficient | — | Reanudar observación |
| FRECUENCIA-006 | evidence-sufficient | — | Cerrar ventana activa |
| FRECUENCIA-007 | evidence-sufficient | — | Guardar frecuencia |
| FRECUENCIA-008 | evidence-sufficient | — | Derivar eventos por minuto excluyendo pausas |
| INTERVALOS-001 | concrete-gap | documentary-binding | Configurar fase |
| INTERVALOS-002 | evidence-sufficient | — | Configurar método total/parcial/momentáneo |
| INTERVALOS-003 | evidence-sufficient | — | Configurar duración/cantidad |
| INTERVALOS-004 | concrete-gap | documentary-binding | Iniciar intervalos |
| INTERVALOS-005 | evidence-sufficient | — | Registrar positivo |
| INTERVALOS-006 | evidence-sufficient | — | Registrar negativo |
| INTERVALOS-007 | evidence-sufficient | — | Conservar no observado null |
| INTERVALOS-008 | evidence-sufficient | — | Conservar tiempos originales |
| INTERVALOS-009 | evidence-sufficient | — | Guardar cobertura incompleta visible |
| INTERVALOS-010 | evidence-sufficient | — | Derivar positivos/observados |
| DURACION-001 | evidence-sufficient | — | Iniciar episodio |
| DURACION-002 | evidence-sufficient | — | Cerrar episodio |
| DURACION-003 | evidence-sufficient | — | Capturar múltiples episodios |
| DURACION-004 | evidence-sufficient | — | Guardar/reabrir episodio abierto |
| DURACION-005 | evidence-sufficient | — | Mostrar episodios abiertos aparte |
| DURACION-006 | evidence-sufficient | — | Derivar total/promedio episodios cerrados |
| LATENCIA-001 | evidence-sufficient | — | Registrar antecedente y tiempo |
| LATENCIA-002 | evidence-sufficient | — | Registrar respuesta y tiempo |
| LATENCIA-003 | evidence-sufficient | — | Cerrar ensayo sin respuesta explícitamente |
| LATENCIA-004 | evidence-sufficient | — | Guardar/reabrir ensayo pendiente |
| LATENCIA-005 | evidence-sufficient | — | Capturar múltiples ensayos |
| LATENCIA-006 | evidence-sufficient | — | Derivar promedio respuestas observadas |
| LATENCIA-007 | evidence-sufficient | — | Mostrar sin respuesta y pendientes aparte |
| RESULTADOS-001 | concrete-gap | documentary-binding | Filtrar fecha |
| RESULTADOS-002 | concrete-gap | documentary-binding | Filtrar profesional |
| RESULTADOS-003 | concrete-gap | documentary-binding | Filtrar fase |
| RESULTADOS-004 | concrete-gap | documentary-binding | Consultar series |
| RESULTADOS-005 | concrete-gap | documentary-binding | Consultar tabla registros |
| RESULTADOS-006 | concrete-gap | documentary-binding | Consultar notas |
| RESULTADOS-007 | evidence-sufficient | — | Editar notas con revisión |
| RESULTADOS-008 | evidence-sufficient | — | Crear meta |
| RESULTADOS-009 | evidence-sufficient | — | Editar meta |
| RESULTADOS-010 | evidence-sufficient | — | Cancelar modal meta |
| RESULTADOS-011 | evidence-sufficient | — | Guardar meta persistida |
| RESULTADOS-012 | concrete-gap | documentary-binding | Consultar correcciones trazables |
| RESULTADOS-013 | concrete-gap | documentary-binding | Exportar resultados PDF real |
| RESULTADOS-014 | concrete-gap | documentary-binding | Exportar resultados CSV real |
| RESULTADOS-015 | evidence-sufficient | — | Volver a programas |
| RESULTADOS-016 | concrete-gap | documentary-binding | No mezclar unidades |
| RESULTADOS-017 | concrete-gap | documentary-binding | No interpretar automáticamente subida como mejora |
| EQUIPO-001 | evidence-sufficient | — | Consultar equipo clínica activa |
| EQUIPO-002 | evidence-sufficient | — | Invitar profesional |
| EQUIPO-003 | evidence-sufficient | — | Reenviar invitación clínica idempotente |
| EQUIPO-004 | evidence-sufficient | — | Editar datos profesionales según permiso |
| EQUIPO-005 | evidence-sufficient | — | Cambiar perfil profesional |
| EQUIPO-006 | evidence-sufficient | — | Suspender membresía |
| EQUIPO-007 | evidence-sufficient | — | Reactivar membresía |
| EQUIPO-008 | evidence-sufficient | — | Crear asignación ficha |
| EQUIPO-009 | evidence-sufficient | — | Modificar/suspender asignación |
| EQUIPO-010 | concrete-gap | documentary-binding | Restringir admin a su clínica |
| COMPARTIR-001 | evidence-sufficient | — | Pestaña Compartir |
| COMPARTIR-002 | evidence-sufficient | — | Seleccionar ficha |
| COMPARTIR-003 | evidence-sufficient | — | Abrir modal compartir |
| COMPARTIR-004 | evidence-sufficient | — | Seleccionar externo/correo |
| COMPARTIR-005 | evidence-sufficient | — | Seleccionar nivel lectura completa |
| COMPARTIR-006 | evidence-sufficient | — | Seleccionar nivel programas/resultados identificación mínima |
| COMPARTIR-007 | evidence-sufficient | — | Seleccionar nivel edición clínica por ficha |
| COMPARTIR-008 | evidence-sufficient | — | Redactar mensaje |
| COMPARTIR-009 | evidence-sufficient | — | Aplicar plantilla mensaje |
| COMPARTIR-010 | evidence-sufficient | — | Enviar invitación |
| COMPARTIR-011 | evidence-sufficient | — | Cancelar/cerrar modal |
| COMPARTIR-012 | evidence-sufficient | — | Bandeja enviados |
| COMPARTIR-013 | evidence-sufficient | — | Ver detalle invitación |
| COMPARTIR-014 | evidence-sufficient | — | Cancelar invitación pendiente |
| COMPARTIR-015 | evidence-sufficient | — | Reenviar idempotente |
| COMPARTIR-016 | evidence-sufficient | — | Bandeja recibidos |
| COMPARTIR-017 | evidence-sufficient | — | Aceptar idempotente sin membresía general |
| COMPARTIR-018 | evidence-sufficient | — | Rechazar |
| COMPARTIR-019 | evidence-sufficient | — | Abrir ficha aceptada |
| COMPARTIR-020 | evidence-sufficient | — | Pestaña accesos activos |
| COMPARTIR-021 | evidence-sufficient | — | Modificar nivel |
| COMPARTIR-022 | evidence-sufficient | — | Cancelar modificación |
| COMPARTIR-023 | evidence-sufficient | — | Guardar modificación |
| COMPARTIR-024 | evidence-sufficient | — | Abrir revocación |
| COMPARTIR-025 | evidence-sufficient | — | Cancelar revocación |
| COMPARTIR-026 | evidence-sufficient | — | Confirmar revocación |
| COMPARTIR-027 | evidence-sufficient | — | Pendiente sin acceso |
| COMPARTIR-028 | evidence-sufficient | — | Externo sin administración/facturación/delegación |
| FAMILIA-001 | concrete-gap | documentary-binding | Vincular identidad familiar estable |
| FAMILIA-002 | evidence-sufficient | — | Invitar familiar |
| FAMILIA-003 | evidence-sufficient | — | Publicar programas seleccionados |
| FAMILIA-004 | evidence-sufficient | — | Publicar resultados seleccionados |
| FAMILIA-005 | evidence-sufficient | — | Publicar documentos seleccionados |
| FAMILIA-006 | evidence-sufficient | — | Crear sucesor manifiesto |
| FAMILIA-007 | evidence-sufficient | — | Consultar solo manifiesto publicado |
| FAMILIA-008 | evidence-sufficient | — | Consultar agenda autorizada |
| FAMILIA-010 | evidence-sufficient | — | Revocar acceso familiar |
| FAMILIA-011 | evidence-sufficient | — | No leer tablas clínicas generales |
| NOTIFICACIONES-001 | evidence-sufficient | — | Abrir campana |
| NOTIFICACIONES-002 | evidence-sufficient | — | Consultar leídas/no leídas |
| NOTIFICACIONES-003 | evidence-sufficient | — | Marcar leída |
| NOTIFICACIONES-004 | evidence-sufficient | — | Marcar no leída |
| NOTIFICACIONES-005 | evidence-sufficient | — | Navegar recurso autorizado |
| NOTIFICACIONES-006 | evidence-sufficient | — | Recibir actualización Realtime |
| NOTIFICACIONES-007 | evidence-sufficient | — | Recuperar tras reconexión |
| NOTIFICACIONES-008 | evidence-sufficient | — | Recordatorios locales |
| AGENDA-001 | evidence-sufficient | — | Vista calendario |
| AGENDA-002 | evidence-sufficient | — | Vista listado |
| AGENDA-003 | evidence-sufficient | — | Crear cita |
| AGENDA-004 | evidence-sufficient | — | Editar cita |
| AGENDA-005 | evidence-sufficient | — | Reprogramar cita |
| AGENDA-006 | evidence-sufficient | — | Cancelar cita |
| AGENDA-007 | evidence-sufficient | — | Seleccionar participantes |
| AGENDA-008 | evidence-sufficient | — | Configurar recordatorio |
| AGENDA-009 | evidence-sufficient | — | Recurrencia semanal |
| AGENDA-010 | evidence-sufficient | — | Gestionar ocurrencia vs serie |
| AGENDA-011 | evidence-sufficient | — | Mostrar zona America/Santiago |
| AGENDA-012 | evidence-sufficient | — | Vincular sesión realizada |
| OFFLINE-001 | concrete-gap | documentary-binding | Instalar PWA |
| OFFLINE-002 | evidence-sufficient | — | Elegir ficha para descarga |
| OFFLINE-003 | evidence-sufficient | — | Elegir documentos para descarga |
| OFFLINE-004 | evidence-sufficient | — | Consultar ficha sin conexión |
| OFFLINE-005 | concrete-gap | documentary-binding | Capturar sesión offline |
| OFFLINE-006 | evidence-sufficient | — | Recuperar captura tras recarga |
| OFFLINE-007 | evidence-sufficient | — | Mostrar pendiente vs guardado servidor |
| OFFLINE-008 | evidence-sufficient | — | Sincronizar por dependencia |
| OFFLINE-009 | evidence-sufficient | — | Reintentar idempotente |
| OFFLINE-010 | concrete-gap | documentary-binding | Revalidar permisos al reconectar |
| OFFLINE-011 | concrete-gap | documentary-binding | Mostrar conflicto |
| OFFLINE-012 | concrete-gap | documentary-binding | Resolver conflicto explícitamente |
| OFFLINE-013 | concrete-gap | documentary-binding | Conservar captura rechazada por revocación |
| OFFLINE-014 | concrete-gap | documentary-binding | Bloquear caché anterior al cambiar usuario |
| OFFLINE-015 | concrete-gap | documentary-binding | Advertir pendientes al logout |
| OFFLINE-016 | concrete-gap | execution-proof | Descarte explícito de pendientes |
| OFFLINE-017 | evidence-sufficient | — | Quitar descarga seleccionada |
| COMERCIAL-001 | evidence-sufficient | — | Consultar catálogo |
| COMERCIAL-002 | evidence-sufficient | — | Consultar plan vigente |
| COMERCIAL-003 | evidence-sufficient | — | Consultar plazas |
| COMERCIAL-004 | evidence-sufficient | — | Abrir upgrade |
| COMERCIAL-005 | evidence-sufficient | — | Seleccionar plan |
| COMERCIAL-006 | evidence-sufficient | — | Solicitar cambio suscripción |
| COMERCIAL-007 | evidence-sufficient | — | Confirmar cambio interno |
| COMERCIAL-008 | evidence-sufficient | — | Cancelar suscripción |
| COMERCIAL-009 | evidence-sufficient | — | Consultar documentos comerciales internos |
| COMERCIAL-010 | evidence-sufficient | — | Identificar importes demostración |
| COMERCIAL-011 | concrete-gap | documentary-binding | No emitir documentos tributarios |
| COMERCIAL-012 | concrete-gap | documentary-binding | No procesar cobros |
| SOPORTE-001 | evidence-sufficient | — | Abrir ayuda (decorativo actual) |
| SOPORTE-002 | evidence-sufficient | — | Abrir contacto (decorativo actual) |
| SOPORTE-003 | evidence-sufficient | — | Crear ticket local |
| SOPORTE-004 | evidence-sufficient | — | Consultar seguimiento ticket |
| SOPORTE-005 | evidence-sufficient | — | Responder ticket según permiso |
| SOPORTE-006 | evidence-sufficient | — | Cambiar estado ticket |
| SOPORTE-007 | concrete-gap | documentary-binding | Crear solicitud comercial |
| SOPORTE-008 | evidence-sufficient | — | Navegar secciones landing |
| SOPORTE-009 | evidence-sufficient | — | CTA login |
| SOPORTE-010 | evidence-sufficient | — | CTA conocer más (decorativo actual) |
| SOPORTE-011 | concrete-gap | documentary-binding | Retirar promesa IA disponible |
| SOPORTE-012 | concrete-gap | documentary-binding | Retirar atención humana 24/7 |
| ESTADOS-001 | concrete-gap | documentary-binding | Mostrar carga |
| ESTADOS-002 | concrete-gap | documentary-binding | Mostrar vacío |
| ESTADOS-003 | concrete-gap | documentary-binding | Mostrar error recuperable |
| ESTADOS-004 | concrete-gap | documentary-binding | Reintentar error |
| ESTADOS-005 | evidence-sufficient | — | Mostrar no encontrado |
| ESTADOS-006 | concrete-gap | documentary-binding | Mostrar acceso no disponible sin filtrar datos |
| ESTADOS-007 | evidence-sufficient | — | Volver atrás |
| ESTADOS-008 | concrete-gap | documentary-binding | Volver dashboard |
| OPERACION-001 | concrete-gap | documentary-binding | Arranque conservando volúmenes |
| OPERACION-002 | concrete-gap | documentary-binding | Consultar estado/salud |
| OPERACION-003 | concrete-gap | documentary-binding | Parada conservando volúmenes |
| OPERACION-004 | concrete-gap | documentary-binding | Fixtures dos clínicas y perfiles |
| OPERACION-005 | concrete-gap | documentary-binding | Utilidad exclusivamente local transición perfiles |
| OPERACION-006 | concrete-gap | documentary-binding | Credenciales fuera Git |
| OPERACION-007 | concrete-gap | documentary-binding | Browser URL vs URL contenedor |
| OPERACION-008 | concrete-gap | documentary-binding | Node22 y lockfile |
| OPERACION-009 | concrete-gap | documentary-binding | Compose desarrollo Next |
| OPERACION-010 | concrete-gap | documentary-binding | Mailpit verificable |
| OPERACION-011 | evidence-sufficient | — | Limpieza explícita por lote |
| OPERACION-012 | concrete-gap | candidate-renewal | Backup/restore destino local aislado |
| SHELL-013 | concrete-gap | documentary-binding | Registrar retiro de simulación de rol del shell; utilidad secuencial exclusivamente local |
| FICHA-025 | evidence-sufficient | — | Abrir/cerrar menú de acciones de tarjeta |
| FICHA-026 | evidence-sufficient | — | Cancelar/cerrar alta sin crear ficha |
| FICHA-027 | evidence-sufficient | — | Informar y editar fecha de nacimiento separada |
| FICHA-028 | evidence-sufficient | — | Seleccionar Otro diagnóstico y editar especificación libre/autocompletada |
| FICHA-029 | evidence-sufficient | — | Buscar por diagnóstico reportado como en lista original |
| FICHA-030 | evidence-sufficient | — | Conservar información de tarjeta: sesión activa, acceso familiar, diagnóstico y profesional asignado |
| HISTORIAL-018 | evidence-sufficient | — | Informar nombre de medicamento separado de dosis y frecuencia |
| HISTORIAL-019 | evidence-sufficient | — | Cancelar/cerrar modal de medicación sin guardar ni finalizar tratamiento |
| COMERCIAL-013 | evidence-sufficient | — | Cerrar modal upgrade sin cambiar suscripción |
| SOPORTE-013 | evidence-sufficient | — | Abrir/cerrar menú de soporte |
| SOPORTE-014 | evidence-sufficient | — | Adaptar acceso original chat de soporte a tickets locales sin prometer atención instantánea |
| SHELL-014 | evidence-sufficient | — | Editar email profesional con verificación Auth; no confundir perfil con identidad de login |
| SHELL-015 | evidence-sufficient | — | Editar teléfono profesional |
| SHELL-016 | evidence-sufficient | — | Cancelar selector sin guardar perfil |
| SHELL-017 | evidence-sufficient | — | Cambiar categoría de avatar y previsualizar opciones locales |
| IDENTIDAD-009 | evidence-sufficient | — | Volver a landing desde marca original |
| IDENTIDAD-010 | evidence-sufficient | — | Control original GitHub retirado: resolver disponibilidad de proveedor sin login simulado |
| IDENTIDAD-011 | evidence-sufficient | — | Control original Facebook retirado: resolver disponibilidad de proveedor sin login simulado |
| IDENTIDAD-012 | evidence-sufficient | — | Consultar términos desde enlace original |
| IDENTIDAD-013 | evidence-sufficient | — | Consultar privacidad desde enlace original |
| IDENTIDAD-014 | evidence-sufficient | — | Registrar retiro de acceso rápido simulado; usar cuentas sintéticas autenticadas exclusivamente en local |
| PROGRAMAS-043 | concrete-gap | documentary-binding | Resolver icono de configuración decorativo sin acción (no asignarle comando ficticio) |
| PROGRAMAS-044 | concrete-gap | documentary-binding | Editar nombre/título de programa explícitamente en diseñadores y configuración |
| PROGRAMAS-045 | evidence-sufficient | — | Reiniciar/descartar configuración con aviso de pérdida y sin persistir |
| PROGRAMAS-046 | evidence-sufficient | — | Filtrar tableros por Activos/Logrados/Pausa/Todos, conservando semántica del estado |
| PROGRAMAS-047 | concrete-gap | documentary-binding | Clasificar iconos de encabezado como decorativos/no interactivos |
| PROGRAMAS-048 | concrete-gap | documentary-binding | Resolver menú de más opciones de tableros huérfanos (hoy sin handler) |
| PORCENTAJE-024 | concrete-gap | documentary-binding | Clasificar número de ensayo en ActionIcon como indicador no accionable |
| PORCENTAJE-025 | evidence-sufficient | — | Reiniciar todos los ensayos con confirmación de pérdida y preservar revisión/idempotencia |
| RESULTADOS-018 | evidence-sufficient | — | Configurar mínimo/máximo eje Y y validar rango/unidad del gráfico |
| RESULTADOS-019 | evidence-sufficient | — | Cerrar vista ampliada del gráfico sin alterar filtros ni datos |
| SESION-020 | evidence-sufficient | — | Seleccionar/cambiar dimensión del capturador/configuración sin perder registro existente; no confundir con dimensión actual descriptiva |
| EQUIPO-011 | evidence-sufficient | — | Buscar miembros del equipo por datos profesionales autorizados |
| EQUIPO-012 | evidence-sufficient | — | Filtrar equipo por perfil profesional |
| EQUIPO-013 | evidence-sufficient | — | Cerrar edición de miembro/perfil profesional sin guardar cambios |
| SOPORTE-015 | evidence-sufficient | — | Volver al inicio de landing desde la marca |
| COMPARTIR-029 | evidence-sufficient | — | Cerrar detalles de invitación sin modificar acceso |
| COMPARTIR-030 | evidence-sufficient | — | Resolver aprobación de solicitud por propietario clínico distinta de aceptación de invitación por externo |
| COMPARTIR-031 | evidence-sufficient | — | Resolver denegación de solicitud por propietario clínico distinta de rechazo de invitación por externo |
| IDENTIDAD-015 | concrete-gap | documentary-binding | Volver a login desde recuperación/cambio contraseña (además de comandos Auth ya inventariados) |
| ESTADOS-009 | concrete-gap | documentary-binding | Cerrar alerta de error sin confirmar ni reintentar mutación |
| FICHA-031 | evidence-sufficient | — | Cancelar/cerrar confirmación de archivo o reactivación sin cambiar ficha |
| FICHA-032 | evidence-sufficient | — | Editar iniciales explícitas separadas de nombre, RUT e identificador clínico |
| FICHA-033 | evidence-sufficient | — | Editar idioma principal de ficha |
| FICHA-034 | evidence-sufficient | — | Editar convivencia de ficha separada de adaptaciones del hogar |
| FICHA-035 | evidence-sufficient | — | Retirar responsable/contacto manteniendo identidad histórica y asociaciones |
| PROGRAMAS-049 | evidence-sufficient | — | Expandir/contraer detalle de diseño de versión sin editarla |
| SESION-021 | concrete-gap | documentary-binding | Inventariar edición agregada V1: true/false, deshacer ensayo, total de eventos y duración manual, sin convertir false en E/A/NR ni fingir cronómetro |
| SESION-022 | evidence-sufficient | — | Archivar sesión existente conservando resultados; no confundir con cancelar o finalizar |
| SOPORTE-016 | evidence-sufficient | — | Resolver destino local de Documentación de landing o indicar no disponible |
| SOPORTE-017 | concrete-gap | documentary-binding | Resolver enlaces sociales decorativos sin inventar destinos; presentar no interactivos si no configurados |
| SOPORTE-018 | concrete-gap | documentary-binding | Conservar tarjetas informativas sin affordance de clic ficticia o definir destino explícito |
| PORCENTAJE-026 | concrete-gap | execution-proof | Abrir/cerrar menú de ayudas sin alterar respuesta ni guardar |

El JSON adjunto conserva404 filas, rutas, contratos, persistencia, aserciones originales, límites, referencias con existencia y SHA256. No se interpreta una fuente de suite como demostración autónoma de ejecución. Para las brechas documentales root debe completar el vínculo exacto antes de elevar estado.
