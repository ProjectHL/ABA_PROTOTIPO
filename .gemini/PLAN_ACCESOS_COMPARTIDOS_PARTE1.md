# Plan de Implementación: Sistema de Accesos Compartidos
# PARTE 1: Análisis y Diseño

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
1. **Acceso Completo** (`full`): Ver y editar todo
2. **Solo Lectura** (`read-only`): Ver sin editar
3. **Solo Programas** (`programs-only`): Acceso limitado a programas educativos

### 🔄 Estados de Invitación
- `pending`: Invitación enviada, esperando respuesta
- `accepted`: Profesional aceptó, tiene acceso activo
- `rejected`: Profesional rechazó la invitación

---

## 🔄 Diagramas de Flujo

### Flujo Completo de Compartir
```
┌─────────────────────────────────────────────────────────┐
│ INICIO: Supervisor ve carpeta de estudiante            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Click en botón "Compartir"                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Modal se abre con formulario                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Supervisor ingresa email del profesional            │
└────────────────────┬────────────────────────────────────┘
                     ↓
                ┌────┴────┐
                │ ¿Email  │
                │ válido? │
                └────┬────┘
         NO ←───────┤    ├───────→ SÍ
         ↓          └────┘          ↓
┌────────────────┐            ┌─────────────────────┐
│ Mostrar error  │            │ 4. Verificar si ya  │
│ "Email inválido"│            │ existe invitación   │
└────────────────┘            └──────────┬──────────┘
                                         ↓
                              ┌──────────┴──────────┐
                              │ ¿Ya existe?         │
                              └──────────┬──────────┘
                    ┌──────────┼──────────┼──────────┐
                    │          │          │          │
              Pending    Accepted   Rejected      No existe
                    │          │          │          │
                    ↓          ↓          ↓          ↓
            ┌───────────┐ ┌────────┐ ┌────────┐ ┌────────┐
            │ Mostrar   │ │Mostrar │ │Permitir│ │Continuar│
            │ "Ya       │ │"Ya     │ │reenviar│ │        │
            │ enviada"  │ │tiene   │ │        │ │        │
            │           │ │acceso" │ │        │ │        │
            └───────────┘ └────────┘ └────┬───┘ └───┬────┘
                                           │         │
                                           └────┬────┘
                                                ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Supervisor selecciona nivel de acceso               │
│    □ Acceso Completo                                   │
│    □ Solo Lectura                                      │
│    □ Solo Programas                                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. (Opcional) Supervisor agrega mensaje personalizado  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Click en "Enviar Invitación"                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Sistema crea registro SharedAccess                  │
│    - ID generado                                        │
│    - Status = "pending"                                 │
│    - sharedDate = ahora                                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 9. Sistema muestra notificación verde                  │
│    "Invitación enviada a [email]"                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 10. (Simulado) Sistema envía email al profesional      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 11. Modal se cierra automáticamente                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ FIN: Invitación visible en "Invitaciones Enviadas"     │
└─────────────────────────────────────────────────────────┘
```

### Diagrama de Estados de una Invitación
```
                    ┌─────────────┐
                    │   CREADA    │
                    │  (pending)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ↓                ↓                ↓
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │CANCELADA │    │ACEPTADA  │    │RECHAZADA │
    │(canceled)│    │(accepted)│    │(rejected)│
    └──────────┘    └────┬─────┘    └────┬─────┘
                         │                │
                         │                │
                         ↓                ↓
                    ┌──────────┐    ┌──────────┐
                    │REVOCADA  │    │REENVIADA │
                    │(revoked) │    │(pending) │
                    └──────────┘    └──────────┘
```

---

## 📊 Matriz de Estados y Transiciones

| Estado Actual | Puede Transicionar a | Acción que Causa Transición | Quién Puede Ejecutar |
|---------------|---------------------|----------------------------|---------------------|
| `pending` | `accepted` | Profesional acepta invitación | Profesional |
| `pending` | `rejected` | Profesional rechaza invitación | Profesional |
| `pending` | `canceled` | Supervisor cancela invitación | Supervisor |
| `accepted` | `revoked` | Supervisor revoca acceso | Supervisor |
| `rejected` | `pending` | Supervisor reenvía invitación | Supervisor |
| `revoked` | - | Estado final | - |
| `canceled` | `pending` | Supervisor crea nueva invitación | Supervisor |

### Acciones Disponibles por Estado

| Estado | Ver Detalles | Cancelar | Reenviar | Cambiar Nivel | Revocar |
|--------|-------------|----------|----------|---------------|---------|
| `pending` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `accepted` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `rejected` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `canceled` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `revoked` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📋 Validaciones Exhaustivas

