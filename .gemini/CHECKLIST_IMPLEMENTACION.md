# Checklist de Implementación: Accesos Compartidos

**Fecha**: 2026-02-01  
**Decisiones Tomadas**: ✅

---

## 📋 Decisiones Clave

1. **Revocar acceso**: Eliminar registro + toast "Acceso removido satisfactoriamente"
2. **Reenviar**: Crear NUEVA invitación (nuevo ID, mantener historial)
3. **Duplicados rejected**: Usar botón "Reenviar" específicamente
4. **Botón Compartir**: En menú de 3 puntos (dropdown)
5. **Accesos Activos**: Agrupados por estudiante (acordeón)
6. **Cancelar**: Eliminar completamente el registro
7. **Mensaje**: Textarea con sugerencias/plantillas predefinidas
8. **Notificaciones**: Hasta que usuario cierre manualmente
9. **Datos Mock**: 10-15 ejemplos para probar paginación
10. **Prioridad**: Modal de compartir primero (FASE 2)

---

## ✅ FASE 1: DTOs y Datos Mock

### Tarea 1.1: Actualizar `invitationsData.ts`
- [x] Renombrar `AccessInvitation` → `SharedAccess`
- [x] Actualizar interface con campos nuevos
- [x] Crear función generadora de datos mock
- [x] Generar 10-15 ejemplos:
  - [x] 4-5 con status `pending`
  - [x] 6-8 con status `accepted`
  - [x] 2-3 con status `rejected`
- [x] Actualizar exports

**Archivo**: `src/api/invitationsData.ts` ✅

---

## ✅ FASE 2: Modal de Compartir (PRIORIDAD)

### Tarea 2.1: Crear `ShareStudentModal.tsx`
- [x] Crear componente modal
- [x] Campo: Email (TextInput con validación)
- [x] Campo: Nivel de acceso (Select)
- [x] Campo: Mensaje (Textarea con plantillas)
- [x] Implementar plantillas sugeridas:
  - [x] "Solicito tu colaboración para..."
  - [x] "Necesito tu apoyo profesional en..."
  - [x] "Te comparto acceso para coordinación..."
- [x] Validaciones:
  - [x] Email no vacío
  - [x] Email formato válido
  - [x] Nivel seleccionado
  - [x] Verificar duplicados (pending/accepted)
- [x] Botones: Cancelar / Enviar Invitación
- [x] Notificación manual: "Invitación enviada a [email]"
- [x] Limpiar formulario al cerrar

**Archivo**: `src/features/students/ShareStudentModal.tsx` ✅

---

### Tarea 2.2: Crear `ShareButton.tsx`
- [x] Botón para menú dropdown (no standalone)
- [x] Ícono de compartir
- [x] Props: studentId, studentName
- [x] Integrar con ShareStudentModal
- [x] Manejar estado del modal

**Archivo**: `src/features/students/ShareButton.tsx` ✅

---

### Tarea 2.3: Actualizar `StudentsList.tsx`
- [x] Agregar opción "Compartir" en menú de 3 puntos
- [x] Integrar ShareButton en dropdown
- [x] Verificar que no rompa diseño

**Archivo**: `src/features/students/StudentsList.tsx` ✅

---

### Tarea 2.4: Actualizar `StudentsPage.tsx`
- [x] Agregar opción "Compartir" en menú de acciones
- [x] Integrar ShareButton
- [x] Verificar que no rompa diseño

**Archivo**: `src/pages/StudentsPage.tsx` ✅ (via StudentDetail.tsx)

---

## ✅ FASE 3: Página Accesos Compartidos

### Tarea 3.1: Renombrar y Reestructurar
- [x] Renombrar archivo: `InvitationsPage.tsx` → `SharedAccessPage.tsx`
- [x] Renombrar componente
- [x] Cambiar título: "Accesos Compartidos"
- [x] Eliminar lógica de "solicitudes recibidas"
- [x] Implementar Tabs (Mantine):
  - [x] Tab 1: "Invitaciones Enviadas"
  - [x] Tab 2: "Accesos Activos"

**Archivo**: `src/pages/SharedAccessPage.tsx` ✅

---

### Tarea 3.2: Tab "Invitaciones Enviadas"
- [x] Tabla con todas las invitaciones
- [x] Columnas:
  - [x] Profesional (email + nombre)
  - [x] Estudiante
  - [x] Tipo de Acceso (badge)
  - [x] Estado (badge con colores)
  - [x] Fecha de Envío
  - [x] Acciones
- [x] Acciones condicionales:
  - [x] Ver Detalles (siempre)
  - [x] Cancelar (solo si pending) → Eliminar registro
  - [x] Reenviar (solo si rejected) → Crear nueva invitación
- [x] Modal de detalles
- [x] Notificaciones manuales:
  - [x] "Invitación cancelada"
  - [x] "Invitación reenviada"

**Completado** ✅

---

### Tarea 3.3: Tab "Accesos Activos"
- [x] Filtrar solo status = `accepted`
- [x] Agrupar por estudiante (Accordion de Mantine)
- [x] Por cada estudiante mostrar:
  - [x] Nombre del estudiante (header del acordeón)
  - [x] Cantidad de profesionales con acceso
- [x] Al expandir mostrar tabla:
  - [x] Profesional (avatar + nombre + título)
  - [x] Tipo de Acceso (badge)
  - [x] Fecha de Aceptación
  - [x] Acciones
