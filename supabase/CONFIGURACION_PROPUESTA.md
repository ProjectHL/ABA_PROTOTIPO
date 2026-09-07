# Configuración propuesta de Supabase

Estado: referencia de configuración para una futura PoC. No aplicada.

## Auth

- Email y contraseña para usuarios invitados.
- Protección de contraseñas filtradas: activar antes de invitar usuarios reales.
- No usar user_metadata para autorización.
- La autorización clínica procede de memberships, student_assignments y
  get_student_capabilities.

## API y claves

- El navegador usa únicamente NEXT_PUBLIC_SUPABASE_URL y una publishable key.
- No exponer service_role, secret keys ni credenciales de base de datos.
- Los grants de tablas y funciones se definen junto a sus políticas RLS.

## Datos clínicos

- RLS habilitado en todas las tablas del esquema public.
- Funciones helper en private, sin ejecución directa desde clientes.
- Eventos de auditoría solo por trigger o helper interno; no por inserción de
  navegador.

## Ambientes

- Producción, staging y desarrollo aislado deben usar proyectos distintos.
- La rama de pruebas no está disponible con el plan actual de Supabase.
- Antes de cambiar permisos, usar fixtures con dos organizaciones y usuarios
  de prueba, nunca datos clínicos reales.