### Tabla de Validaciones

| Campo | Tipo Validación | Regla | Mensaje de Error | Cuándo Validar |
|-------|----------------|-------|------------------|----------------|
| **Email** | Required | No vacío | "El email es requerido" | onSubmit |
| **Email** | Format | Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | "El formato del email no es válido" | onBlur |
| **Email** | Business | No existe pending para mismo estudiante | "Ya existe una invitación pendiente para este profesional" | onSubmit |
| **Email** | Business | No existe accepted para mismo estudiante | "Este profesional ya tiene acceso a esta carpeta" | onSubmit |
| **Email** | Length | Max 100 caracteres | "El email no puede exceder 100 caracteres" | onChange |
| **Nivel Acceso** | Required | Debe estar seleccionado | "Debe seleccionar un nivel de acceso" | onSubmit |
| **Nivel Acceso** | Enum | Debe ser: full, read-only, programs-only | "Nivel de acceso inválido" | onSubmit |
| **Mensaje** | Length | Max 500 caracteres | "El mensaje no puede exceder 500 caracteres" | onChange |
| **Mensaje** | Sanitize | Sin HTML/scripts | "El mensaje contiene caracteres no permitidos" | onSubmit |

### Validaciones de Negocio

#### RN-001: Unicidad de Invitaciones Activas
```typescript
// Pseudocódigo
function validarUnicidad(email: string, studentId: string): ValidationResult {
    const existente = invitaciones.find(inv => 
        inv.sharedWith === email && 
        inv.studentId === studentId &&
        (inv.status === 'pending' || inv.status === 'accepted')
    );
    
    if (existente) {
        if (existente.status === 'pending') {
            return {
                valid: false,
                error: 'Ya existe una invitación pendiente para este profesional',
                action: 'show_existing' // Ofrecer ver la invitación
            };
        }
        if (existente.status === 'accepted') {
            return {
                valid: false,
                error: 'Este profesional ya tiene acceso a esta carpeta',
                action: 'show_access' // Ofrecer ver accesos activos
            };
        }
    }
    
    return { valid: true };
}
```

#### RN-002: Reenvío de Invitaciones Rechazadas
```typescript
// Permitir reenviar solo si:
// 1. Existe invitación previa con status = 'rejected'
// 2. Han pasado al menos 24 horas desde el rechazo
function puedeReenviar(email: string, studentId: string): boolean {
    const rechazada = invitaciones.find(inv =>
        inv.sharedWith === email &&
        inv.studentId === studentId &&
        inv.status === 'rejected'
    );
    
    if (!rechazada) return false;
    
    const horasDesdeRechazo = (Date.now() - new Date(rechazada.rejectedDate).getTime()) / (1000 * 60 * 60);
    return horasDesdeRechazo >= 24;
}
```

---

## 📊 Estructura de Datos Completa

### Schema SharedAccess

```typescript
/**
 * Representa una invitación de acceso compartido a una carpeta de estudiante
 * @interface SharedAccess
 */
export interface SharedAccess {
    // ==================== IDENTIFICACIÓN ====================
    
    /** UUID único generado por el sistema */
    id: string;
    
    // ==================== RELACIONES ====================
    
    /** ID del supervisor que comparte la carpeta */
    sharedBy: string;
    
    /** Email del profesional con quien se comparte (puede no estar registrado) */
    sharedWith: string;
    
    /** ID del estudiante cuya carpeta se comparte */
    studentId: string;
    
    // ==================== DATOS DENORMALIZADOS ====================
    // (Para mejorar performance y evitar joins)
    
    /** Nombre completo del estudiante */
    studentName: string;
    
    /** Nombre del profesional (null si no está registrado) */
    professionalName?: string | null;
    
    /** Título profesional (ej: "Psicólogo Clínico") */
    professionalTitle?: string | null;
    
    /** Nombre del supervisor que compartió */
    supervisorName: string;
    
    // ==================== CONFIGURACIÓN DE ACCESO ====================
    
    /** 
     * Nivel de acceso otorgado
     * - full: Ver y editar todo
     * - read-only: Solo lectura
     * - programs-only: Solo programas educativos
     */
    accessLevel: 'full' | 'read-only' | 'programs-only';
    
    // ==================== ESTADOS Y FECHAS ====================
    
    /** 
     * Estado actual de la invitación
     * - pending: Enviada, esperando respuesta
     * - accepted: Aceptada, acceso activo
     * - rejected: Rechazada por el profesional
     */
    status: 'pending' | 'accepted' | 'rejected';
    
    /** Fecha y hora de creación de la invitación (ISO 8601) */
    sharedDate: string;
    
    /** Fecha y hora de aceptación (ISO 8601, solo si accepted) */
    acceptedDate?: string | null;
    
    /** Fecha y hora de rechazo (ISO 8601, solo si rejected) */
    rejectedDate?: string | null;
    
    /** Fecha y hora de última modificación (ISO 8601) */
    lastModified: string;
    
    /** ID del usuario que realizó la última modificación */
    modifiedBy: string;
    
    // ==================== METADATA ====================
    
    /** Mensaje personalizado del supervisor (opcional, max 500 chars) */
    message?: string | null;
    
    /** Historial de cambios de nivel de acceso */
    accessHistory?: AccessChange[];
}

/**
 * Representa un cambio en el nivel de acceso
 */
interface AccessChange {
    /** Fecha del cambio (ISO 8601) */
    date: string;
    
    /** Nivel anterior */
    from: 'full' | 'read-only' | 'programs-only';
    
    /** Nivel nuevo */
    to: 'full' | 'read-only' | 'programs-only';
    
    /** ID del supervisor que hizo el cambio */
    changedBy: string;
}

// ==================== ÍNDICES RECOMENDADOS ====================
// Para optimizar consultas frecuentes:
// 
// 1. sharedBy + studentId (búsquedas por supervisor)
// 2. sharedWith + status (búsquedas por profesional)
// 3. studentId + status (accesos activos por estudiante)
// 4. status + sharedDate (ordenar por fecha)
```