- [x] Acciones:
  - [x] Cambiar Acceso (modal)
  - [x] Revocar Acceso (confirmación → eliminar)
- [x] Notificaciones manuales:
  - [x] "Nivel de acceso actualizado"
  - [x] "Acceso removido satisfactoriamente"

**Completado** ✅

---

### Tarea 3.4: Modal "Cambiar Nivel de Acceso"
- [x] Título: "Cambiar Nivel de Acceso"
- [x] Mostrar nivel actual
- [x] Select con 3 opciones
- [x] Botones: Cancelar / Guardar
- [x] Actualizar accessLevel en el registro
- [x] Notificación manual de éxito

**Completado** ✅

---

### Tarea 3.5: Modal "Confirmar Revocar"
- [x] Título: "Revocar Acceso"
- [x] Mensaje: "¿Estás seguro de revocar el acceso de [Profesional] a [Estudiante]?"
- [x] Advertencia: "Esta acción no se puede deshacer"
- [x] Botones: Cancelar / Revocar (rojo)
- [x] Al confirmar: Eliminar registro completamente
- [x] Notificación manual: "Acceso removido satisfactoriamente"
- [x] Actualizar tabla automáticamente

**Completado** ✅

---

## ✅ FASE 4: Navegación

### Tarea 4.1: Actualizar `MainLayout.tsx`
- [x] Cambiar label: "Invitaciones" → "Accesos Compartidos"
- [x] Cambiar path: `/invitations` → `/shared-access`
- [x] Mantener ícono FileCheck

**Archivo**: `src/components/MainLayout.tsx` ✅

---

### Tarea 4.2: Actualizar `App.tsx`
- [x] Actualizar import: `SharedAccessPage`
- [x] Actualizar ruta: `/shared-access`

**Archivo**: `src/App.tsx` ✅

---

## ✅ FASE 5: Validaciones y Lógica

### Tarea 5.1: Validaciones en ShareStudentModal
- [ ] Email no vacío
- [ ] Email formato válido (regex)
- [ ] Nivel de acceso seleccionado
- [ ] Verificar duplicados:
  - [ ] Si existe `pending`: Error "Ya existe una invitación pendiente"
  - [ ] Si existe `accepted`: Error "Este profesional ya tiene acceso"
  - [ ] Si existe `rejected`: Deshabilitar botón "Enviar", mostrar "Use el botón Reenviar en la tabla"

---

### Tarea 5.2: Sistema de Notificaciones
- [ ] Configurar notificaciones para cerrar manualmente
- [ ] Implementar todas las notificaciones:
  - [ ] ✅ "Invitación enviada a [email]" (verde)
  - [ ] 🟠 "Invitación cancelada" (naranja)
  - [ ] 🔵 "Invitación reenviada" (azul)
  - [ ] ✅ "Nivel de acceso actualizado" (verde)
  - [ ] 🔴 "Acceso removido satisfactoriamente" (rojo)
  - [ ] ⚠️ "Ya existe una invitación pendiente" (amarillo)
  - [ ] ⚠️ "Este profesional ya tiene acceso" (amarillo)

---

## ✅ FASE 6: Documentación

### Tarea 6.1: Actualizar `REPORT.md`
- [ ] Agregar entrada de fecha 2026-02-01
- [ ] Documentar cambio de flujo
- [ ] Listar archivos creados
- [ ] Listar archivos modificados
- [ ] Explicar impacto

---

## 📊 Progreso

- **Total Tareas**: 6 Fases
- **Completadas**: 0
- **En Progreso**: 0
- **Pendientes**: 6

---

## 🎯 Orden de Ejecución

1. **FASE 1**: DTOs (base)
2. **FASE 2**: Modal de Compartir ⭐ (PRIORIDAD)
3. **FASE 3**: Página Accesos Compartidos
4. **FASE 4**: Navegación
5. **FASE 5**: Validaciones
6. **FASE 6**: Documentación

---

## ✅ Checklist de Verificación Final

### Funcionalidad
- [ ] Puedo compartir desde menú dropdown en StudentsList
- [ ] Puedo compartir desde menú en StudentsPage
- [ ] Modal muestra plantillas de mensaje
- [ ] Validaciones funcionan correctamente
- [ ] No permite duplicados pending/accepted
- [ ] Tab "Invitaciones Enviadas" muestra todas
- [ ] Tab "Accesos Activos" agrupa por estudiante
- [ ] Puedo cancelar invitaciones (se eliminan)
- [ ] Puedo reenviar invitaciones (crea nueva)
- [ ] Puedo cambiar nivel de acceso
- [ ] Puedo revocar acceso (se elimina)
- [ ] Todas las notificaciones se cierran manualmente

### Navegación
- [ ] Navbar muestra "Accesos Compartidos"
- [ ] Ruta `/shared-access` funciona
- [ ] Navegación fluida

### Datos
- [ ] 10-15 ejemplos mock generados
- [ ] Datos reflejan nuevo flujo
- [ ] Estados correctos

### UX
- [ ] Notificaciones no se cierran solas
- [ ] Acordeón en Accesos Activos funciona
- [ ] Plantillas de mensaje útiles
- [ ] Diseño consistente

---

**¿Listo para comenzar? Responde "SÍ" y empiezo con FASE 1** 🚀
