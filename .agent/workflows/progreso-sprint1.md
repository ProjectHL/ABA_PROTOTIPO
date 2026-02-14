---
description: Progreso Sprint 1 - Módulo de Registros (Sesión 2026-01-24)
---

# 📊 Progreso del Módulo de Registros - Sprint 1

**Fecha:** 2026-01-24  
**Sesión:** Implementación de mejoras al sistema de registros  
**Estado:** Sprint 1 parcialmente completado

---

## ✅ COMPLETADO HOY

### 1. Niveles de Ayuda Expandidos
**Archivo:** `src/api/dataCollectionTypes.ts`

#### Niveles de Ayuda en la RESPUESTA (10 niveles)
- [x] AFT (Ayuda Física Total)
- [x] AFP (Ayuda Física Parcial)
- [x] AG (Ayuda Gestual)
- [x] Sombra ⭐ NUEVO
- [x] Modelado
- [x] ET (Ecoica Total) ⭐ NUEVO
- [x] EP (Ecoica Parcial) ⭐ NUEVO
- [x] VT (Verbal Total) ⭐ NUEVO
- [x] VP (Verbal Parcial) ⭐ NUEVO
- [x] Ayuda no específica ⭐ NUEVO

#### Niveles de Ayuda en el ESTÍMULO (7 niveles) ⭐ NUEVO
- [x] Posición
- [x] Redundancia
- [x] Movimiento
- [x] Time Delay 0 segundos
- [x] Time Delay 3 segundos
- [x] Time Delay 5 segundos
- [x] Time Delay 10 segundos

#### Funciones Helper Creadas
- [x] `getPromptLevelLabel(level: PromptLevelResponse): string`
- [x] `getPromptLevelStimulusLabel(level: PromptLevelStimulus): string`
- [x] `getPhaseLabel(phase: Phase): string`
- [x] `getPhaseColor(phase: Phase): string`

### 2. Sistema de Fases
**Archivo:** `src/api/dataCollectionTypes.ts`

- [x] Type `Phase` creado: 'baseline' | 'treatment' | 'generalization' | 'maintenance'
- [x] Labels en español: Línea Base, Tratamiento, Generalización, Mantenimiento
- [x] Colores asignados: gray, blue, violet, green

### 3. PercentageRecorder Mejorado
**Archivo:** `src/features/dataCollection/PercentageRecorder.tsx`

#### Configuración
- [x] Selector de Fase agregado (Select con 4 opciones)
- [x] Límite de ensayos ajustado: 3-10 (antes 3-20)
- [x] Descripción actualizada: "Entre 3 y 10 ensayos por sesión (recomendado ABA)"

#### Interfaz de Registro
- [x] Badge de fase visible en el header
- [x] Menu de ayudas expandido a 280px
- [x] Menu organizado en secciones con dividers:
  - Ayudas físicas/gestuales
  - Ayudas verbales/ecoicas
  - Ayuda no específica

#### Navegación
- [x] Botón "Volver a Configurar" (permite editar sin perder datos)
- [x] Botón "Cancelar" (sale del registro)
- [x] Botón "Finalizar y Guardar" (verde, con validación)
- [x] Layout mejorado: `justify="space-between"`

### 4. Modo Administrador
**Archivo:** `src/features/programs/ProgramsDashboard.tsx`

- [x] Registro siempre disponible para administradores
- [x] Texto informativo: "Modo Administrador: Registro siempre disponible"
- [x] Botón de sesión marcado como "(Opcional)"
- [x] Tooltips actualizados en botones de registro

---

## 📋 PENDIENTE PARA MAÑANA

### Sprint 1 - Tareas Restantes

#### 1. Sistema de Plantillas Múltiples
**Prioridad:** Alta  
**Archivo a crear:** `src/features/dataCollection/TemplateManager.tsx`

- [ ] Crear componente TemplateManager
- [ ] Botón "Más" (+) en esquina superior derecha
- [ ] Permitir crear múltiples plantillas por programa
- [ ] Selector de plantilla: Dropdown con lista
  - "Actual" (plantilla activa)
  - Plantillas personalizadas (con nombre)
  - "Antiguo" (plantillas archivadas)
- [ ] Cada plantilla debe tener:
  - Nombre único
  - Fase asociada
  - Configuración de ensayos
  - Niveles de ayuda habilitados
  - Sets de estímulos
- [ ] Botón "Editar" para modificar plantilla existente
- [ ] Asociar cada plantilla con su propio gráfico

**DTO a crear:**
```typescript
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
  sets?: StimulusSet[];
  createdAt: string;
  isActive: boolean;
}
```

#### 2. Mejorar Configuración de Sets
**Prioridad:** Media  
**Archivo a modificar:** `src/features/dataCollection/PercentageRecorder.tsx`