### Ejemplos de Datos

```typescript
// Ejemplo 1: Invitación Pendiente
const invitacionPendiente: SharedAccess = {
    id: 'inv-001',
    sharedBy: 'sup-001',
    sharedWith: 'roberto.sanchez@example.com',
    studentId: 'std-001',
    studentName: 'Santiago García Pérez',
    professionalName: null, // No registrado aún
    professionalTitle: null,
    supervisorName: 'María González',
    accessLevel: 'full',
    status: 'pending',
    sharedDate: '2026-02-01T10:30:00Z',
    acceptedDate: null,
    rejectedDate: null,
    lastModified: '2026-02-01T10:30:00Z',
    modifiedBy: 'sup-001',
    message: 'Solicito tu colaboración para la evaluación inicial del estudiante.',
    accessHistory: []
};

// Ejemplo 2: Acceso Activo con Cambio de Nivel
const accesoActivo: SharedAccess = {
    id: 'inv-002',
    sharedBy: 'sup-001',
    sharedWith: 'carmen.flores@example.com',
    studentId: 'std-002',
    studentName: 'Valentina Rodríguez Muñoz',
    professionalName: 'Carmen Flores',
    professionalTitle: 'Terapeuta Ocupacional',
    supervisorName: 'María González',
    accessLevel: 'read-only', // Cambiado de 'full'
    status: 'accepted',
    sharedDate: '2026-01-25T09:15:00Z',
    acceptedDate: '2026-01-25T14:20:00Z',
    rejectedDate: null,
    lastModified: '2026-01-30T11:00:00Z',
    modifiedBy: 'sup-001',
    message: 'Necesito tu apoyo para coordinación interdisciplinaria.',
    accessHistory: [
        {
            date: '2026-01-30T11:00:00Z',
            from: 'full',
            to: 'read-only',
            changedBy: 'sup-001'
        }
    ]
};
```

---

## 🔐 Reglas de Negocio Detalladas

### RN-003: Cambio de Nivel de Acceso
- **Condición**: Solo se puede cambiar si status = `accepted`
- **Validación**: Verificar estado antes de mostrar modal
- **Restricción**: No se puede cambiar a nivel inferior si hay dependencias activas
- **Auditoría**: Registrar cambio en `accessHistory`
- **Notificación**: Informar al profesional del cambio (simulado)

### RN-004: Revocación de Acceso
- **Condición**: Solo si status = `accepted`
- **Efecto**: Cambiar status a `revoked` (agregar nuevo estado)
- **Cascada**: Eliminar permisos activos del profesional
- **Notificación**: Enviar email al profesional (simulado)
- **Reversión**: No se puede deshacer, debe crear nueva invitación

### RN-005: Cancelación de Invitación
- **Condición**: Solo si status = `pending`
- **Efecto**: Cambiar status a `canceled`
- **Notificación**: No se notifica al profesional
- **Reversión**: Puede crear nueva invitación

### RN-006: Límites de Invitaciones
- **Por Estudiante**: Máximo 10 profesionales con acceso activo
- **Por Profesional**: Sin límite de estudiantes
- **Pendientes**: Máximo 5 invitaciones pendientes por estudiante

---

**Continúa en PARTE 2: Implementación**
