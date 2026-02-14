# Tarea 1: Diagramas de Flujo Detallados

**Objetivo**: Documentar todos los flujos del sistema de Accesos Compartidos con diagramas ASCII

---

## 1.1 Flujo Principal: Compartir Carpeta

### Descripción
Proceso completo desde que el supervisor decide compartir una carpeta hasta que la invitación es enviada.

### Diagrama
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
│    ○ Acceso Completo                                   │
│    ○ Solo Lectura                                      │
│    ○ Solo Programas                                    │
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
│    - ID: UUID generado                                  │
│    - Status: "pending"                                  │
│    - sharedDate: timestamp actual                       │
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

---

## 1.2 Diagrama de Estados de Invitación

### Descripción
Ciclo de vida completo de una invitación desde su creación hasta estados finales.

### Diagrama
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
                         │                ↓
                         ↓          ┌──────────┐
                    ┌──────────┐    │REENVIADA │
                    │REVOCADA  │    │(pending) │
                    │(revoked) │    └──────────┘
                    └──────────┘
                         
    [Estados Finales]   [Puede volver a pending]
```

### Leyenda de Estados
- **pending**: Invitación enviada, esperando respuesta del profesional
- **accepted**: Profesional aceptó, tiene acceso activo
- **rejected**: Profesional rechazó la invitación
- **canceled**: Supervisor canceló antes de que fuera respondida
- **revoked**: Supervisor revocó un acceso previamente aceptado

---

## 1.3 Flujo: Cambiar Nivel de Acceso

### Descripción
Proceso para modificar el nivel de acceso de un profesional que ya tiene acceso activo.

### Diagrama
```
┌─────────────────────────────────────────────────────────┐
│ INICIO: Supervisor en tab "Accesos Activos"            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Supervisor ve profesional con acceso activo         │
│    Status = "accepted"                                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Click en botón "Cambiar Acceso"                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Modal se abre mostrando:                            │
│    - Nivel actual: "Acceso Completo"                   │
│    - Selector para nuevo nivel                         │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Supervisor selecciona nuevo nivel                   │
│    Ejemplo: "Solo Lectura"                             │
└────────────────────┬────────────────────────────────────┘
                     ↓
                ┌────┴────┐
                │ ¿Nivel  │
                │diferente?│
                └────┬────┘
         NO ←───────┤    ├───────→ SÍ
         ↓          └────┘          ↓
┌────────────────┐            ┌─────────────────────┐
│ Mostrar warning│            │ 5. Click "Guardar"  │
│ "Sin cambios"  │            └──────────┬──────────┘
└────────────────┘                       ↓
                              ┌─────────────────────┐
                              │ 6. Sistema actualiza│
                              │    - accessLevel    │
                              │    - lastModified   │
                              │    - accessHistory  │
                              └──────────┬──────────┘
                                         ↓
                              ┌─────────────────────┐
                              │ 7. Notificación     │
                              │ "Nivel actualizado" │
                              └──────────┬──────────┘
                                         ↓
                              ┌─────────────────────┐
                              │ 8. Modal se cierra  │
                              └──────────┬──────────┘
                                         ↓
┌─────────────────────────────────────────────────────────┐
│ FIN: Tabla se actualiza con nuevo nivel                │
└─────────────────────────────────────────────────────────┘
```

---

## 1.4 Flujo: Revocar Acceso

### Descripción
Proceso para eliminar el acceso de un profesional.

### Diagrama
```
┌─────────────────────────────────────────────────────────┐
│ INICIO: Supervisor en tab "Accesos Activos"            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Click en botón "Revocar Acceso" (rojo)              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Modal de confirmación se abre                       │
│    "¿Estás seguro de revocar el acceso de              │
│     [Profesional] a [Estudiante]?"                     │
│    ⚠️ "Esta acción no se puede deshacer"               │
└────────────────────┬────────────────────────────────────┘
                     ↓
                ┌────┴────┐
                │Supervisor│
                │confirma? │
                └────┬────┘
         NO ←───────┤    ├───────→ SÍ
         ↓          └────┘          ↓
