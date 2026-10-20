# Plan de mejoras Supabase — salida PoC

## Resumen ejecutivo

Objetivo: llevar el candidato funcional local a una PoC clínica con mínimo privilegio, recuperación y HTTPS. La condición de salida es: hardening validado local y staging, protección Auth habilitada, restore ensayado, UAT aceptada y entorno publicado sin datos dummy.

Riesgos que impiden datos reales: S01–S04 y S07. Se preservan contratos CRUD, datos sintéticos y el backend Supabase gestionado; Storage/Realtime siguen fuera de alcance.

## Matriz de decisiones

| Decisión | Opciones reales | Recomendación | Motivo | Responsable |
|---|---|---|---|---|
| Protección de contraseñas | Habilitar / aceptar riesgo | Habilitar antes de UAT | Advisor P1 y bajo impacto funcional | Propietario |
| Registro Auth | Email/anónimo público / sólo invitaciones | Deshabilitar ambos registros públicos | Sólo invitaciones es el contrato del MVP | Propietario |
| Recuperación Supabase | Subir a Pro / dumps manuales cifrados | Pro para uso clínico; dump manual como contingencia previa | Free no incluye backups diarios gestionados | Propietario |
| Dirección de prueba | Dominio final / URL temporal HTTPS | URL temporal HTTPS si el dominio no está listo | Evita bloquear la PoC | Propietario + técnico |
| Índices sin uso | Retirar / conservar | Conservar durante PoC | El volumen actual no prueba inutilidad | Técnico |

## Gates

### SG1 — Hardening local — CERRADO

- Hallazgos: S01 y S02. S06 queda como mantenimiento P3 de código heredado no activo.
- Cambios: migración de mínimo privilegio.
- Evidencia: typecheck y una corrida negativa/positiva consolidada con dos clínicas y los tres perfiles.
- Cierre: lectura/CRUD normal funcionan; acceso cruzado, auditoría directa y privilegios destructivos fallan.
- Rollback: migración compensatoria que repone únicamente grants comprobados; no revertir datos.

### SG2 — Promoción controlada a staging

- Hallazgos: S03, S05 y S07.
- Entrada: SG1 cerrado y backup identificado.
- Orden: F1 → F2 → hardening; regenerar tipos si cambia el catálogo; desplegar Edge Function sólo si difiere.
- Evidencia: historial sin drift inesperado, advisors revisados y recorrido sintético autenticado.
- Cierre: staging reproduce el candidato local sin usar pacientes reales.
- Rollback: detener aplicación, aplicar compensación versionada o restaurar según el tipo de fallo.

### SG3 — Operación y publicación

- Hallazgos: S03, S04.
- Cambios: protección Auth, secretos/orígenes, VPS Linux, HTTPS, healthcheck, logs sin contenido clínico y restore ensayado.
- Cierre: UAT profesional aceptada, limpieza por lote comprobada y listas clínicas vacías.
- Señal de aborto: fallo de aislamiento, restore, HTTPS, login o persistencia.

## Backlog ejecutable

| ID | Gate | Prioridad | Trabajo | Objetos | Evidencia requerida | Dependencias | Estado |
|---|---|---|---|---|---|---|---|
| SEC-01 | SG1 | P1 | Aplicar mínimo privilegio | Migración `20260910180000` | Catálogo + QA consolidado | Ninguna | VERIFICADO LOCAL |
| SEC-02 | SG1 | P3 | Retirar o alinear contexto de rol heredado antes de reactivarlo | `RoleContext.tsx` | Revisión de rutas activas | Reactivación de UI antigua | DIFERIDO, FUERA DEL CANDIDATO |
| SEC-03 | SG2 | P1 | Promover F1/F2/hardening | Staging | Preflight estructural PASS; faltan historial posterior + advisors + smoke | SG1 + autorización | LISTO PARA PROMOVER |
| SEC-04 | SG2 | P1 | Subir a Pro y habilitar leaked-password protection, o aceptar controles compensatorios Free | Auth | Advisor sin hallazgo o aceptación registrada | Decisión de plan + acceso propietario | BLOQUEADO POR DECISIÓN |
| SEC-05 | SG2 | P1 | Deshabilitar signup email/anónimo y conservar invitaciones | Auth | Ambos controles del preflight en `true` | Acceso propietario | BLOQUEADO POR ACCESO |
| OPS-01 | SG3 | P1 | Elegir Pro o automatizar dump cifrado; restore local ya ensayado | Supabase/VPS | Backup recuperable + RPO/RTO | Decisión de plan y almacenamiento seguro | BLOQUEADO POR DECISIÓN |
| OPS-02 | SG3 | P1 | Desplegar Next.js con HTTPS | VPS | healthcheck y login | VPS/URL | PENDIENTE |
| UAT-01 | SG3 | P1 | Aceptación y limpieza por lote | App + Supabase | Checklist profesional | OPS-01/02 | PENDIENTE |
| UAT-02 | SG2 | P1 | Validar tres perfiles secuencialmente con la cuenta designada | Auth/membresías/asignaciones | Sesiones nuevas, eventos y restauración a admin | SEC-03 + segundo admin sintético | LISTO, REQUIERE AUTORIZACIÓN |

Puede ejecutar el equipo técnico: preparación reproducible de promoción y despliegue. El paquete Docker/Compose valida localmente y `next build` pasa. Requiere decisión/acceso del propietario: SEC-04, VPS/URL, ventana de UAT y autorización explícita para mutar staging.
