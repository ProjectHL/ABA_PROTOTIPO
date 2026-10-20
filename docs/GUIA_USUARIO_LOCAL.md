# Guía de usuario — release local ABA

Fecha: 2026-09-21. Esta guía describe la interfaz integrada del release local. No reemplaza los protocolos clínicos de la organización ni acredita QA R5.

## Ingreso y contexto

1. Abra `http://localhost:3000` únicamente después de que el operador confirme el estado del entorno local.
2. Inicie sesión con una cuenta autorizada. No comparta credenciales ni use secretos de servidor en el navegador.
3. Seleccione la clínica activa en el shell cuando tenga más de un contexto disponible. Un profesional externo o familiar sólo verá recursos específicos previamente autorizados; eso no crea una membresía general de clínica.
4. Si aparece “Permisos pendientes de revalidación”, vuelva a consultar antes de enviar cambios. La interfaz no debe afirmar éxito desde ese estado.

## Navegación clínica

- **Dashboard:** resume fichas, sesiones, programas y actividad que la identidad actual puede leer.
- **Mi Equipo:** administra perfiles, invitaciones y asignaciones sólo cuando el rol lo permite.
- **Carpetas de Estudiantes:** crea y consulta fichas, historial, personas, documentos, fotografía, programas y acceso familiar según capacidades vigentes.
- **Agenda:** crea, reprograma o cancela citas y vincula sesiones finalizadas.
- **Accesos Compartidos:** invita profesionales externos, acepta o rechaza invitaciones recibidas y administra accesos activos por ficha.
- **Portal Familiar:** presenta únicamente las publicaciones y citas autorizadas para la identidad familiar activa.

El chat profesional, familiar y sus adjuntos no forman parte de este release. No hay acceso de navegación y `/chat` responde como página no disponible. Su código y persistencia se conservan para un upgrade posterior.

## Ficha, programas y sesiones

Guarde cada panel antes de abandonar la ficha. Si una operación queda con resultado desconocido, use el reintento ofrecido: conserva los mismos identificadores y evita duplicar cambios.

Los programas conservan versiones. Publicar no reemplaza silenciosamente una revisión concurrente. Desde una sesión puede registrar porcentaje, frecuencia, intervalos, duración o latencia; cambiar de dimensión crea otra captura y no convierte observaciones previas. Finalizar, cancelar o archivar una sesión requiere confirmación explícita.

Los gráficos y exportaciones usan registros sometidos y autorizados. Las dimensiones no se mezclan; revise filtros, unidad y escala antes de interpretar o exportar resultados.

El diseñador permite descargar PDF o CSV del borrador visible, sin guardarlo ni publicarlo. El CSV conserva campos estructurados y contexto de versión; no equivale a resultados clínicos ni a un archivo de importación validado.

En Dashboard, filtre logros por estudiante y semana/mes; compare sesiones realizadas de hasta diez estudiantes por semana/mes/año. La ampliación conserva los filtros. Los periodos son calendario UTC, anclados a la fecha de generación del snapshot; el periodo actual es parcial. La actividad agregada de 7/30/90 días permanece disponible. Si falla el refresco, los datos anteriores no deben interpretarse como una lectura actualizada.

## Campana y recordatorios locales

La campana reúne las notificaciones del usuario entre clínicas. Abrir un recurso
vuelve a comprobar sus permisos; recibir una notificación no concede acceso.
Puede marcar como leída o no leída. Si el resultado queda desconocido, use
«Recuperar recibo» antes de navegar o cambiar de contexto.

Los recordatorios vencidos se materializan al consultar la campana, recuperar
conexión/foco y periódicamente mientras la aplicación está visible y conectada.
Son avisos dentro de ABA, no correo ni notificaciones del sistema operativo.
No se garantiza entrega mientras la aplicación está cerrada. Una confirmación de
lectura sigue siendo válida aunque falle el refresco posterior.

## Documentos y trabajo sin conexión

Las descargas usan autorizaciones temporales y versiones exactas. Guardar una ficha para uso offline es una acción explícita y queda aislada por usuario, clínica y ficha. Los documentos se guardan offline de forma individual después de descargar la ficha.

El indicador offline distingue:

- cambios pendientes de envío;
- conflictos que requieren revisión humana;
- comandos confirmados por recibo del servidor.

No interprete un dato guardado en el dispositivo como sincronizado. Ante un conflicto, compare la versión actual y el cambio local; resolverlo crea una operación nueva y conserva la anterior como reemplazada. Antes de retirar una descarga debe sincronizar o descartar explícitamente sus operaciones pendientes.

## Salida segura y errores

La aplicación puede impedir navegar, cambiar de clínica o cerrar sesión cuando existe un formulario o comando pendiente. Resuélvalo primero. Si decide salir con cola offline pendiente, los datos quedan bloqueados para otras identidades y no se descartan automáticamente.

Los avisos de error no significan que un cambio haya sido confirmado. Use **Reintentar** o vuelva a leer el recurso. Cerrar una alerta sólo oculta el mensaje; no ejecuta una mutación.

## Alcance todavía pendiente

Las solicitudes internas (`COMPARTIR-030/031`) tienen bandeja y decisiones V2: solicitar acceso y aprobar/denegar por el propietario son acciones distintas de aceptar/rechazar una invitación externa. Consulte motivo, alcance, vigencia y resultado confirmado antes de continuar.

En el portal familiar, **Descargar documento** comprueba vínculo activo y versión publicada antes de cada descarga. No concede lectura de toda la ficha ni crea acceso offline familiar. Si el vínculo fue revocado o la publicación cambió, vuelva a consultar el portal; no reutilice un enlace anterior. Los archivos ya descargados no pueden retirarse del dispositivo por una revocación posterior.

La integración sigue en revisión R3/R4; la aceptación funcional y los recorridos de prueba pertenecen a R5. No se hereda aprobación de informes anteriores.

Para incidencias use **Ayuda** y **Contacto** desde el shell. No incluya datos clínicos innecesarios en el ticket.
