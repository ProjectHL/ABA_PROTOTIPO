---
description: Detalle completo del flujo de Registros (1.c.3) - Tareas pendientes
---

# 📋 Módulo 1.c.3 - Sistema de Registros (EDITABLE PARA SUPERVISOR)

## 🎯 Estado Actual vs Requerimientos

### ✅ **Implementado Actualmente:**
- [x] Selector de dimensión (Porcentaje, Frecuencia, Intervalos)
- [x] Registro por Porcentaje con grid de ensayos
- [x] Ciclo de respuestas: NR → I → A → E
- [x] 6 niveles de ayuda básicos (AFT, AFP, AG, Modelo, Verbal, Visual)
- [x] Registro por Frecuencia con contador y cronómetro
- [x] Registro por Intervalos con auto-avance
- [x] Persistencia en localStorage
- [x] Acceso directo para administradores (sin sesión requerida)

### ⚠️ **Pendiente de Implementación:**

---

## 📝 TAREAS PENDIENTES

### **FASE 1: Configuración de Plantillas (Supervisor)**

#### 1.1 Sistema de Plantillas Múltiples
- [ ] **Crear gestión de plantillas por programa**
  - Botón "Más" (+) en esquina superior derecha
  - Permitir crear múltiples registros por programa
  - Selector de plantilla: "Actual", "Nombre...", "Antiguo"
  - Cada plantilla genera su propio gráfico

#### 1.2 Configuración de Sets (Porcentaje)
- [ ] **Mejorar sistema de Sets**
  - Botón "Crear Set" más prominente
  - Permitir agregar ítems dinámicamente
  - Ejemplo: Set "Acciones" → ítems: "Aplaudir", "Levantar brazos", etc.

#### 1.3 Configuración de Fases
- [ ] **Agregar selector de Fase al configurar registro**
  - Línea Base
  - Tratamiento
  - Generalización
  - Mantenimiento
  - Mostrar fase en gráficos con líneas verticales

#### 1.4 Niveles de Ayuda Expandidos
- [ ] **Ampliar niveles de ayuda en la RESPUESTA** (máximo 2 por nivel)
  - AFT (Ayuda física total) ✅
  - AFP (Ayuda física parcial) ✅
  - AG (Ayuda gestual) ✅
  - **Sombra** ⚠️ AGREGAR
  - Modelado ✅
  - **ET (Ecoica total)** ⚠️ AGREGAR
  - **EP (Ecoica parcial)** ⚠️ AGREGAR
  - **VT (Verbal total)** ⚠️ AGREGAR
  - **VP (Verbal parcial)** ⚠️ AGREGAR
  - **Ayuda no específica** ⚠️ AGREGAR

- [ ] **Agregar niveles de ayuda en el ESTÍMULO** (máximo 2 por nivel)
  - **Posición** ⚠️ NUEVO
  - **Redundancia** ⚠️ NUEVO
  - **Movimiento** ⚠️ NUEVO
  - **Time Delay:**
    - 0 segundos
    - 3 segundos
    - 5 segundos
    - 10 segundos

#### 1.5 Configuración de Ensayos
- [ ] **Validar rango de ensayos: 3 a 10 por sesión**
  - Actualmente permite 3-20, ajustar a 3-10
  - Mostrar mensaje informativo sobre el límite

---

### **FASE 2: Registro por Porcentaje (Mejorado)**

#### 2.1 Interfaz de Registro
- [ ] **Botón "Grabar" después de cada ensayo**
  - Permitir guardar ensayo individual
  - Permitir salir y volver sin perder progreso
  
- [ ] **Botón "Finalizar" al completar todos los ensayos**
  - Consolidar datos
  - Generar resumen
  - Enviar a backend

- [ ] **Botones de navegación**
  - "Volver a editar" - para modificar configuración
  - "Volver" - regresar a Programación

#### 2.2 Edición de Plantilla Existente
- [ ] **Botón "Editar" en esquina superior derecha**
  - Modificar número de ensayos
  - Cambiar códigos disponibles
  - Actualizar sets

---

### **FASE 3: Registro por Frecuencia/Duración (Expandido)**

#### 3.1 Configuración de Conductas
- [ ] **Sistema de conductas múltiples**
  - Botón "Crear" para agregar conductas
  - Ejemplos: "Tomar lápiz", "Comer con cuchara", "Golpes a otros"
  - Selector de conductas en el registro

#### 3.2 Frecuencia - Códigos Expandidos
- [ ] **Agregar códigos específicos:**
  - Ocurrencia de conducta a aumentar
  - Ocurrencia con ayuda (con selector de nivel)
  - Presencia de conducta a disminuir
  - No responde

