# Plan de Implementación: Sistema de Accesos Compartidos

**Fecha**: 2026-02-01  
**Tipo**: Refactorización Mayor  
**Objetivo**: Cambiar de sistema de "Solicitudes" a sistema de "Compartir" (tipo Google Drive)

---

## 🎯 Contexto del Cambio

### Flujo ANTERIOR (Eliminado)
- Profesionales SOLICITAN acceso
- Supervisor APRUEBA/DENIEGA solicitudes
- Página "Invitaciones" mostraba solicitudes recibidas

### Flujo NUEVO (Implementar)
- Supervisor COMPARTE carpetas de estudiantes
- Profesionales ACEPTAN/RECHAZAN invitaciones
- Página "Accesos Compartidos" muestra invitaciones enviadas y accesos activos

---

## 📐 Reglas de Negocio

### ✅ Permisos del Supervisor
1. **Puede compartir** carpetas de estudiantes con profesionales
2. **Puede cambiar** el nivel de acceso de profesionales
3. **Puede revocar** el acceso en cualquier momento
4. **Puede reenviar** invitaciones rechazadas o pendientes
5. **Puede cancelar** invitaciones pendientes

### ❌ Restricciones
1. **Terapeutas NO pueden solicitar acceso** (nunca)
2. **Solo el supervisor inicia** el proceso de compartir
3. **No hay expiración** de invitaciones (solo revocación manual)
4. **Profesionales no registrados** reciben email para registrarse primero

### 📊 Niveles de Acceso
1. **Acceso Completo**: Ver y editar todo
2. **Solo Lectura**: Ver sin editar
3. **Solo Programas**: Acceso limitado a programas educativos

### 🔄 Estados de Invitación
- `pending`: Invitación enviada, esperando respuesta
- `accepted`: Profesional aceptó, tiene acceso activo
- `rejected`: Profesional rechazó la invitación

---

## 📋 FASE 1: Actualizar DTOs y Datos Mock

### Tarea 1.1: Refactorizar `invitationsData.ts`

**Archivo**: `src/api/invitationsData.ts`

**Cambios**:
1. Renombrar interface: `AccessInvitation` → `SharedAccess`
2. Actualizar campos:
   ```typescript
   export interface SharedAccess {
       id: string;
       sharedBy: string; // supervisor ID
       sharedWith: string; // professional email
       studentId: string;
       studentName: string;
       professionalName?: string; // opcional si no está registrado
       professionalTitle?: string;
       sharedDate: string; // ISO date
       accessLevel: 'full' | 'read-only' | 'programs-only';
       status: 'pending' | 'accepted' | 'rejected';
       message?: string;
   }
   ```
3. Crear 5 ejemplos de datos mock:
   - 2 con status `pending`
   - 2 con status `accepted`
   - 1 con status `rejected`

**Criterios de Aceptación**:
- ✅ Interface renombrada correctamente
- ✅ Todos los campos tienen tipos correctos
- ✅ Datos mock reflejan el nuevo flujo
- ✅ Export actualizado

---

## 📋 FASE 2: Componente de Compartir

### Tarea 2.1: Crear `ShareStudentModal.tsx`

**Archivo**: `src/features/students/ShareStudentModal.tsx`

**Componente**:
```typescript
interface ShareStudentModalProps {
    opened: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    onShare: (email: string, accessLevel: string, message?: string) => void;
}
```

**Elementos del Modal**:
1. **Header**: "Compartir Carpeta de [Nombre Estudiante]"
2. **Campo Email**: TextInput con validación
3. **Selector Acceso**: Select con 3 opciones
4. **Mensaje Opcional**: Textarea
5. **Botones**: Cancelar / Enviar Invitación

**Validaciones**:
- Email no vacío
- Email con formato válido
- Nivel de acceso seleccionado

