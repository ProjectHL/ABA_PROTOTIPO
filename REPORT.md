# Reporte de Cambios

---

## Fecha
2026-02-10 (Actualización 6)

## Tipo de cambio
- Feature (Revisión Gerencia)
- UI/UX
- Bugfix

## Descripción
Se ha implementado el primer bloque de mejoras solicitadas por gerencia enfocado en el **Dashboard Principal**. Esto incluye ajustes de terminología, lógica dinámica de saludos, y reestructuración de gráficos clave para métricas de "Programas Logrados".

## Archivos afectados
### Archivos modificados:
- src/features/dashboard/WelcomeCard.tsx - Saludo dinámico (Días/Tardes/Noches) y botón "Modo Aplicador".
- src/features/dashboard/ActiveSessionCard.tsx - Cambio de terminología "En Vivo" -> "En Curso".
- src/features/dashboard/CompletedSessionsCard.tsx - Cambio de terminología "Finalizadas" -> "Concluidas".
- src/features/dashboard/ProgressLineChart.tsx - Eje Y forzado a números enteros (`allowDecimals={false}`).
- src/features/dashboard/ProgramsBarChart.tsx - Reescritura total: Ahora muestra "Programas Logrados" con filtro Semanal/Mensual.
- src/pages/DashboardPage.tsx - Limpieza de props obsoletas y corrección de imports.

## Impacto
- **Precisión de Datos**: Los gráficos ahora reflejan métricas reales de éxito (Programas Logrados) en lugar de datos genéricos.
- **Claridad**: Terminología unificada ("Concluidas", "En Curso") evita confusiones.
- **UX**: Saludos contextuales y acceso rápido a simulación de "Modo Aplicador".

## Notas técnicas
- Se eliminó la dependencia de `mockBarChartData` en DashboardPage ya que el gráfico de barras ahora maneja sus propios datos simulados internos (temporalmente) para la vista Semanal/Mensual.
- Se corrigieron warnings de ESLint sobre variables no utilizadas (`_variable`).

---

## Fecha
2026-02-01 (Actualización 5)

## Tipo de cambio
- Feature (Mejora UX)
- Refactor

## Descripción
Se ha optimizado el flujo de **Compartir Accesos**. Ahora existe una pestaña centralizada "Repertorio General" dentro de la página de Accesos Computidos, que permite ver todos los estudiantes y compartir el acceso directamente sin tener que navegar al perfil individual de cada uno.

## Archivos afectados
- src/pages/SharedAccessPage.tsx - Implementación de Tab "Repertorio General" y lógica de modal integrado.

## Características implementadas
- **Tab "Repertorio General"**: Lista completa de estudiantes con botón de acción rápida "Compartir".
- **Flujo Centralizado**: Modal de compartir instanciado directamente en la página de gestión.

---

## Fecha
2026-02-01 (Actualización 4)

## Tipo de cambio
- Feature (DevTools / Simulation)
- UI/UX

## Descripción
Implementación de un **Selector de Roles (Role Switcher)** en el header principal. Permite cambiar instantáneamente entre la vista "Clínica" (Super Admin) y "Profesional" para simular y validar los permisos del sistema sin necesidad de múltiples cuentas de login.

## Archivos afectados
### Nuevos archivos creados:
- src/context/RoleContext.tsx - Contexto global para manejar el estado del rol actual

### Archivos modificados:
- src/App.tsx - Integración del RoleProvider
- src/components/MainLayout.tsx - Implementación del Select de roles y filtrado de navegación
- src/features/students/StudentsList.tsx - Filtrado de lista de estudiantes y ocultación de acciones de compartir
- src/features/students/StudentDetail.tsx - Ocultación del botón compartir en el perfil de estudiante

## Impacto
- **Simulación de Escenarios**: Facilita enormemente las pruebas de usuario y demostraciones.
- **Validación de Permisos**: Permite verificar visualmente qué elementos ve cada perfil.
- **Navegación Dinámica**: El sidebar y los menús se adaptan en tiempo real al rol seleccionado.

## Características implementadas
### Role Context
- Estado global: `clinica` | `professional` | `family`
- Helpers booleanos: `isClinica`, `isProfessional`, `isFamily`

### Header Switcher
- Select de Mantine integrado en el header
- Iconos distintivos para cada rol:
  - 🏥 Clínica (Building2 - Azul)
  - 🧑‍⚕️ Profesional (Stethoscope - Verde)
  - 👨‍👩‍👧 Familia (Baby - Violeta) [Disabled por ahora]

### Restricciones de Perfil "Profesional"
1. **Navegación**: Bloqueado acceso a `/shared-access` (no aparece en sidebar).
2. **Estudiantes**: 
   - Solo ve una sublista de estudiantes asignados (simulado: primeros 3).
   - Botón "+" (Crear estudiante) oculto.
3. **Acciones**:
   - Opción "Compartir" oculta en menús de lista y detalle.

