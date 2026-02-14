# Tareas Pendientes y Deuda Técnica

Este documento lista las áreas que requieren trabajo para transformar este prototipo en un producto de producción (MVP real).

## 🚨 Crítico (Bloqueantes para Producción)

1.  **Backend Real**:
    *   Reemplazar `src/api/mockData.ts` con llamadas reales a API (REST o GraphQL).
    *   Implementar autenticación segura (JWT/OAuth) en lugar del `RoleContext` simulado.
    *   Persistencia de datos en base de datos (PostgreSQL/MongoDB).

2.  **Gestión de Sesiones**:
    *   El `SessionPage` actualmente pierde datos si se recarga el navegador. Necesita persistencia en `localStorage` o sincronización en tiempo real con backend.

3.  **Seguridad**:
    *   Implementar Route Guards verdaderos en `App.tsx` (ej. `RequireAuth` component) para prevenir acceso directo por URL a páginas administrativas.

## ⚠️ Importante (Mejoras Necesarias)

1.  **Testing**:
    *   No hay tests unitarios ni de integración.
    *   Implementar Vitest + React Testing Library.
    *   E2E Tests con Playwright para flujos críticos (Login -> Iniciar Sesión -> Finalizar).

2.  **Internacionalización (i18n)**:
    *   Los textos están hardcodeados en español. Migrar a `react-i18next`.

3.  **Accesibilidad (a11y)**:
    *   Revisar contraste de colores en gráficos.
    *   Asegurar navegación por teclado completa en el `DataCollectionEngine`.

## 💡 Futuras Funcionalidades (Nice to Have)

1.  **Exportación PDF Real**:
    *   Implementar `react-pdf` o servicio backend para generar reportes clínicos firmados.

2.  **Modo Offline**:
    *   Habilitar PWA (Service Workers) para permitir tomar datos sin internet y sincronizar después.

3.  **Chat/Comentarios**:
    *   Sistema de mensajería entre Supervisor y Terapeuta sobre un programa específico.
