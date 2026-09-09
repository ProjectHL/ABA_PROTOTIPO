# Simulación de migración — SDD-03 RPC, RLS y auditoría

> Documento histórico conservado para trazabilidad. No representa el estado actual.
> Las migraciones ejecutables y el plan vigente están en `supabase/migrations/` y
> `SPEC_PLAN_MEJORAS_SUPABASE_BACKEND_2026-09-08.md`.

Estado: simulación. No aplicar en ABA_staging.

## Objetivo

Reducir la superficie de funciones SECURITY DEFINER y conservar solo las RPC de
negocio que requieren clientes autenticados. Los helpers privados no son una API
pública.

## Cambios proyectados

    -- SIMULACIÓN: validar firmas y consumidores en un entorno aislado antes de ejecutar.
    revoke execute on all functions in schema public from public, anon;

    grant execute on function public.get_student_capabilities(uuid) to authenticated;
    grant execute on function public.create_client(...) to authenticated;
    grant execute on function public.set_student_assignment(...) to authenticated;
    grant execute on function public.request_student_authorization(...) to authenticated;
    grant execute on function public.decide_student_authorization(...) to authenticated;
    grant execute on function public.revoke_student_authorization(...) to authenticated;
    grant execute on function public.append_clinical_history_entry(...) to authenticated;
    grant execute on function public.append_clinical_history_entries(...) to authenticated;
    grant execute on function public.save_client_context(...) to authenticated;
    grant execute on function public.record_consent_reference(...) to authenticated;

    revoke execute on function private.has_student_capability(uuid, text)
      from public, anon, authenticated;
    revoke execute on function private.is_primary_student_supervisor(uuid)
      from public, anon, authenticated;
    revoke execute on function private.student_assignment_role(uuid)
      from public, anon, authenticated;
    revoke execute on function private.audit_student_access_event(...)
      from public, anon, authenticated;

## Reglas obligatorias

- Mantener SET search_path TO '' en cada función SECURITY DEFINER.
- Cada RPC pública valida auth.uid(), membresía, organización y capacidad.
- student_access_audit_events permanece sin acceso desde navegador: la escritura
  ocurre solo por helper o trigger interno y la lectura administrativa vive fuera
  del esquema expuesto.
- Las firmas con ... son marcadores: obtenerlas de PostgreSQL antes de generar
  la migración real.

## Evidencia requerida antes de aplicar

- La ejecución directa de helpers privados está denegada.
- Las diez RPC continúan funcionando para el usuario autorizado.
- Ninguna RPC permite operar sobre un cliente de otra organización.
- Security Advisor no reporta funciones SECURITY DEFINER expuestas sin una
  excepción aprobada y documentada.
