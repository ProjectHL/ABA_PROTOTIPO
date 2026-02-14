# ABA Therapy Prototipo (Módulo Clínico)

Este proyecto es un prototipo funcional de alto nivel desarrollado con **React**, **TypeScript**, **Vite** y **Mantine UI**. Simula el flujo de trabajo completo de una plataforma de gestión clínica para terapias ABA (Análisis Conductual Aplicado).

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js (v18 o superior recomendado)
- npm o yarn

### Instalación
```bash
# Instalar dependencias
npm install
```

### Ejecución en Desarrollo
```bash
# Iniciar servidor de desarrollo (puerto 5173 por defecto)
npm run dev
```

### Linting y Calidad de Código
```bash
# Ejecutar linter para verificar errores
npm run lint
```

## 🏗️ Tecnologías Clave

*   **Core**: React 18 + TypeScript + Vite.
*   **UI Framework**: Mantine UI v7 (Componentes, Hooks, Notificaciones).
*   **Routing**: React Router DOM v6.
*   **Gráficos**: Recharts (para visualización de datos clínicos).
*   **Iconos**: Lucide React.
*   **Estado Global**: React Context API (para simulación de autenticación y roles).

## 📂 Estructura del Proyecto

La estructura sigue un enfoque **Feature-Based** para escalar mejor que el clásico "components/pages":

```
src/
├── api/              # Mocks de datos y simuladores de backend
├── components/       # Componentes UI reutilizables y Layouts globales
├── context/          # Contextos globales (RoleContext)
├── features/         # Módulos de funcionalidad específica
│   ├── analytics/    # Gráficos y Dashboard de Análisis
│   ├── auth/         # Componentes de Login/Registro
│   ├── dashboard/    # Widgets del Dashboard Principal
│   ├── dataCollection/ # Motor de toma de datos (Sesión Activa)
│   ├── programs/     # Gestión de Programas Clínicos
│   └── students/     # Gestión de Estudiantes y Perfiles
├── hooks/            # Hooks personalizados (useRole)
├── pages/            # Páginas principales (vistas de rutas)
└── types/            # Definiciones de tipos TypeScript compartidas
```

## 🔐 Gestión de Roles (Simulado)

El sistema incluye un selector de roles en la barra superior para probar diferentes perspectivas:
1.  **Administrador**: Acceso total, gestión de usuarios.
2.  **Supervisor**: Crea programas, analiza gráficos, aprueba sesiones.
3.  **Terapeuta**: Ejecuta sesiones (`SessionPage`), toma datos.
4.  **Familia**: Vista de solo lectura, reportes simplificados.

Cambia el rol dinámicamente usando el desplegable en el Header.