---

## Fecha
2026-02-01 (Actualización 3)

## Tipo de cambio
- Refactorización Mayor
- Feature
- UX

## Descripción
Cambio de sistema de "Solicitudes de Acceso" a "Accesos Compartidos" tipo Google Drive. El supervisor ahora comparte proactivamente las carpetas de estudiantes con profesionales, quienes aceptan o rechazan invitaciones. El supervisor mantiene control total sobre los accesos (compartir, cambiar nivel, revocar).

## Archivos afectados
### Nuevos archivos creados:
- src/features/students/ShareStudentModal.tsx - Modal para compartir carpetas con validaciones y plantillas
- src/features/students/ShareButton.tsx - Componente Menu.Item reutilizable para menús dropdown
- src/pages/SharedAccessPage.tsx - Página principal con tabs (Invitaciones Enviadas / Accesos Activos)

### Archivos modificados:
- src/api/invitationsData.ts - Refactorizado: `AccessInvitation` → `SharedAccess`, generador de 15 datos mock
- src/features/students/StudentsList.tsx - Agregado menú dropdown con opción "Compartir"
- src/features/students/StudentDetail.tsx - Agregado menú de acciones en header con opción "Compartir"
- src/components/MainLayout.tsx - Actualizado label "Accesos Compartidos" y path `/shared-access`
- src/App.tsx - Actualizado import y ruta a `SharedAccessPage`

### Archivos eliminados:
- src/pages/InvitationsPage.tsx - Reemplazado por SharedAccessPage.tsx

## Impacto
- **Flujo de trabajo intuitivo**: Modelo tipo Google Drive familiar para usuarios
- **Control proactivo**: Supervisor inicia y gestiona todos los accesos
- **Gestión centralizada**: Tabs separados para invitaciones enviadas y accesos activos
- **Agrupación inteligente**: Accesos activos agrupados por estudiante en acordeón
- **Validaciones robustas**: Verificación de duplicados, emails válidos, plantillas de mensaje
- **Notificaciones manuales**: Feedback claro sin auto-close
- **Acciones completas**: Compartir, cancelar, reenviar, cambiar nivel, revocar

## Características implementadas
### ShareStudentModal
- Validación de email en tiempo real (formato, duplicados)
- 5 plantillas de mensaje sugeridas
- Selector de nivel de acceso (Completo, Solo Lectura, Solo Programas)
- Verificación de invitaciones existentes (pending/accepted/rejected)
- Contador de caracteres (max 500)

### SharedAccessPage - Tab "Invitaciones Enviadas"
- Tabla con todas las invitaciones (pending, accepted, rejected)
- Badges de color según estado
- Acciones condicionales:
  - Ver detalles (siempre)
  - Cancelar invitación (solo pending) → elimina registro
  - Reenviar invitación (solo rejected) → crea nueva con nuevo ID

### SharedAccessPage - Tab "Accesos Activos"
- Acordeón agrupado por estudiante
- Contador de profesionales con acceso por estudiante
- Tabla expandible con profesionales
- Acciones:
  - Cambiar nivel de acceso (modal con selector)
  - Revocar acceso (modal de confirmación) → elimina registro

### Decisiones de diseño
1. **Revocar**: Elimina registro + toast "Acceso removido satisfactoriamente"
2. **Reenviar**: Crea NUEVA invitación (nuevo ID, mantiene historial)
3. **Duplicados rejected**: Usar botón "Reenviar" específicamente
4. **Botón Compartir**: En menú dropdown de 3 puntos
5. **Accesos Activos**: Agrupados por estudiante (acordeón)
6. **Cancelar**: Elimina completamente el registro
7. **Mensaje**: Textarea con plantillas sugeridas
8. **Notificaciones**: Manuales (usuario debe cerrar)
9. **Datos Mock**: 15 ejemplos (40% pending, 50% accepted, 10% rejected)

## Notas técnicas
- Interface `SharedAccess` con campos: sharedBy, sharedWith, studentId, accessLevel, status, message
- Función generadora `generateMockSharedAccess(count)` para datos dinámicos
- Estados de invitación: `pending`, `accepted`, `rejected`
- Niveles de acceso: `full`, `read-only`, `programs-only`
- Notificaciones con `autoClose: false` para control manual
- Acordeón de Mantine para agrupación por estudiante
- Validación de duplicados antes de compartir
- Integración con menús dropdown existentes

---

## Fecha
2026-02-01 (Actualización 2)

## Tipo de cambio
- Refactorización
- Feature
- UI/UX

## Descripción
Refactorización del Dashboard: eliminación del cronómetro y sección de programas logrados. Implementación de sistema simplificado de sesiones activas con barras de progreso en tiempo real (10, 27, 50 min) y nueva sección de sesiones finalizadas clickeables para navegar a programas.