- [ ] **Cronómetro opcional con etiqueta "Calcular Tasa"**
  - Cálculo automático de tasa al finalizar
  - Generar gráfico de tasa

#### 3.3 Duración - Dimensiones Múltiples
- [ ] **Selector de tipo de medida:**
  - Duración
  - Latencia
  - Tiempo Entre Respuestas (TER)

- [ ] **Cronómetro con tiempos parciales**
  - Botón "Activar cronómetro"
  - Botón "Detener" al finalizar
  - Registro de tiempos parciales

- [ ] **Códigos para duración:**
  - Tiempo de ocurrencia de conducta a aumentar
  - Tiempo de ocurrencia con ayuda (con selector)
  - Tiempo de presencia de conducta a disminuir
  - No responde

#### 3.4 Gráficos Generados
- [ ] **Frecuencia:**
  - Gráfico de Frecuencia/Número de Respuestas
  - Gráfico de Tasa (eventos/minuto)

- [ ] **Duración:**
  - Gráfico de Duración Total
  - Gráfico de Duración Parcial
  - Gráfico de Latencia
  - Gráfico de TER

---

### **FASE 4: Registro por Intervalos (Completar)**

#### 4.1 Tipos de Intervalo
- [x] Intervalo Total ✅ (implementado)
- [x] Intervalo Parcial ✅ (implementado)
- [x] Intervalo de Tiempo Momentáneo ✅ (implementado)

#### 4.2 Configuración
- [x] Número de intervalos ✅
- [x] Tiempo de observación ✅
- [x] Espacios para ocurrencia/no ocurrencia ✅

#### 4.3 Mejoras Pendientes
- [ ] **Botón "Grabar" después de cada intervalo**
- [ ] **Botón "Finalizar" al completar todos los intervalos**
- [ ] **Permitir pausar y reanudar**
- [ ] **Botones de navegación (Volver, Editar)**

---

### **FASE 5: Gestión de Registros Múltiples**

#### 5.1 Selector de Registros
- [ ] **Dropdown en esquina superior derecha**
  - Mostrar lista de registros creados
  - Etiquetas: "Actual", "Nombre personalizado", "Antiguo"
  - Permitir cambiar entre registros

#### 5.2 Asociación Registro-Gráfico
- [ ] **Cada registro genera su propio gráfico**
  - Selector de gráfico vinculado al registro
  - Mantener historial de registros
  - Comparación entre registros (opcional)

---

### **FASE 6: Validaciones y Flujo de Trabajo**

#### 6.1 Control de Sesión (Terapeutas)
- [x] Modo Administrador: Registro siempre disponible ✅
- [ ] **Modo Terapeuta:** Requiere iniciar sesión
  - Implementar cuando se agregue autenticación
  - Validar rol antes de permitir registro sin sesión

#### 6.2 Persistencia y Sincronización
- [x] localStorage para recuperación ✅
- [ ] **Sincronización con backend**
  - API POST para guardar registros
  - API GET para cargar registros existentes
  - Manejo de conflictos

#### 6.3 Botones de Acción
- [ ] **"Grabar"** - Guardar ensayo/intervalo individual
- [ ] **"Finalizar"** - Completar registro y enviar
- [ ] **"Volver a editar"** - Modificar configuración
- [ ] **"Volver"** - Regresar a Programación
- [ ] **"Editar"** - Modificar plantilla existente

---

## 🎨 MEJORAS DE UX SUGERIDAS

### Interfaz de Configuración
- [ ] Wizard de configuración paso a paso
- [ ] Preview de cómo se verá el registro
- [ ] Tooltips explicativos en cada opción
- [ ] Validaciones en tiempo real

### Interfaz de Registro
- [ ] Indicador de progreso (X de Y ensayos completados)
- [ ] Confirmación antes de salir sin guardar
- [ ] Atajos de teclado para registro rápido
- [ ] Modo "Manos libres" con comandos de voz (futuro)

### Gráficos
- [ ] Selector de tipo de gráfico por registro
- [ ] Exportación individual de gráficos
- [ ] Anotaciones en puntos específicos
- [ ] Comparación lado a lado de múltiples registros

---

## 📊 TIPOS DE GRÁFICOS A IMPLEMENTAR

### Porcentaje
- [x] Gráfico de líneas con % correcto ✅
- [ ] Gráfico de barras apiladas (I/A/E/NR)
- [ ] Gráfico de tendencia con línea de regresión

### Frecuencia
- [ ] Gráfico de frecuencia absoluta
- [ ] Gráfico de tasa (eventos/min)
- [ ] Gráfico de frecuencia acumulada

### Duración
- [ ] Gráfico de duración total por sesión
- [ ] Gráfico de duración promedio
- [ ] Gráfico de latencia
- [ ] Gráfico de TER

