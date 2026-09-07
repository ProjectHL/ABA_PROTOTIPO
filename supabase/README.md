# Supabase — configuración simulada

Esta carpeta documenta la configuración futura de Supabase para ABA_PROTOTIPO.
No contiene migraciones ejecutables, credenciales, datos clínicos ni acciones
aplicadas al proyecto remoto.

## Estado

- Entorno remoto de referencia: ABA_staging.
- Las configuraciones de seguridad permanecen simuladas hasta disponer de un
  entorno de desarrollo aislado.
- No aplicar los bloques SQL de estos documentos directamente en staging.

## Estructura

- migrations/: especificaciones de cambios de esquema, grants y RLS.
- tests/: matriz de pruebas de autorización y aislamiento.

## Cuando se retome Supabase

1. Crear un entorno de desarrollo aislado.
2. Comparar las firmas reales de las RPC con la especificación.
3. Convertir la especificación en una migración SQL versionada.
4. Ejecutar la matriz de pruebas con usuarios de dos organizaciones.
5. Revisar Security Advisor antes de promover cambios.
