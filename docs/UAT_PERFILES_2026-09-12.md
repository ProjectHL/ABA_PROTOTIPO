# UAT secuencial de perfiles — 2026-09-12

Entorno: `ABA_staging` con aplicación Next.js local y datos exclusivamente sintéticos.

Cuenta designada: identificada en el runbook operativo; no se registran contraseñas,
tokens ni secretos en esta evidencia.

## Resultado por perfil

| Perfil | Resultado | Evidencia observada |
|---|---|---|
| Admin / clínica | PASS previo a transiciones | Cabecera de admin, acceso a Administración y gestión persistida del perfil de resguardo. |
| Profesional / supervisor | PASS | Cabecera correcta; carpetas autorizadas; edición de ficha, contexto, historial, consentimiento y programas disponible; sin acceso a Administración ni Asignaciones globales. |
| Profesional / técnico | PASS | Cabecera correcta; sin alta, archivo ni edición de ficha/programa; lectura clínica disponible; `Nueva captura` disponible; cancelar cerró el modal sin persistir. |

## Recuperación de contraseña

Resultado: **PASS manual**.

- Se corrigió `Site URL` a `http://localhost:3000`.
- Se añadió `http://localhost:3000/auth/confirm` a las Redirect URLs.
- La aplicación incorporó un receptor global para enlaces de recuperación con
  fragmento implícito y eliminó el fragmento antes de continuar.
- La cuenta designada completó el cambio y accedió a `/students`.

## Restauración

Resultado: **PASS por consulta directa**.

- La cuenta designada volvió a membresía `admin/active`.
- Su asignación original volvió a `supervisor`, primaria y activa.
- La cuenta de resguardo volvió a membresía `clinician/active`.
- Su asignación volvió a `therapist`, no primaria y activa.
- Quedó exactamente un admin activo y una asignación primaria activa para la
  ficha sintética seleccionada.
- No se crearon ni modificaron registros clínicos durante el recorrido.

## Pendiente para cierre del acta

- Iniciar una sesión nueva con la cuenta designada y confirmar visualmente la
  cabecera `Admin / clínica` y el acceso a `Administración` después de la
  restauración.

