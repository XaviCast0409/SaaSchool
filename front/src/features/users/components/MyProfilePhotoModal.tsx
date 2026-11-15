import React from 'react';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/useAuthStore';
import { AvatarUploader } from './AvatarUploader';

/** Ventana para que cada docente (o personal) ponga su propia foto de perfil. */
export const MyProfilePhotoModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Mi foto de perfil"
      description="Ayuda a que las familias y los alumnos te reconozcan en el aula virtual y en los mensajes."
    >
      <AvatarUploader name={`${user.firstName} ${user.lastNamePaternal}`} avatarUrl={user.avatarUrl} />
    </Modal>
  );
};