### Intervalos
- [x] Gráfico de % de ocurrencia ✅
- [ ] Gráfico de intervalos individuales
- [ ] Gráfico de patrones temporales

---

## 🔧 ARQUITECTURA TÉCNICA

### Componentes a Crear/Modificar

```
src/features/dataCollection/
├── DataCollectionEngine.tsx          ✅ Existente
├── PercentageRecorder.tsx            ✅ Existente - MEJORAR
├── FrequencyRecorder.tsx             ✅ Existente - EXPANDIR
├── DurationRecorder.tsx              ⚠️ CREAR
├── LatencyRecorder.tsx               ⚠️ CREAR
├── IntervalRecorder.tsx              ✅ Existente - MEJORAR
├── TemplateManager.tsx               ⚠️ CREAR (gestión de plantillas)
├── PromptLevelSelector.tsx           ⚠️ CREAR (selector expandido)
├── PhaseSelector.tsx                 ⚠️ CREAR
└── ConductSelector.tsx               ⚠️ CREAR
```

### DTOs a Actualizar

```typescript
// Agregar a dataCollectionTypes.ts

export type PromptLevelResponse = 
  | 'full-physical' | 'partial-physical' | 'gestural' 
  | 'shadow' | 'model' | 'echoic-full' | 'echoic-partial'
  | 'verbal-full' | 'verbal-partial' | 'unspecified';

export type PromptLevelStimulus = 
  | 'position' | 'redundancy' | 'movement' 
  | 'time-delay-0' | 'time-delay-3' | 'time-delay-5' | 'time-delay-10';

export type Phase = 'baseline' | 'treatment' | 'generalization' | 'maintenance';

export interface Template {
  id: string;
  name: string;
  programId: string;
  dimension: MeasurementDimension;
  phase: Phase;
  numberOfTrials?: number;
  promptLevelsResponse: PromptLevelResponse[];
  promptLevelsStimulus: PromptLevelStimulus[];
  conducts?: string[];
  createdAt: string;
  isActive: boolean;
}
```

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Configuración de Plantilla
- [ ] Supervisor puede crear múltiples plantillas por programa
- [ ] Puede seleccionar fase del registro
- [ ] Puede configurar niveles de ayuda (respuesta y estímulo)
- [ ] Puede definir número de ensayos (3-10)
- [ ] Puede crear sets con ítems personalizados

### Registro de Datos
- [ ] Terapeuta puede seleccionar plantilla activa
- [ ] Puede registrar datos sin perder progreso al salir
- [ ] Puede grabar ensayos individuales
- [ ] Puede finalizar y enviar registro completo
- [ ] Puede volver a editar configuración

### Gráficos
- [ ] Cada plantilla genera su propio gráfico
- [ ] Gráficos muestran fases con líneas verticales
- [ ] Permite exportar gráficos individuales
- [ ] Muestra estadísticas por fase

---

## 🚀 PLAN DE IMPLEMENTACIÓN SUGERIDO

### Sprint 1 (1-2 semanas)
1. Ampliar niveles de ayuda (respuesta y estímulo)
2. Agregar selector de fases
3. Implementar sistema de plantillas múltiples
4. Mejorar configuración de sets

### Sprint 2 (1-2 semanas)
1. Crear DurationRecorder y LatencyRecorder
2. Expandir códigos de Frecuencia
3. Implementar selector de conductas
4. Agregar botones de navegación (Grabar, Finalizar, Volver)

### Sprint 3 (1 semana)
1. Mejorar IntervalRecorder con pausas
2. Implementar selector de registros/plantillas
3. Asociar registros con gráficos
4. Agregar validaciones completas

### Sprint 4 (1 semana)
1. Implementar gráficos adicionales (Tasa, TER, etc.)
2. Conectar con backend (API)
3. Testing completo
4. Documentación de usuario

---

## 📚 NOTAS TÉCNICAS

### Consideraciones de Diseño
- Mantener botones grandes (mín 44px) para uso en tablets
- Usar colores consistentes para cada tipo de respuesta
- Implementar confirmaciones para acciones destructivas
- Guardar automáticamente cada 30 segundos

### Performance
- Limitar número de plantillas activas por programa (máx 10)
- Implementar paginación en lista de registros históricos
- Comprimir datos antes de enviar a backend
- Usar debounce en inputs de configuración

### Accesibilidad
- Asegurar contraste de colores WCAG AA
- Agregar labels descriptivos a todos los inputs
- Implementar navegación por teclado
- Agregar mensajes de error claros

---

**Última actualización:** 2026-01-24
**Responsable:** Equipo de Desarrollo ABA
**Prioridad:** Alta