**Criterios de Aceptación**:
- ✅ Modal se abre/cierra correctamente
- ✅ Validación de email funciona
- ✅ Callback onShare recibe datos correctos
- ✅ Notificación de éxito al compartir
- ✅ Formulario se limpia al cerrar

---

### Tarea 2.2: Crear `ShareButton.tsx`

**Archivo**: `src/features/students/ShareButton.tsx`

**Componente Reutilizable**:
```typescript
interface ShareButtonProps {
    studentId: string;
    studentName: string;
    variant?: 'filled' | 'light' | 'subtle';
    size?: 'xs' | 'sm' | 'md';
}
```

**Funcionalidad**:
- Botón con ícono de compartir
- Abre ShareStudentModal al hacer clic
- Maneja lógica de compartir

**Criterios de Aceptación**:
- ✅ Botón reutilizable
- ✅ Props configurables
- ✅ Integra ShareStudentModal
- ✅ Maneja estado del modal

---

### Tarea 2.3: Integrar en `StudentsList.tsx`

**Archivo**: `src/features/students/StudentsList.tsx`

**Cambios**:
1. Importar `ShareButton`
2. Agregar botón en cada card de estudiante
3. Posición: Junto a otros botones de acción

**Criterios de Aceptación**:
- ✅ Botón visible en cada card
- ✅ No rompe diseño existente
- ✅ Funciona correctamente

---

### Tarea 2.4: Integrar en `StudentsPage.tsx`

**Archivo**: `src/pages/StudentsPage.tsx`

**Cambios**:
1. Importar `ShareButton`
2. Agregar botón en vista de estudiante individual
3. Posición: En header junto a "Editar" y "Programas"

**Criterios de Aceptación**:
- ✅ Botón visible en vista individual
- ✅ No rompe diseño existente
- ✅ Funciona correctamente

---

## 📋 FASE 3: Página "Accesos Compartidos"

### Tarea 3.1: Renombrar y Reestructurar

**Archivo**: `src/pages/InvitationsPage.tsx` → `src/pages/SharedAccessPage.tsx`

**Cambios Estructurales**:
1. Renombrar archivo
2. Renombrar componente: `InvitationsPage` → `SharedAccessPage`
3. Cambiar título: "Invitaciones de Acceso" → "Accesos Compartidos"
4. Eliminar toda lógica de "solicitudes recibidas"
5. Implementar sistema de Tabs (Mantine Tabs)

**Criterios de Aceptación**:
- ✅ Archivo renombrado
- ✅ Componente renombrado
- ✅ Imports actualizados
- ✅ Sistema de tabs implementado

---

### Tarea 3.2: Tab "Invitaciones Enviadas"

**Contenido**:
Tabla con invitaciones enviadas por el supervisor

**Columnas**:
1. Profesional (email + nombre si está registrado)
2. Estudiante
3. Tipo de Acceso (badge con color)
4. Estado (badge: Pendiente/Aceptada/Rechazada)
5. Fecha de Envío
6. Acciones

**Acciones por Fila**:
- **Ver Detalles** (👁️): Modal con info completa
- **Cancelar** (❌): Solo si status = `pending`
- **Reenviar** (🔄): Solo si status = `rejected` o `pending`

**Filtros**:
- Mostrar todas las invitaciones (pending, accepted, rejected)

**Criterios de Aceptación**:
- ✅ Tabla muestra todas las invitaciones
- ✅ Badges de color según estado
- ✅ Acciones condicionales según estado
- ✅ Modal de detalles funciona
- ✅ Cancelar actualiza estado
- ✅ Reenviar crea nueva notificación

---

### Tarea 3.3: Tab "Accesos Activos"

**Contenido**:
Tabla con profesionales que tienen acceso actualmente

**Filtro**:
- Solo invitaciones con status = `accepted`

**Columnas**:
1. Profesional (avatar + nombre + título)
2. Estudiante
3. Tipo de Acceso (badge)
4. Fecha de Aceptación
5. Acciones

