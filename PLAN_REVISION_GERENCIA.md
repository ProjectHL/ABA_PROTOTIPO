# Plan de Implementación - Revisión Gerencia

Este documento detalla las tareas necesarias para cubrir los requerimientos de la revisión de gerencia.

## 1. Dashboard Principal

- [ ] **Ajuste de Bienvenida**
    - Cambiar saludo fijo "Buenas noches" por lógica dinámica según hora local o usar un genérico "Hola".
- [ ] **Terminología de Sesiones**
    - Cambiar etiqueta "en vivo" por "en curso" en Card de Sesiones Activas.
    - Cambiar etiqueta "finalizadas" por "concluidas" en Card de Sesiones Concluidas.
    - Cambiar subtítulo "historial reciente de intervenciones" por "historial reciente de sesiones concluidas".
- [ ] **Gráfico: Sesiones por Estudiante**
    - Configurar Eje Y para mostrar exclusivamente números enteros (evitar decimales como 0.5, 0.75).
- [ ] **Gráfico: Rendimiento por Programa**
    - **Cambio de métrica**: Reemplazar gráfico actual por "Programas Logrados" (Semanal / Mensual).
    - **Lógica**: Calcular suma total de programas que cambiaron a status "logrado" en el periodo.
    - **Visualización**: Permitir desglose por estudiante (opcional/filtro).
- [ ] **Acceso Rápido: Modo Aplicador**
    - Agregar ícono/botón "Modo Aplicador" en el Dashboard para que Administradores/Supervisores inicien toma de datos rápidamente.

## 2. Gestión de Equipo (`/team`)

- [ ] **Edición de Perfil**
    - Habilitar opción de subir Avatar además de la foto existente.
- [ ] **Refinamiento de Roles**
    - Actualizar nomenclatura y permisos:
        - "Administrador" (Acceso total).
        - "Supervisor" (Acceso total o permiso de edición en carpetas).
        - "Aplicador" (Reemplaza término "Terapeuta").

## 3. Carpetas de Estudiantes

- [ ] **Filtrado de Estado**
    - Implementar toggle o filtro para ver:
        - "Vigentes" (Recibiendo servicios actualmente).
        - "Antiguos" (Servicios finalizados).
- [ ] **Lógica de Estudiantes Antiguos**
    - Asegurar persistencia de datos (simulada) para registros antiguos.
    - Restringir acceso a familias para estudiantes "Antiguos".
    - Habilitar opción de "Reactivar" carpeta.

## 4. Ejecución de Sesiones y Programación

- [ ] **Limpieza de UI**
    - Retirar texto "Modo de administración: Registro siempre disponible".
    - Retirar texto "opcional" en inicio de sesión.
- [ ] **Modo Aplicador en Programación**
    - Implementar vista específica de "Aplicador" para registro de datos.
    - Botón "Iniciar sesión" visible exclusivamente en este modo.
- [ ] **Flujo de Sesión**
    - Revisar lógica de re-ingreso a sesión "en curso" tras finalizar (bloquear edición de programas pasados, solo ver última actualización).

## 5. Diseño de Programas: Adquisición de Habilidades

- [ ] **Corrección de Bugs**
    - 🐛 **CRÍTICO**: Investigar y corregir fallo al guardar un nuevo programa ("No se guarda un nuevo programa").
- [ ] **Gestión de Estados**
    - Añadir control explícito para cambiar estado de programa (ej. Activo -> Logrado).
- [ ] **Configuración de Sets**
    - Incluir estados por Set: Activo, Logrado, Pausado.
- [ ] **Nuevos Campos de Configuración**
    - Agregar campos de texto obligatorios tras la definición de sets:
        1. Ayudas y desvanecimiento.
        2. Procedimiento de corrección de error.
        3. Criterio.
        4. Procedimiento de generalización y mantención.

## 6. Diseño de Programas: Manejo de Conducta

- [ ] **Campos Generales**
    - Hacer "Definición operacional" opcional.
    - Eliminar campo "Análisis funcional".
- [ ] **Funciones de la Conducta**
    - Restringir opciones a lista cerrada con descripciones actualizadas:
        - **Atención**: Mantenida por acceso a atención.
        - **Escape**: Mantenida por escape de aversivos/demandas.
        - **Automática/sensorial**: Mantenida por estimulación sensorial.
        - **Tangible**: Mantenida por acceso a tangibles (no social).
- [ ] **Nuevos Campos Específicos**
    - **Conductas Precursoras**: Campo + Descripción ("conductas justo antes de escalar...").
    - **Conducta de Reemplazo**: Campo + Descripción ("funcionalmente equivalente...").
    - **Plan de Crisis**: Campo opcional al final.
    - **Dimensión Actual de la Conducta**: Campo + Ejemplo placeholder ("Gritos: duración 30 min...").
    - **Criterio de Logro**: Campo + Ejemplo placeholder ("Gritos: < 1 min en 3 sesiones...").
- [ ] **Ajuste de Textos**
    - Actualizar descripción en Procedimiento de Intervención: "Incluye estrategias de prevención y reacción de la conducta".
