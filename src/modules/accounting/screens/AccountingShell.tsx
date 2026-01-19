import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import AccountingLayout from '@/modules/accounting/components/AccountingLayout';
import JdgAccounting from './JdgAccounting';
import SpzooAccounting from './SpzooAccounting';

const AccountingShell = () => {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const location = useLocation();
  
  const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const isJdg = selectedProfile?.entityType === 'dzialalnosc';
  
  // If on root accounting path, show entity-specific page
  const isRootPath = location.pathname === '/accounting' || location.pathname === '/accounting/';
  
  if (isRootPath && selectedProfile) {
    return (
      <AccountingLayout showSidebar={isSpZoo}>
        {isJdg ? <JdgAccounting /> : <SpzooAccounting />}
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout showSidebar={isSpZoo}>
      <Outlet />
    </AccountingLayout>
  );
};

export default AccountingShell;
