import React from 'react';
import { Outlet } from 'react-router-dom';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import AccountingLayout from '@/components/accounting/AccountingLayout';

const AccountingShell = () => {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  return (
    <AccountingLayout showSidebar={isSpZoo}>
      <Outlet />
    </AccountingLayout>
  );
};

export default AccountingShell;
