import { notFound } from 'next/navigation';

// Feature dormida: se conservan contratos y persistencia para un upgrade posterior,
// pero el release actual no expone interfaz ni operaciones de chat.
export default function Page() {
    notFound();
}