**Acciones por Fila**:
- **Cambiar Acceso** (🔧): Modal para cambiar nivel
- **Revocar Acceso** (🗑️): Confirmación + eliminar acceso

**Criterios de Aceptación**:
- ✅ Solo muestra invitaciones aceptadas
- ✅ Botón "Cambiar Acceso" abre modal
- ✅ Modal permite seleccionar nuevo nivel
- ✅ Cambio se guarda correctamente
- ✅ Botón "Revocar" muestra confirmación
- ✅ Revocar elimina de accesos activos
- ✅ Notificaciones de éxito

---

### Tarea 3.4: Modal "Cambiar Nivel de Acceso"

**Componente**: Dentro de `SharedAccessPage.tsx`

**Contenido**:
1. Título: "Cambiar Nivel de Acceso"
2. Mostrar nivel actual
3. Selector con 3 opciones
4. Botones: Cancelar / Guardar Cambios

**Criterios de Aceptación**:
- ✅ Muestra nivel actual
- ✅ Selector funciona
- ✅ Guardar actualiza nivel
- ✅ Notificación de éxito

---

### Tarea 3.5: Modal "Confirmar Revocar Acceso"

**Componente**: Dentro de `SharedAccessPage.tsx`

**Contenido**:
1. Título: "Revocar Acceso"
2. Mensaje: "¿Estás seguro de revocar el acceso de [Profesional] a [Estudiante]?"
3. Advertencia: "Esta acción no se puede deshacer"
4. Botones: Cancelar / Revocar (rojo)

**Criterios de Aceptación**:
- ✅ Modal de confirmación funciona
- ✅ Revocar elimina acceso
- ✅ Notificación de éxito
- ✅ Tabla se actualiza

---

## 📋 FASE 4: Actualizar Navegación

### Tarea 4.1: Actualizar `MainLayout.tsx`

**Archivo**: `src/components/MainLayout.tsx`

**Cambios**:
```typescript
// ANTES
{ icon: FileCheck, label: 'Invitaciones', path: '/invitations' }

// DESPUÉS
{ icon: FileCheck, label: 'Accesos Compartidos', path: '/shared-access' }
```

**Criterios de Aceptación**:
- ✅ Label actualizado en navbar
- ✅ Path actualizado
- ✅ Ícono se mantiene

---

### Tarea 4.2: Actualizar `App.tsx`

**Archivo**: `src/App.tsx`

**Cambios**:
1. Actualizar import:
   ```typescript
   // ANTES
   import InvitationsPage from './pages/InvitationsPage';
   
   // DESPUÉS
   import SharedAccessPage from './pages/SharedAccessPage';
   ```

2. Actualizar ruta:
   ```typescript
   // ANTES
   <Route path="/invitations" element={<InvitationsPage />} />
   
   // DESPUÉS
   <Route path="/shared-access" element={<SharedAccessPage />} />
   ```

**Criterios de Aceptación**:
- ✅ Import actualizado
- ✅ Ruta actualizada
- ✅ Navegación funciona

---

## 📋 FASE 5: Lógica y Validaciones

### Tarea 5.1: Validaciones de Compartir

**Ubicación**: `ShareStudentModal.tsx`

**Validaciones**:
1. Email no vacío
2. Email con formato válido (regex)
3. Nivel de acceso seleccionado
4. Verificar si ya existe invitación:
   - Si existe `pending`: Mostrar "Ya existe una invitación pendiente"
   - Si existe `accepted`: Mostrar "Este profesional ya tiene acceso"
   - Si existe `rejected`: Permitir reenviar

**Criterios de Aceptación**:
- ✅ Validación de email funciona
- ✅ Mensajes de error claros
- ✅ No permite duplicados
- ✅ Permite reenviar si fue rechazada

---

### Tarea 5.2: Sistema de Notificaciones

**Ubicación**: Todos los componentes relevantes

