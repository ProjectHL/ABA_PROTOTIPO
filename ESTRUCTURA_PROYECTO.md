# Estructura del Proyecto ABA Admin

## 📁 Arquitectura de Carpetas

```
src/
├── api/              # Definiciones de DTOs y Mocks de servicios
│   └── mockData.ts   # Datos de prueba tipados
├── components/       # Componentes reutilizables (UI)
│   └── MainLayout.tsx
├── features/         # Módulos por dominio
│   ├── auth/         # Autenticación
│   ├── team/         # Gestión de equipo
│   │   ├── TeamManagement.tsx
│   │   ├── ProfileSettings.tsx
│   │   └── index.ts
│   └── students/     # Gestión de estudiantes
├── hooks/            # Custom hooks (timers, cálculos)
├── pages/            # Páginas principales
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   └── LandingPage.tsx
├── store/            # Estado global (Zustand)
└── theme/            # Configuración de Mantine + Tailwind
    └── index.ts
```

## 🎯 Principios de Diseño

### 1. Separación de Responsabilidades
- **API Layer**: Toda la lógica de datos está en `src/api/`
- **Features**: Cada dominio tiene su propia carpeta con componentes relacionados
- **Components**: Solo componentes UI reutilizables y layouts

### 2. Backend-Ready
Todas las funciones de guardado están preparadas para recibir llamadas a API:

```typescript
// Ejemplo en DashboardPage.tsx
const handleUpdateMember = async (id: string, values: Partial<UserProfile>) => {
  try {
    // await api.updateTeamMember(id, values); // ← Descomentar cuando tengas backend
    setTeamMembers(/* actualización local */);
  } catch (error) {
    // manejo de errores
  }
};
```

### 3. Type Safety
- Todas las interfaces están definidas en `src/api/mockData.ts`
- Uso de TypeScript estricto con `type` imports

## 🚀 Componentes Principales

### MainLayout
**Ubicación**: `src/components/MainLayout.tsx`

AppShell completo con:
- Header con búsqueda y notificaciones
- Sidebar con navegación
- Perfil del supervisor en el footer

### TeamManagement
**Ubicación**: `src/features/team/TeamManagement.tsx`

Gestión completa del equipo con:
- Búsqueda por nombre/profesión
- Filtro por rol
- Grid responsive de cards
- Modal de edición integrado

### ProfileSettings
**Ubicación**: `src/features/team/ProfileSettings.tsx`

Formulario de edición con:
- Validación con `@mantine/form`
- Upload de avatar
- Campos completos de perfil profesional

## 🎨 Sistema de Diseño

### Tema Personalizado
**Ubicación**: `src/theme/index.ts`

- Colores clínicos (azul primario, verde terapéutico)
- Sombras consistentes
- Componentes con defaults configurados
- Espaciado estandarizado

### Componentes de Mantine Usados
- `AppShell` - Layout principal
- `SimpleGrid` - Grillas responsive
- `Card` - Tarjetas de contenido
- `Modal` - Diálogos
- `Form` - Formularios con validación
- `Badge` - Etiquetas de estado

## 📊 Flujo de Datos

```
Usuario → Componente UI → Handler → API Mock → Estado Local
                                      ↓
                                   (Futuro: API Real)
```

## 🔄 Próximos Pasos

1. **Estado Global**: Implementar Zustand en `src/store/`
2. **Hooks Personalizados**: Crear hooks para timers y cálculos en `src/hooks/`
3. **Feature Students**: Desarrollar gestión de estudiantes
4. **Feature Auth**: Sistema de autenticación completo
5. **API Integration**: Conectar con backend real

## 💡 Convenciones de Código

- **Componentes**: PascalCase (ej: `TeamManagement`)
- **Archivos**: Mismo nombre que el componente exportado
- **Tipos**: Usar `type` para imports de tipos
- **Async**: Todas las funciones de guardado son async
- **Notificaciones**: Usar `notifications.show()` de Mantine

## 🛠️ Tecnologías

- **React 19** - Framework UI
- **Vite** - Build tool
- **Mantine UI 7** - Sistema de componentes
- **TypeScript** - Type safety
- **React Router** - Navegación
- **Lucide React** - Iconos
