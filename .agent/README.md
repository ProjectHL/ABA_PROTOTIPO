# Paquete técnico ABA para el Dev y su IA

Preparado el 2026-10-20 dentro de la carpeta `.agent/` del proyecto Desktop ABA.

## Archivos

- [Guía técnica completa](GUIA_TECNICA_ABA_PARA_DEV_E_IA.md): arquitectura, diagramas, perfiles, frontend, backend, DB, flujos, offline, operación y estado de cierre.
- [Inventario técnico JSON](INVENTARIO_TECNICO_ABA.json): 72 tablas públicas tipadas, 88 funciones, 26 rutas, 103 migraciones y funciones Edge; sin registros de pacientes ni credenciales.

Leer primero la guía y usar el inventario para búsquedas precisas. Los enlaces de la guía apuntan al código y evidencia del mismo repositorio. Compartir este paquete junto con el código autorizado para conservar esas referencias; no incluir automáticamente `.aba.local/` o archivos de entorno.

Git incluye expresamente los tres documentos de este paquete. El resto del contenido de `.agent/` sigue excluido para conservar privados los archivos locales del agente.

## Prompt sugerido para la IA del Dev

> Lee `.agent/GUIA_TECNICA_ABA_PARA_DEV_E_IA.md` y consulta `.agent/INVENTARIO_TECNICO_ABA.json` cuando necesites detalles. Resume qué hace ABA, su arquitectura frontend/backend/DB, los roles y permisos efectivos, y los recorridos de clínica, supervisor y técnico. Explica idempotencia, concurrencia, adjuntos, offline y aislamiento entre clínicas. Distingue lo implementado de lo validado, pendiente o diferido; cita archivos del repositorio y no conviertas evidencia histórica en validación actual. Enumera los pendientes antes de VPS. Si encuentras una discrepancia, indica las fuentes y qué comprobar. No ejecutes comandos, modifiques archivos, consultes secretos ni conectes servicios para producir este resumen.

## Límites de vigencia

La guía se basa en lectura estática del código y en el checkpoint QA del 2026-10-19. No acredita que Docker esté activo, que la DB actual tenga todas las migraciones aplicadas o que se haya desplegado a VPS. El JSON cubre el esquema público representado por tipos generados; SQL sigue siendo autoridad para políticas, grants y objetos privados.
