# Arquitectura del Sistema ABA Prototipo

Este documento describe las decisiones de arquitectura, patrones de diseño y flujo de datos implementados en el prototipo.

## 1. Patrones de Diseño

### Feature-Based Folder Structure
En lugar de agrupar por tipo de archivo (`components`, `hooks`, `utils`), agrupamos por **funcionalidad de negocio** (`features/students`, `features/programs`). Esto facilita la mantenibilidad: si necesitas cambiar algo de "Programas", todo está en una carpeta.

### Context API para Estado Global Ligero
Usamos `RoleContext` para manejar la identidad del usuario y sus permisos.
*   **Ventaja**: Evita prop drilling excesivo.
*   **Implementación**: `src/context/RoleContext.tsx` provee `currentRole` y flags booleanos (`isAdmin`, `isTherapist`).
*   **Consumo**: A través del hook `useRole()` en `src/hooks/useRole.ts`.

### Barrel Files (index.ts)
Cada carpeta en `features/` tiene un `index.ts` que exporta, la interfaz pública del módulo. Esto encapsula la lógica interna y hace los imports más limpios.
*   *Ejemplo*: `import { ProgramsList } from '@/features/programs';` en lugar de `.../programs/components/ProgramsList`.

## 2. Flujo de Datos Clínicos

### Modelo de Datos (Mock)
Los datos residen en `src/api/mockData.ts` y `programsData.ts`.
*   **Relación**: `Student` -> `Program` -> `SessionRecord`.
*   **Analytics**: `src/api/analyticsData.ts` contiene generadores de datos aleatorios (`generateMockData`) para visualizar gráficos realistas sin backend.

### Motor de Recolección de Datos (`DataCollectionEngine`)
Este componente (`src/features/dataCollection`) es el núcleo de la aplicación de terapia.
*   **Estado**: Maneja un array local de ensayos ejecutados en memoria.
*   **Persistencia (Simulada)**: AL finalizar, "guarda" los datos (actualmente loguea en consola y muestra notificación).
*   **UX**: Diseñado para ser rápido (clicks mínimos) para terapeutas en sesión.

## 3. Sistema de Visualización (`Analytics`)
*   **Librería**: Recharts.
*   **Abstracción**: `AnalysisChart.tsx` es un componente wrapper que recibe datos genéricos y configura ejes, tooltips y leyendas automáticamente según si es porcentaje o frecuencia.
*   **KPIs**: Cálculos de tendencia se hacen al vuelo en el frontend (`calculateKPIs`).

## 4. Rutas y Navegación
*   **Protección**: Las rutas no están protegidas "realmente" nivel servidor, pero la UI se adapta (oculta botones) según el `RoleContext`.
*   **Manejo de Errores**: Ruta catch-all `*` redirige a `NotFoundPage`.
