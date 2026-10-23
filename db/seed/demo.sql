-- Synthetic demo data for a DEVELOPMENT or TEST environment only.
-- Never run this against production: these are fictional clinical records.
--
-- It is not applied by `npm run db:migrate`; the migrate service only reads
-- db/bootstrap.sql and db/migrations. Run it explicitly with:
--   npm run seed:demo
--
-- Requires an active clinic with an active admin (first-run setup or
-- `npm run user:create`). Idempotent: students use fixed ids and existing
-- rows are skipped, so re-running does not duplicate anything.

do $$
declare
    v_organization uuid;
    v_admin uuid;
    v_commands jsonb;
    v_command jsonb;
    v_result jsonb;
begin
    select m.organization_id, m.user_id
      into v_organization, v_admin
      from public.memberships m
      join public.organizations o on o.id = m.organization_id
     where m.role = 'admin'
       and m.status = 'active'
       and o.status = 'active'
     order by m.created_at
     limit 1;

    if v_organization is null then
        raise exception 'No hay una clínica activa con administrador. Ejecuta la configuración inicial primero.';
    end if;

    v_commands := jsonb_build_array(
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000001-0000-4000-8000-000000000001',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-001',
                'fullName', 'Sofía Ramírez Soto',
                'initials', 'SR',
                'rut', '12345678-5',
                'photoAttachmentId', null,
                'birthDate', '2018-04-12',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con su madre y un hermano menor',
                'reportedDiagnosis', 'Trastorno del espectro autista nivel 1',
                'consultationReason', 'Evaluación inicial de comunicación funcional',
                'context', jsonb_build_object(
                    'home', 'Departamento en zona urbana, rutina estable',
                    'school', 'Jardín de lenguaje, jornada completa',
                    'adaptations', 'Apoyos visuales y anticipación de cambios'
                ),
                'people', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000001-0000-4000-8000-000000000001',
                    'fullName', 'María Soto Fuentes',
                    'initials', 'MS',
                    'birthDate', '1990-02-03',
                    'relationship', 'Madre',
                    'phone', '+56 9 1111 1111',
                    'email', 'maria.soto@example.test',
                    'roles', jsonb_build_array('family', 'contact'),
                    'isPrimaryContact', true
                )),
                'siblings', '[]'::jsonb
            )
        ),
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000002-0000-4000-8000-000000000002',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-002',
                'fullName', 'Mateo Fuentes Díaz',
                'initials', 'MF',
                'rut', '9876543-3',
                'photoAttachmentId', null,
                'birthDate', '2016-09-30',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con ambos padres',
                'reportedDiagnosis', 'Trastorno del espectro autista nivel 2',
                'consultationReason', 'Apoyo en habilidades sociales y autonomía',
                'context', jsonb_build_object(
                    'home', 'Casa con patio, rutinas visuales en el hogar',
                    'school', 'Escuela regular con programa de integración',
                    'adaptations', 'Pausas sensoriales y agenda pictográfica'
                ),
                'people', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000002-0000-4000-8000-000000000002',
                    'fullName', 'Carolina Díaz Vera',
                    'initials', 'CD',
                    'birthDate', '1987-11-21',
                    'relationship', 'Madre',
                    'phone', '+56 9 2222 2222',
                    'email', 'carolina.diaz@example.test',
                    'roles', jsonb_build_array('family', 'contact'),
                    'isPrimaryContact', true
                )),
                'siblings', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000003-0000-4000-8000-000000000003',
                    'fullName', 'Josefa Fuentes Díaz',
                    'initials', 'JF',
                    'birthDate', '2020-06-15',
                    'notes', 'Hermana menor, sin diagnóstico reportado'
                ))
            )
        ),
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000003-0000-4000-8000-000000000003',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-003',
                'fullName', 'Emilia Torres Lagos',
                'initials', 'ET',
                'rut', '15678901-1',
                'photoAttachmentId', null,
                'birthDate', '2019-01-08',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con abuela materna',
                'reportedDiagnosis', 'Retraso del lenguaje expresivo',
                'consultationReason', 'Estimulación del lenguaje y comunicación',
                'context', jsonb_build_object(
                    'home', 'Casa de la abuela, rutina diaria estable',
                    'school', 'Sala cuna mayor',
                    'adaptations', 'Modelado del lenguaje y turnos de espera'
                ),
                'people', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000004-0000-4000-8000-000000000004',
                    'fullName', 'Rosa Lagos Paredes',
                    'initials', 'RL',
                    'birthDate', '1962-03-17',
                    'relationship', 'Abuela',
                    'phone', '+56 9 3333 3333',
                    'email', null,
                    'roles', jsonb_build_array('family', 'contact'),
                    'isPrimaryContact', true
                )),
                'siblings', '[]'::jsonb
            )
        ),
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000004-0000-4000-8000-000000000004',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-004',
                'fullName', 'Tomás Herrera Muñoz',
                'initials', 'TH',
                'rut', '20345678-6',
                'photoAttachmentId', null,
                'birthDate', '2014-12-02',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con madre y padre en régimen compartido',
                'reportedDiagnosis', 'Trastorno por déficit atencional con hiperactividad',
                'consultationReason', 'Manejo de conducta y organización de tareas',
                'context', jsonb_build_object(
                    'home', 'Dos hogares, rutinas coordinadas entre ambos',
                    'school', 'Sexto básico, apoyo psicopedagógico',
                    'adaptations', 'Instrucciones cortas y pausas activas'
                ),
                'people', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'a0000005-0000-4000-8000-000000000005',
                        'fullName', 'Paula Muñoz Reyes',
                        'initials', 'PM',
                        'birthDate', '1985-07-09',
                        'relationship', 'Madre',
                        'phone', '+56 9 4444 4444',
                        'email', 'paula.munoz@example.test',
                        'roles', jsonb_build_array('family', 'contact'),
                        'isPrimaryContact', true
                    ),
                    jsonb_build_object(
                        'id', 'a0000006-0000-4000-8000-000000000006',
                        'fullName', 'Diego Herrera Salas',
                        'initials', 'DH',
                        'birthDate', '1983-05-25',
                        'relationship', 'Padre',
                        'phone', '+56 9 5555 5555',
                        'email', null,
                        'roles', jsonb_build_array('family'),
                        'isPrimaryContact', false
                    )
                ),
                'siblings', '[]'::jsonb
            )
        ),
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000005-0000-4000-8000-000000000005',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-005',
                'fullName', 'Isidora Vega Contreras',
                'initials', 'IV',
                'rut', '11222333-9',
                'photoAttachmentId', null,
                'birthDate', '2021-03-19',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con madre y padre',
                'reportedDiagnosis', 'Sospecha de trastorno del espectro autista',
                'consultationReason', 'Primera consulta por comunicación social',
                'context', jsonb_build_object(
                    'home', 'Departamento, sin jardín',
                    'school', 'Aún no asiste a educación formal',
                    'adaptations', 'Rutinas predecibles y contacto visual respetado'
                ),
                'people', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000007-0000-4000-8000-000000000007',
                    'fullName', 'Valentina Contreras Rojas',
                    'initials', 'VC',
                    'birthDate', '1994-08-28',
                    'relationship', 'Madre',
                    'phone', '+56 9 6666 6666',
                    'email', 'valentina.contreras@example.test',
                    'roles', jsonb_build_array('family', 'contact'),
                    'isPrimaryContact', true
                )),
                'siblings', '[]'::jsonb
            )
        ),
        jsonb_build_object(
            'schemaVersion', 2,
            'operationId', gen_random_uuid(),
            'idempotencyKey', gen_random_uuid(),
            'studentId', 'd0000006-0000-4000-8000-000000000006',
            'expectedVersion', 0,
            'action', 'create',
            'statusConfirmation', false,
            'payload', jsonb_build_object(
                'schemaVersion', 2,
                'clinicalId', 'DEMO-006',
                'fullName', 'Benjamín Rojas Pizarro',
                'initials', 'BR',
                'rut', '17894562-9',
                'photoAttachmentId', null,
                'birthDate', '2017-07-07',
                'primaryLanguage', 'Español',
                'livingArrangement', 'Vive con madre, padre y dos hermanos',
                'reportedDiagnosis', 'Trastorno del espectro autista nivel 1',
                'consultationReason', 'Acompañamiento en transiciones escolares',
                'context', jsonb_build_object(
                    'home', 'Casa con dos hermanos mayores',
                    'school', 'Cuarto básico con apoyo diferencial',
                    'adaptations', 'Agenda visual y aviso previo de cambios'
                ),
                'people', jsonb_build_array(jsonb_build_object(
                    'id', 'a0000008-0000-4000-8000-000000000008',
                    'fullName', 'Andrea Pizarro Núñez',
                    'initials', 'AP',
                    'birthDate', '1988-01-14',
                    'relationship', 'Madre',
                    'phone', '+56 9 7777 7777',
                    'email', 'andrea.pizarro@example.test',
                    'roles', jsonb_build_array('family', 'contact'),
                    'isPrimaryContact', true
                )),
                'siblings', '[]'::jsonb
            )
        )
    );

    -- Act as the admin so the security-definer command authorizes normally.
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    for v_command in select value from jsonb_array_elements(v_commands) loop
        if not exists (select 1 from public.clients where id = (v_command->>'studentId')::uuid) then
            v_result := public.aba_student_command_v2(v_organization, v_command);
            if v_result->>'status' is distinct from 'acknowledged' then
                raise exception 'No se pudo crear %: %', v_command->'payload'->>'clinicalId', v_result;
            end if;
        end if;
    end loop;

    execute 'reset role';

    -- Give the demo clinician access to every synthetic student. The command
    -- above only assigns its creator (the admin).
    insert into public.student_assignments (organization_id, client_id, user_id, role, is_primary, created_by)
    select v_organization, c.id, u.id, 'therapist', false, v_admin
      from public.clients c
      join auth.users u on lower(u.email) = 'clinico@demo.test'
     where c.id in (
        'd0000001-0000-4000-8000-000000000001',
        'd0000002-0000-4000-8000-000000000002',
        'd0000003-0000-4000-8000-000000000003',
        'd0000004-0000-4000-8000-000000000004',
        'd0000005-0000-4000-8000-000000000005',
        'd0000006-0000-4000-8000-000000000006'
     )
       and not exists (
        select 1 from public.student_assignments sa
         where sa.client_id = c.id and sa.user_id = u.id and sa.status = 'active'
       );

    raise notice 'Datos de demostración cargados en la organización %', v_organization;
end $$;
