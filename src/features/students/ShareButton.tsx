import { Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Share2 } from 'lucide-react';
import ShareStudentModal from './ShareStudentModal';
import { mockSharedAccess } from '../../api/invitationsData';
import type { SharedAccess } from '../../api/invitationsData';

interface ShareButtonProps {
    studentId: string;
    studentName: string;
}

const ShareButton = ({ studentId, studentName }: ShareButtonProps) => {
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

    // Manejar compartir
    const handleShare = (email: string, accessLevel: string, message?: string) => {
        // Crear nueva invitación
        const newInvitation: SharedAccess = {
            id: `inv-${Date.now()}`,
            sharedBy: 'sup-001', // ID del supervisor actual
            sharedWith: email,
            studentId,
            studentName,
            professionalName: undefined, // No sabemos si está registrado
            professionalTitle: undefined,
            sharedDate: new Date().toISOString(),
            accessLevel: accessLevel as 'full' | 'read-only' | 'programs-only',
            status: 'pending',
            message,
        };

        // Agregar a mockSharedAccess (en producción, esto sería una llamada a API)
        mockSharedAccess.unshift(newInvitation);

        console.log('Nueva invitación creada:', newInvitation);
    };

    return (
        <>
            <Menu.Item
                leftSection={<Share2 size={16} />}
                onClick={openModal}
            >
                Compartir
            </Menu.Item>

            <ShareStudentModal
                opened={modalOpened}
                onClose={closeModal}
                studentId={studentId}
                studentName={studentName}
                onShare={handleShare}
            />
        </>
    );
};

export default ShareButton;