┌────────────────┐            ┌─────────────────────┐
│ Modal se cierra│            │ 3. Sistema actualiza│
│ Sin cambios    │            │    status="revoked" │
└────────────────┘            │    revokedDate=now  │
                              └──────────┬──────────┘
                                         ↓
                              ┌─────────────────────┐
                              │ 4. Eliminar permisos│
                              │    del profesional  │
                              └──────────┬──────────┘
                                         ↓
                              ┌─────────────────────┐
                              │ 5. Notificación roja│
                              │ "Acceso revocado"   │
                              └──────────┬──────────┘
                                         ↓
                              ┌─────────────────────┐
                              │ 6. (Simulado) Email │
                              │    al profesional   │
                              └──────────┬──────────┘
                                         ↓
┌─────────────────────────────────────────────────────────┐
│ FIN: Profesional removido de "Accesos Activos"         │
│      Aparece en historial como "Revocado"              │
└─────────────────────────────────────────────────────────┘
```

---

## 1.5 Flujo: Reenviar Invitación Rechazada

### Descripción
Proceso para volver a enviar una invitación que fue rechazada previamente.

### Diagrama
```
┌─────────────────────────────────────────────────────────┐
│ INICIO: Supervisor en tab "Invitaciones Enviadas"      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Supervisor ve invitación con status="rejected"      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Click en botón "Reenviar"                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Sistema crea NUEVA invitación                       │
│    - Nuevo ID                                           │
│    - Status = "pending"                                 │
│    - Mismos datos (email, estudiante, nivel)           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Invitación anterior permanece como "rejected"       │
│    (para historial)                                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Notificación azul "Invitación reenviada"            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. (Simulado) Nuevo email al profesional               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ FIN: Nueva invitación visible con status "Pendiente"   │
└─────────────────────────────────────────────────────────┘
```

---

## 1.6 Flujo de Decisión: Validación de Email

### Descripción
Árbol de decisión para validar email al compartir.

### Diagrama
```
                    ┌─────────────┐
                    │Email ingresado│
                    └──────┬──────┘
                           ↓
                    ┌──────┴──────┐
                    │ ¿Está vacío?│
                    └──────┬──────┘
              SÍ ←─────────┤    ├─────────→ NO
              ↓            └────┘            ↓
        ┌──────────┐                 ┌──────────┐
        │ ERROR:   │                 │ ¿Formato │
        │"Email    │                 │ válido?  │
        │requerido"│                 └────┬─────┘
        └──────────┘          NO ←────────┤    ├────────→ SÍ
                              ↓           └────┘           ↓
                        ┌──────────┐              ┌──────────┐
                        │ ERROR:   │              │¿Ya existe│
                        │"Formato  │              │pending?  │
                        │inválido" │              └────┬─────┘
                        └──────────┘      SÍ ←────────┤    ├────────→ NO
                                          ↓           └────┘           ↓
                                    ┌──────────┐              ┌──────────┐
                                    │ ERROR:   │              │¿Ya existe│
                                    │"Ya existe│              │accepted? │
                                    │pendiente"│              └────┬─────┘
                                    └──────────┘      SÍ ←────────┤    ├────────→ NO
                                                      ↓           └────┘           ↓
                                                ┌──────────┐              ┌──────────┐
                                                │ ERROR:   │              │  VÁLIDO  │
                                                │"Ya tiene │              │ Continuar│
                                                │ acceso"  │              └──────────┘
                                                └──────────┘
```

---

## Criterios de Aceptación

- ✅ Todos los flujos están documentados con diagramas ASCII
- ✅ Cada diagrama muestra decisiones y caminos alternativos
- ✅ Estados finales están claramente identificados
- ✅ Mensajes de error están especificados
- ✅ Flujos son comprensibles sin explicación adicional

---

## Próximos Pasos

Una vez aprobados estos diagramas, proceder a:
1. Implementar validaciones según flujos
2. Crear componentes UI basados en diagramas
3. Escribir tests siguiendo los flujos documentados
