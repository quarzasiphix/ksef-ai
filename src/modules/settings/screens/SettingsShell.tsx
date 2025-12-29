import React from 'react';
import { Outlet } from 'react-router-dom';
import { SettingsLayout } from '../components/SettingsLayout';

/**
 * Shell component that wraps all settings routes with the sidebar layout
 */
const SettingsShell: React.FC = () => {
  return (
    <SettingsLayout>
      <Outlet />
    </SettingsLayout>
  );
};

export default SettingsShell;
