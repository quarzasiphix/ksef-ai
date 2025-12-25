import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';

/**
 * Helper hook for opening tabs from anywhere in the app
 * Provides convenient methods for opening different types of tabs
 */
export const useOpenTab = () => {
  const { openTab } = useWorkspaceTabs();
  const navigate = useNavigate();

  const openInvoiceTab = useCallback((invoiceId: string, invoiceNumber: string) => {
    openTab({
      type: 'document',
      title: invoiceNumber,
      path: `/income/${invoiceId}`,
      entityId: invoiceId,
      entityType: 'invoice',
    });
  }, [openTab]);

  const openExpenseTab = useCallback((expenseId: string, expenseNumber: string) => {
    openTab({
      type: 'document',
      title: expenseNumber,
      path: `/expense/${expenseId}`,
      entityId: expenseId,
      entityType: 'expense',
    });
  }, [openTab]);

  const openContractTab = useCallback((contractId: string, contractTitle: string) => {
    openTab({
      type: 'document',
      title: contractTitle,
      path: `/contracts/${contractId}`,
      entityId: contractId,
      entityType: 'contract',
    });
  }, [openTab]);

  const openCustomerTab = useCallback((customerId: string, customerName: string) => {
    openTab({
      type: 'document',
      title: customerName,
      path: `/customers/${customerId}`,
      entityId: customerId,
      entityType: 'customer',
    });
  }, [openTab]);

  const openProductTab = useCallback((productId: string, productName: string) => {
    openTab({
      type: 'document',
      title: productName,
      path: `/products/${productId}`,
      entityId: productId,
      entityType: 'product',
    });
  }, [openTab]);

  const openEmployeeTab = useCallback((employeeId: string, employeeName: string) => {
    openTab({
      type: 'document',
      title: employeeName,
      path: `/employees/${employeeId}`,
      entityId: employeeId,
      entityType: 'employee',
    });
  }, [openTab]);

  const openWorkspaceTab = useCallback((title: string, path: string) => {
    openTab({
      type: 'workspace',
      title,
      path,
    });
  }, [openTab]);

  // Navigate directly without opening a tab (for workspace views)
  const navigateToWorkspace = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return {
    openInvoiceTab,
    openExpenseTab,
    openContractTab,
    openCustomerTab,
    openProductTab,
    openEmployeeTab,
    openWorkspaceTab,
    navigateToWorkspace,
    openTab, // Raw openTab for custom use cases
  };
};
