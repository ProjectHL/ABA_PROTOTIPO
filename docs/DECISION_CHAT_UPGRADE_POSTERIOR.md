# Decisión de alcance — chat como upgrade posterior

Fecha efectiva: 2026-09-21.

## Decisión

El chat profesional, familiar y sus adjuntos quedan fuera del release actual de ABA. No son criterio de cierre de R3, R4 ni del QA R5 de esta versión. Se retomarán como un upgrade posterior con alcance, UX, seguridad y aceptación propios.

## Aplicación en el release actual

- No se muestran accesos a chat en el shell, portal familiar ni listado de estudiantes.
- `/chat` no expone una interfaz operativa y responde como ruta no disponible.
- Las filas `CHAT-*` y la acción familiar de consulta de chat se clasifican `DIFERIDO UPGRADE` en la matriz; no cuentan como pendientes del release actual ni como funcionalidad integrada/aceptada.
- R5 excluye Realtime, mensajería y adjuntos de chat. Notificaciones y recordatorios que no dependen de chat siguen dentro del alcance.

## Conservación deliberada

Los contratos, módulos, tipos generados y migraciones de chat existentes se conservan dormidos. No se revierten ni se borran porque contienen trabajo reutilizable y su eliminación sería destructiva para el upgrade futuro. Su presencia en el repositorio o en el esquema no habilita el producto ni acredita QA.

## Gate del upgrade futuro

Antes de reactivar chat se deberá revisar como un paquete independiente: autorización exacta de participantes, revocación, RLS, recuperación Realtime, cursores de lectura, adjuntos privados, retención, notificaciones, aislamiento tenant, UX y QA funcional. La navegación sólo podrá restituirse después de esa aceptación.
