import { Suspense } from 'react';
import StudentsPage from '@/views/StudentsPage';
export default function Page() { return <Suspense fallback={<p>Cargando fichas…</p>}><StudentsPage/></Suspense>; }