- [ ] Agregar sección de "Sets de Estímulos" en configuración
- [ ] Botón "Crear Set" más prominente
- [ ] Permitir agregar múltiples sets
- [ ] Cada set debe tener:
  - Nombre del set (ej: "Acciones Básicas")
  - Lista de ítems (ej: "Aplaudir", "Levantar brazos")
  - Botón para agregar/eliminar ítems
- [ ] Mostrar sets en el registro (opcional)

#### 3. Selector de Niveles de Ayuda en Configuración
**Prioridad:** Media

- [ ] Permitir al supervisor seleccionar qué niveles de ayuda estarán disponibles
- [ ] Máximo 2 niveles por categoría (según especificación)
- [ ] Checkbox group para seleccionar niveles
- [ ] Validación: al menos 1 nivel debe estar seleccionado

---

### Sprint 2 - Próximas Funcionalidades

#### 1. DurationRecorder y LatencyRecorder
**Prioridad:** Alta  
**Archivos a crear:**
- `src/features/dataCollection/DurationRecorder.tsx`
- `src/features/dataCollection/LatencyRecorder.tsx`

**Funcionalidades:**
- [ ] Selector de tipo de medida: Duración, Latencia, TER
- [ ] Cronómetro con Start/Stop/Reset
- [ ] Registro de tiempos parciales
- [ ] Códigos específicos:
  - Tiempo de ocurrencia de conducta a aumentar
  - Tiempo de ocurrencia con ayuda
  - Tiempo de presencia de conducta a disminuir
  - No responde

#### 2. FrequencyRecorder Expandido
**Prioridad:** Alta  
**Archivo a modificar:** `src/features/dataCollection/FrequencyRecorder.tsx`

- [ ] Agregar selector de conductas múltiples
- [ ] Códigos expandidos:
  - Ocurrencia de conducta a aumentar
  - Ocurrencia con ayuda (con selector de nivel)
  - Presencia de conducta a disminuir
  - No responde
- [ ] Etiqueta "Calcular Tasa" en cronómetro
- [ ] Generar gráfico de tasa automáticamente

#### 3. IntervalRecorder Mejorado
**Prioridad:** Media  
**Archivo a modificar:** `src/features/dataCollection/IntervalRecorder.tsx`

- [ ] Botón "Grabar" después de cada intervalo
- [ ] Permitir pausar y reanudar
- [ ] Botón "Volver a editar"
- [ ] Mejorar feedback visual del intervalo actual

#### 4. Selector de Conductas
**Prioridad:** Alta  
**Archivo a crear:** `src/features/dataCollection/ConductSelector.tsx`

- [ ] Componente reutilizable para seleccionar conductas
- [ ] Botón "Crear" para agregar nuevas conductas
- [ ] Lista de conductas predefinidas
- [ ] Ejemplos: "Tomar lápiz", "Comer con cuchara", "Golpes a otros"
- [ ] Permitir selección múltiple

---

## 🎯 GRÁFICOS PENDIENTES

### Tipos de Gráficos a Implementar

#### Porcentaje
- [x] Gráfico de líneas con % correcto ✅
- [ ] Gráfico de barras apiladas (I/A/E/NR)
- [ ] Gráfico de tendencia con línea de regresión

#### Frecuencia
- [ ] Gráfico de frecuencia absoluta
- [ ] Gráfico de tasa (eventos/min)
- [ ] Gráfico de frecuencia acumulada

#### Duración
- [ ] Gráfico de duración total por sesión
- [ ] Gráfico de duración promedio
- [ ] Gráfico de latencia
- [ ] Gráfico de TER

#### Intervalos
- [x] Gráfico de % de ocurrencia ✅
- [ ] Gráfico de intervalos individuales
- [ ] Gráfico de patrones temporales

---

## 📝 NOTAS TÉCNICAS

### Decisiones de Diseño Tomadas

1. **Límite de Ensayos:** Reducido a 3-10 según mejores prácticas ABA
2. **Organización de Ayudas:** Separadas en físicas y verbales para mejor UX
3. **Fases por Defecto:** "Tratamiento" como fase inicial más común
4. **Navegación:** Botón "Volver a Configurar" permite flexibilidad sin pérdida de datos

### Consideraciones para Mañana

1. **Persistencia de Plantillas:** Decidir si usar localStorage o backend directo
2. **Validación de Niveles:** Implementar límite de 2 niveles por categoría
3. **Sets de Estímulos:** Definir estructura de datos y UI
4. **Testing:** Verificar funcionamiento en navegador antes de continuar

---

## 🔧 COMANDOS ÚTILES

```bash
# Desarrollo
npm run dev

# Ver archivo de tareas
code .agent/workflows/registros-detalle-flujo.md

# Ver este archivo
code .agent/workflows/progreso-sprint1.md
```

---

**Última actualización:** 2026-01-24 17:59  
**Próxima sesión:** 2026-01-25  
**Responsable:** Equipo de Desarrollo ABA