**Notificaciones a Implementar**:
1. ✅ "Invitación enviada a [email]" (verde)
2. ✅ "Invitación cancelada" (naranja)
3. ✅ "Invitación reenviada" (azul)
4. ✅ "Nivel de acceso actualizado" (verde)
5. ✅ "Acceso revocado para [profesional]" (rojo)
6. ❌ "Ya existe una invitación pendiente" (amarillo)
7. ❌ "Este profesional ya tiene acceso" (amarillo)

**Criterios de Aceptación**:
- ✅ Todas las notificaciones funcionan
- ✅ Colores apropiados
- ✅ Mensajes claros

---

## 📋 FASE 6: Documentación

### Tarea 6.1: Actualizar `REPORT.md`

**Archivo**: `REPORT.md`

**Contenido a Agregar**:
```markdown
## Fecha
2026-02-01 (Actualización 3)

## Tipo de cambio
- Refactorización Mayor
- Feature
- UX

## Descripción
Cambio de sistema de "Solicitudes de Acceso" a "Accesos Compartidos" tipo Google Drive. 
El supervisor ahora comparte proactivamente las carpetas de estudiantes con profesionales.

## Archivos afectados
### Nuevos archivos creados:
- src/features/students/ShareStudentModal.tsx
- src/features/students/ShareButton.tsx
- src/pages/SharedAccessPage.tsx

### Archivos modificados:
- src/api/invitationsData.ts (refactorizado)
- src/features/students/StudentsList.tsx
- src/pages/StudentsPage.tsx
- src/components/MainLayout.tsx
- src/App.tsx

### Archivos eliminados:
- src/pages/InvitationsPage.tsx (renombrado)

## Impacto
- Flujo de trabajo más intuitivo tipo Google Drive
- Supervisor tiene control total sobre accesos
- Terapeutas no pueden solicitar acceso
- Gestión centralizada de permisos
```

**Criterios de Aceptación**:
- ✅ REPORT.md actualizado
- ✅ Todos los cambios documentados
- ✅ Impacto explicado

---

## ✅ Checklist Final

Antes de considerar completa la implementación:

### Funcionalidad
- [ ] Botón "Compartir" visible en StudentsList
- [ ] Botón "Compartir" visible en StudentsPage
- [ ] Modal de compartir funciona correctamente
- [ ] Validaciones de email funcionan
- [ ] Tab "Invitaciones Enviadas" muestra datos
- [ ] Tab "Accesos Activos" muestra solo aceptadas
- [ ] Cancelar invitación funciona
- [ ] Reenviar invitación funciona
- [ ] Cambiar nivel de acceso funciona
- [ ] Revocar acceso funciona
- [ ] Todas las notificaciones funcionan

### Navegación
- [ ] Navbar muestra "Accesos Compartidos"
- [ ] Ruta `/shared-access` funciona
- [ ] Navegación desde navbar funciona

### Datos
- [ ] DTOs actualizados correctamente
- [ ] Datos mock reflejan nuevo flujo
- [ ] Estados de invitación correctos

### Documentación
- [ ] REPORT.md actualizado
- [ ] Código comentado donde necesario

---

## 🚀 Orden de Implementación

1. ✅ **FASE 1**: Actualizar DTOs (base de datos)
2. ✅ **FASE 2**: Crear componentes de compartir
3. ✅ **FASE 3**: Refactorizar página principal
4. ✅ **FASE 4**: Actualizar navegación
5. ✅ **FASE 5**: Implementar validaciones
6. ✅ **FASE 6**: Documentar cambios

---

## ⚠️ Notas Importantes

1. **NO** implementar funcionalidad de envío de emails (solo simular)
2. **NO** implementar registro de profesionales (fuera de scope)
3. **MANTENER** datos mock para demostración
4. **SEGUIR** principios de Clean Code
5. **USAR** componentes de Mantine existentes
6. **MANTENER** consistencia con diseño actual

---

**Fin del Plan de Implementación**
