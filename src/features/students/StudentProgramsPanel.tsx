'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Loader, Stack } from '@mantine/core';
import { useNavigate } from '@/lib/navigation';
import { ProgramManagementV2 } from '@/features/programs';
import { loadProgramSessionPageData } from '@/modules/program-session/program-session.server';
import type { ProgramSessionPageData } from '@/modules/program-session/ports';

/** Original program boards mounted inside the original student tabs. */
export function StudentProgramsPanel({ clinicId, studentId, onGuardChange }: { clinicId: string; studentId: string; onGuardChange?: (blocked: boolean) => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<ProgramSessionPageData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void loadProgramSessionPageData(clinicId, studentId).then(result => {
      if (live) { setData(result); setError(''); }
    }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No fue posible cargar los programas autorizados.'); });
    return () => { live = false; };
  }, [clinicId, studentId, attempt]);
  if (!data || data.clinicId!==clinicId || data.studentId!==studentId) return <Stack>{error ? <Alert color="red">{error}<Button variant="light" mt="sm" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Reintentar lectura</Button></Alert> : <Loader size="sm"/>}</Stack>;
  return <ProgramManagementV2 key={`${clinicId}:${studentId}`} data={data} onGuardChange={onGuardChange}
    onRegisterData={() => navigate(`/session/${studentId}`)}
    onViewChart={programId => navigate(`/students/${studentId}/programs/${programId}/chart`)}/>;
}