## Archivos afectados
### Nuevos archivos creados:
- src/features/dashboard/CompletedSessionsCard.tsx - Sesiones finalizadas clickeables

### Archivos modificados:
- src/api/dashboardData.ts - Agregado CompletedSession DTO, funciones helper para calcular horarios dinámicos, mockCompletedSessions
- src/features/dashboard/ActiveSessionCard.tsx - Agregado botón "Ver Plan" con navegación
- src/features/dashboard/index.ts - Reemplazado export de ProgramHistoryCard por CompletedSessionsCard
- src/pages/DashboardPage.tsx - Implementada navegación con useNavigate, reemplazado ProgramHistoryCard por CompletedSessionsCard

## Impacto
- **Simplificación UX**: Eliminado cronómetro complejo, reemplazado por barras de progreso simples
- **Navegación mejorada**: Botones "Ver Plan" en sesiones activas y cards clickeables en sesiones finalizadas
- **Datos dinámicos**: Horarios calculados automáticamente para simular progreso real (10, 27, 50 min)
- **Mejor organización**: Separación clara entre sesiones activas y finalizadas
- **Preparado para backend**: Navegación a rutas existentes `/students/:studentId/programs/:programId/chart`

## Notas técnicas
- Funciones helper `getStartTime()` y `getTodayDate()` calculan horarios dinámicamente
- Sesiones activas muestran 3 estados de progreso diferentes con cambios de color:
  - 10 min (azul) - 50 restantes
  - 27 min (azul) - 33 restantes  
  - 50 min (naranja/rojo) - 10 restantes
- CompletedSessionsCard usa cursor pointer y hover effects para indicar clickeabilidad
- Navegación implementada con react-router-dom `useNavigate()`
- ProgramHistoryCard removido del uso activo (archivo conservado)

---


## Fecha
2026-02-01

## Tipo de cambio
- Feature
- UI/UX
- Arquitectura

## Descripción
Implementación completa del Dashboard principal con layout de 2 columnas. Incluye card de bienvenida personalizada, sesión activa con cronómetro de cuenta regresiva, historial de programas logrados, KPIs con tendencias, y gráficos de progreso (líneas y barras) usando Recharts.

## Archivos afectados
### Nuevos archivos creados:
- src/api/dashboardData.ts - DTOs y datos mock para dashboard
- src/hooks/useCountdownTimer.ts - Hook personalizado para cronómetro
- src/features/dashboard/WelcomeCard.tsx - Card de bienvenida con gradiente
- src/features/dashboard/ActiveSessionCard.tsx - Sesión activa con timer
- src/features/dashboard/ProgramHistoryCard.tsx - Historial de programas
- src/features/dashboard/KPICards.tsx - Grid de KPIs
- src/features/dashboard/ProgressLineChart.tsx - Gráfico de líneas
- src/features/dashboard/ProgramsBarChart.tsx - Gráfico de barras
- src/features/dashboard/index.ts - Exports del módulo

### Archivos modificados:
- src/pages/DashboardPage.tsx - Implementación del layout de 2 columnas
- src/pages/TeamPage.tsx - Creada para gestión de equipo
- src/App.tsx - Agregada ruta /team

## Impacto
- **UX mejorada**: Dashboard profesional con información relevante y visual
- **Separación de responsabilidades**: Componentes modulares y reutilizables
- **Preparado para backend**: DTOs definidos y estructura de datos clara
- **Performance**: Uso de hooks personalizados para lógica de timer
- **Escalabilidad**: Componentes de gráficos configurables y extensibles

## Notas técnicas
- Se utilizó Recharts para visualización de datos (requiere instalación)
- El cronómetro usa setInterval con cleanup apropiado
- Layout responsive con Grid de Mantine (base: 12, lg: 5/7)
- Primera columna con ScrollArea independiente
- Colores y estilos consistentes con el tema definido
- Todos los componentes siguen principios de Clean Code

---

## Fecha
2026-01-17

## Tipo de cambio
- Configuración
- Arquitectura
- Documentación

## Descripción
Inicialización del proyecto y creación de guías de estándares detalladas. Se estableció el flujo de trabajo para asegurar calidad, escalabilidad y preparación para futura integración fullstack, incluyendo contratos DTO y capas de servicios.

## Archivos afectados
- AGENT.md
- GUIA_TRABAJO.md (Refinado con estándares de arquitectura y backend)
- ABA_PROTOTIPO/ (Estructura base)
- REPORT.md

## Impacto
- Establece las reglas de trabajo del agente y estándares de codificación.
- Prepara el terreno para integración con Backend/BD mediante servicios y tipado fuerte.
- Base técnica lista (React + Vite + Tailwind + shadcn/ui).

## Notas técnicas
- Se utilizó Tailwind v4 (detectado por shadcn/ui init).
- Se configuraron los alias @/* en tsconfig.json y vite.config.ts.
- El proyecto está listo para la creación de componentes y features.
