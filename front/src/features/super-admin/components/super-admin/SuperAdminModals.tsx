import React from 'react';
import { SchoolWithStats } from '../../types';
import { CreateSchoolModal } from '../CreateSchoolModal';
import { EditSchoolPlanModal } from '../EditSchoolPlanModal';
import { EditSchoolInfoModal } from '../EditSchoolInfoModal';
import { ResetAdminPasswordModal } from '../ResetAdminPasswordModal';
import { SubscriptionPaymentsModal } from '../SubscriptionPaymentsModal';

interface SuperAdminModalsProps {
  isCreateModalOpen: boolean;
  onCloseCreate: () => void;
  selectedSchoolForPlan: SchoolWithStats | null;
  onClosePlan: () => void;
  selectedSchoolForEdit: SchoolWithStats | null;
  onCloseEdit: () => void;
  selectedSchoolForPayments: SchoolWithStats | null;
  onClosePayments: () => void;
  selectedSchoolForReset: SchoolWithStats | null;
  onCloseReset: () => void;
}

export const SuperAdminModals: React.FC<SuperAdminModalsProps> = ({
  isCreateModalOpen,
  onCloseCreate,
  selectedSchoolForPlan,
  onClosePlan,
  selectedSchoolForEdit,
  onCloseEdit,
  selectedSchoolForPayments,
  onClosePayments,
  selectedSchoolForReset,
  onCloseReset,
}) => (
  <>
    <CreateSchoolModal isOpen={isCreateModalOpen} onClose={onCloseCreate} />

    <EditSchoolPlanModal
      key={selectedSchoolForPlan?.id ?? 'none'}
      school={selectedSchoolForPlan}
      isOpen={!!selectedSchoolForPlan}
      onClose={onClosePlan}
    />

    <EditSchoolInfoModal
      school={selectedSchoolForEdit}
      isOpen={!!selectedSchoolForEdit}
      onClose={onCloseEdit}
    />

    <SubscriptionPaymentsModal
      key={`pay-${selectedSchoolForPayments?.id ?? 'none'}`}
      school={selectedSchoolForPayments}
      isOpen={!!selectedSchoolForPayments}
      onClose={onClosePayments}
    />

    <ResetAdminPasswordModal
      school={selectedSchoolForReset}
      isOpen={!!selectedSchoolForReset}
      onClose={onCloseReset}
    />
  </>
);
