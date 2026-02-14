# Guía de Trabajo y Mejores Prácticas

Esta guía define cómo se piensa, estructura, escribe y entrega código frontend, asegurando que:
- Sea escalable
- Minimice errores
- Facilite la integración con Backend y Base de Datos
- Mantenga coherencia arquitectónica a largo plazo

Aplica a proyectos con React, TypeScript, Tailwind, shadcn/ui, y backend basado en APIs REST / JSON.

## 1. Flujo de Trabajo del Agente (Pensamiento Antes del Código)

Antes de escribir código, este proceso es obligatorio:

### 1.1 Análisis del Contexto
- Revisar estructura existente del proyecto.
- Detectar lógica duplicada o componentes reutilizables.
- Confirmar que el cambio no rompe la arquitectura definida en `AGENT.md`.
- ❌ Nunca crear código nuevo sin verificar si ya existe algo equivalente.

### 1.2 Definición de Contratos de Datos
- Todo dato debe tener un tipo explícito en TypeScript.
- Las interfaces deben reflejar modelos reales de backend / base de datos, no estructuras improvisadas.
- Ejemplos: `UserDTO`, `OrderDTO`, `ApiResponse<T>`.
- El frontend no inventa estructuras: simula el backend real.

### 1.3 Planificación de Impacto
Antes de codificar, identificar:
- Componentes afectados
- Estados globales involucrados
- Servicios o endpoints relacionados
- Posibles efectos colaterales
- Si el impacto no es claro, no se codifica.

### 1.4 Codificación Atómica
- Cambios pequeños, enfocados y fáciles de revisar.
- Un commit = una intención clara.
- Nada de “ya que estoy, aprovecho de…”.

## 2. Estructura de Proyecto (Preparada para Backend)

Estructura base recomendada:
```text
src/
 ├─ app/                # Rutas / layouts (Next.js o equivalente)
 ├─ components/         # Componentes UI reutilizables
 ├─ features/           # Funcionalidades agrupadas por dominio
 ├─ services/           # Comunicación con APIs / mocks
 ├─ dtos/               # Contratos de datos (DTOs)
 ├─ hooks/              # Custom hooks
 ├─ store/              # Estado global (Zustand / Context)
 ├─ utils/              # Funciones puras y helpers
 ├─ mocks/              # Datos y servicios mockeados
 └─ styles/             # Configuración global (solo si aplica)
```

## 3. Capa de Datos y Servicios (Regla Crítica)

### 3.1 Servicios
- Prohibido llamar `fetch`, `axios` o similares desde componentes.
- Toda comunicación va por `src/services/`.
- Ejemplo: `user.service.ts`, `orders.service.ts`.

### 3.2 DTOs (Data Transfer Objects)
- Cada endpoint tiene su DTO.
- El DTO representa exactamente lo que envía el backend, no lo que el UI “necesita”.
- La adaptación UI se hace después, nunca alterando el contrato.

### 3.3 Mocks Realistas
- Ubicados en `src/mocks/`
- Simulan: Latencia (`setTimeout`), Errores, Respuestas parciales.
- Objetivo: que el frontend no note cuando el backend real reemplaza el mock.

## 4. Mejores Prácticas de Codificación

### 4.1 React + TypeScript
- `strict: true` siempre activo.
- ❌ `any` está prohibido.
- Tipos complejos → `interface` o `type`, nunca inline confuso.
- Componentes > 150 líneas → refactor obligatorio.
- JSX solo para render, nunca lógica pesada.

### 4.2 Estado Global
- Evitar prop drilling profundo.
- Usar: Context API para estado simple, Zustand para estado de aplicación.
- El estado global no debe contener lógica de negocio.

### 4.3 Funciones y Utilidades
- Funciones puras en `src/utils/`
- Sin dependencias de UI.
- Testeables y reutilizables.

## 5. Estilo y UI (Tailwind + shadcn)

### 5.1 Tailwind
- Uso consistente de tokens del tema (primary, secondary, accent).
- Clases agrupadas por: Layout, Box model, Typography, Visual / Effects.

### 5.2 shadcn/ui
- Nunca modificar archivos internos.
- Extender por composición.
- Mantener consistencia visual entre features.

## 6. Preparación para Backend y Base de Datos
- IDs como string o UUID.
- Validación de datos con Zod: Al recibir datos y antes de renderizar.
- Cada request debe manejar: `idle`, `loading`, `success`, `error`.
- No existen requests “simples” sin estados.

## 7. Documentación y Reporte de Cambios
- Archivo obligatorio: `/REPORT.md`
- Reglas: Se actualiza en cada cambio relevante, nunca se sobrescribe el historial, es obligatorio antes de entregar código.
- El código sin reporte no está terminado.

## 8. Checklist de Entrega (Obligatorio)

Antes de cerrar una tarea:
- [ ] Respeta la arquitectura definida en `AGENT.md`
- [ ] No hay `console.log`
- [ ] Tipos correctos y explícitos
- [ ] DTOs coherentes con backend
- [ ] `/REPORT.md` actualizado
- [ ] UI responsive en mobile / tablet / desktop

## 9. Prohibiciones Absolutas
- ❌ Hardcodear URLs, tokens o credenciales
- ❌ Mezclar lógica de negocio con JSX
- ❌ Ignorar errores TypeScript
- ❌ `// @ts-ignore`
- ❌ CSS local innecesario
- ❌ Componentes “todo en uno”

## 10. Principio Final

Este proyecto no se construye para “que funcione hoy”, se construye para escalar mañana sin reescritura. 
Si algo compromete ese objetivo, no se implementa.
