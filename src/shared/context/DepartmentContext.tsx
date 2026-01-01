/**
 * Department Context
 * 
 * Provides selected department context throughout the application
 * Used to scope contracts, documents, and decisions to department level
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Department } from '@/shared/types';

interface DepartmentContextValue {
  selectedDepartment: Department | null;
  setSelectedDepartment: (department: Department | null) => void;
  clearDepartment: () => void;
}

const DepartmentContext = createContext<DepartmentContextValue | undefined>(undefined);

interface DepartmentProviderProps {
  children: ReactNode;
}

export const DepartmentProvider: React.FC<DepartmentProviderProps> = ({ children }) => {
  const [selectedDepartment, setSelectedDepartmentState] = useState<Department | null>(null);

  const setSelectedDepartment = useCallback((department: Department | null) => {
    setSelectedDepartmentState(department);
  }, []);

  const clearDepartment = useCallback(() => {
    setSelectedDepartmentState(null);
  }, []);

  const value: DepartmentContextValue = {
    selectedDepartment,
    setSelectedDepartment,
    clearDepartment,
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = (): DepartmentContextValue => {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};
