import React, { createContext, useContext, useMemo, useState } from 'react';

type PageHeaderActionsContextValue = {
  actions: React.ReactNode;
  setActions: (actions: React.ReactNode) => void;
};

const PageHeaderActionsContext = createContext<PageHeaderActionsContextValue | null>(null);

export const PageHeaderActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [actions, setActions] = useState<React.ReactNode>(null);

  const value = useMemo(() => ({ actions, setActions }), [actions]);

  return (
    <PageHeaderActionsContext.Provider value={value}>
      {children}
    </PageHeaderActionsContext.Provider>
  );
};

export const usePageHeaderActions = () => {
  const ctx = useContext(PageHeaderActionsContext);
  if (!ctx) {
    throw new Error('usePageHeaderActions must be used within PageHeaderActionsProvider');
  }
  return ctx;
};
