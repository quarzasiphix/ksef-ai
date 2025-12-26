import React from 'react';
import { TransactionType } from '@/shared/types/common';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const IncomeList = React.lazy(() => import('@/modules/invoices/screens/income/IncomeList'));
const ExpenseList = React.lazy(() => import('@/modules/invoices/screens/expense/ExpenseList'));
const CustomerList = React.lazy(() => import('@/modules/customers/screens/CustomerList'));
const NewCustomer = React.lazy(() => import('@/modules/customers/screens/NewCustomer'));
const EditCustomer = React.lazy(() => import('@/modules/customers/screens/EditCustomer'));
const CustomerDetail = React.lazy(() => import('@/modules/customers/screens/CustomerDetail'));
const ProductList = React.lazy(() => import('@/modules/products/screens/ProductList'));
const NewProduct = React.lazy(() => import('@/modules/products/screens/NewProduct'));
const EditProduct = React.lazy(() => import('@/modules/products/screens/EditProduct'));
const ProductDetail = React.lazy(() => import('@/modules/products/screens/ProductDetail'));
const NewInvoice = React.lazy(() => import('@/modules/invoices/screens/invoices/NewInvoice'));
const EditInvoice = React.lazy(() => import('@/modules/invoices/screens/invoices/EditInvoice'));
const InvoiceDetail = React.lazy(() => import('@/modules/invoices/screens/invoices/InvoiceDetail'));
const BusinessProfiles = React.lazy(() => import('@/modules/settings/screens/BusinessProfiles'));
const NewBusinessProfile = React.lazy(() => import('@/modules/settings/screens/NewBusinessProfile'));
const EditBusinessProfile = React.lazy(() => import('@/modules/settings/screens/EditBusinessProfile'));
const DocumentSettings = React.lazy(() => import('@/modules/settings/screens/DocumentSettings'));
const ERPIntegrations = React.lazy(() => import('@/modules/settings/screens/ERPIntegrations'));
const EmployeesList = React.lazy(() => import('@/modules/employees/screens/EmployeesList'));
const NewEmployee = React.lazy(() => import('@/modules/employees/screens/NewEmployee'));
const LabourHoursPage = React.lazy(() => import('@/modules/employees/screens/LabourHoursPage'));
const InventoryPage = React.lazy(() => import('@/pages/inventory/InventoryPage'));
const Accounting = React.lazy(() => import('@/modules/accounting/screens/Accounting'));
const BalanceSheet = React.lazy(() => import('@/modules/accounting/screens/BalanceSheet'));
const Shareholders = React.lazy(() => import('@/modules/accounting/screens/Shareholders'));
const EquityModule = React.lazy(() => import('@/modules/accounting/screens/EquityModule'));
const Premium = React.lazy(() => import('@/modules/premium/screens/Premium'));
const PremiumPlanDetails = React.lazy(() => import('@/modules/premium/screens/PremiumPlanDetails'));
const DocumentsHub = React.lazy(() => import('@/modules/contracts/screens/DocumentsHub'));
const ContractNew = React.lazy(() => import('@/modules/contracts/screens/ContractNew'));
const ContractDetails = React.lazy(() => import('@/modules/contracts/screens/ContractDetails'));
const DecisionsHub = React.lazy(() => import('@/modules/decisions/screens/DecisionsHub'));
const DecisionNew = React.lazy(() => import('@/modules/decisions/screens/DecisionNew'));
const DecisionEdit = React.lazy(() => import('@/modules/decisions/screens/DecisionEdit'));
const DecisionDetails = React.lazy(() => import('@/modules/decisions/screens/DecisionDetails'));
const Analytics = React.lazy(() => import('@/modules/accounting/screens/Analytics'));
const BankAccounts = React.lazy(() => import('@/modules/banking/screens/BankAccounts'));
const CapitalCommitments = React.lazy(() => import('@/modules/accounting/screens/CapitalCommitments'));
const BusinessInbox = React.lazy(() => import('@/modules/inbox/screens/BusinessInbox'));
const UnifiedInboxPage = React.lazy(() => import('@/modules/inbox/screens/UnifiedInboxPage'));
const DiscussionsPage = React.lazy(() => import('@/modules/inbox/screens/DiscussionsPage'));
const ReceivedInvoiceDetail = React.lazy(() => import('@/modules/inbox/screens/ReceivedInvoiceDetail'));
const CompanyRegistry = React.lazy(() => import('@/modules/spolka/screens/CompanyRegistry'));
const CapitalEvents = React.lazy(() => import('@/modules/spolka/screens/CapitalEvents'));
const Resolutions = React.lazy(() => import('@/modules/spolka/screens/Resolutions'));
const CITDashboard = React.lazy(() => import('@/modules/spolka/screens/CITDashboard'));
const AccountingShell = React.lazy(() => import('@/modules/accounting/screens/AccountingShell'));
const Kasa = React.lazy(() => import('@/modules/accounting/screens/Kasa'));
const TransactionalContracts = React.lazy(() => import('@/modules/accounting/screens/TransactionalContracts'));
const EventLog = React.lazy(() => import('@/modules/accounting/screens/EventLog'));
const LedgerPage = React.lazy(() => import('@/modules/accounting/screens/LedgerPage'));
const SettingsMenu = React.lazy(() => import('@/modules/settings/screens/SettingsMenu'));
const ProfileSettings = React.lazy(() => import('@/modules/settings/screens/ProfileSettings'));
const TeamManagement = React.lazy(() => import('@/modules/settings/screens/TeamManagement'));
const SharedLinksPage = React.lazy(() => import('@/pages/SharedLinks'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

export type RouteGuard = 'public' | 'protected' | 'premium' | 'onboarding';

export interface RouteConfig {
  path: string;
  element?: React.ReactNode;
  guard?: RouteGuard;
  children?: RouteConfig[];
  // Metadata for nav generation
  title?: string;
  icon?: string;
  section?: string;
  hideInNav?: boolean;
}

/**
 * Centralized route configuration
 * Makes it easy to:
 * - Add new modules (KSeF, HR, etc.)
 * - Generate sidebar/nav
 * - Manage permissions
 * - See the entire app structure at a glance
 */
export const routes: RouteConfig[] = [
  // Dashboard
  {
    path: '/dashboard',
    element: <Dashboard />,
    guard: 'protected',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    section: 'main',
  },

  // Invoices (normalized routes)
  {
    path: '/invoices',
    guard: 'protected',
    title: 'Faktury',
    icon: 'Receipt',
    section: 'main',
    children: [
      {
        path: '/invoices/new',
        element: <NewInvoice type={TransactionType.INCOME} />,
        hideInNav: true,
      },
      {
        path: '/invoices/:id',
        element: <InvoiceDetail type="income" />,
        hideInNav: true,
      },
      {
        path: '/invoices/:id/edit',
        element: <EditInvoice />,
        hideInNav: true,
      },
    ],
  },

  // Income (legacy routes - redirect to /invoices)
  {
    path: '/income',
    element: <IncomeList />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/income/new',
    element: <NewInvoice type={TransactionType.INCOME} />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/income/:id',
    element: <InvoiceDetail type="income" />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/income/edit/:id',
    element: <EditInvoice />,
    guard: 'protected',
    hideInNav: true,
  },

  // Expenses
  {
    path: '/expense',
    element: <ExpenseList />,
    guard: 'protected',
    title: 'Wydatki',
    icon: 'ArrowUpCircle',
    section: 'main',
  },
  {
    path: '/expense/new',
    element: <NewInvoice type={TransactionType.EXPENSE} />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/expense/:id',
    element: <InvoiceDetail type="expense" />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/expense/:id/edit',
    element: <EditInvoice />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/expense/share/:id',
    element: <InvoiceDetail type="expense" />,
    guard: 'protected',
    hideInNav: true,
  },

  // Customers
  {
    path: '/customers',
    element: <CustomerList />,
    guard: 'protected',
    title: 'Kontrahenci',
    icon: 'Users',
    section: 'main',
  },
  {
    path: '/customers/new',
    element: <NewCustomer />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/customers/edit/:id',
    element: <EditCustomer />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/customers/:id',
    element: <CustomerDetail />,
    guard: 'protected',
    hideInNav: true,
  },

  // Products
  {
    path: '/products',
    element: <ProductList />,
    guard: 'protected',
    title: 'Produkty',
    icon: 'Package',
    section: 'main',
  },
  {
    path: '/products/new',
    element: <NewProduct />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/products/edit/:id',
    element: <EditProduct />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/products/:id',
    element: <ProductDetail />,
    guard: 'protected',
    hideInNav: true,
  },

  // Employees
  {
    path: '/employees',
    element: <EmployeesList />,
    guard: 'protected',
    title: 'Pracownicy',
    icon: 'Users',
    section: 'hr',
  },
  {
    path: '/employees/new',
    element: <NewEmployee />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/labour-hours',
    element: <LabourHoursPage />,
    guard: 'protected',
    title: 'Godziny pracy',
    icon: 'Clock',
    section: 'hr',
  },

  // Contracts & Documents
  {
    path: '/contracts',
    element: <DocumentsHub />,
    guard: 'protected',
    title: 'Umowy',
    icon: 'FileText',
    section: 'documents',
  },
  {
    path: '/contracts/new',
    element: <ContractNew />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/contracts/:id',
    element: <ContractDetails />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/contracts/:id/edit',
    element: <ContractNew />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/contracts/resolutions',
    element: <Resolutions />,
    guard: 'protected',
    title: 'Uchwały',
    icon: 'Gavel',
    section: 'documents',
  },

  // Decisions
  {
    path: '/decisions',
    element: <DecisionsHub />,
    guard: 'protected',
    title: 'Decyzje',
    icon: 'Shield',
    section: 'governance',
  },
  {
    path: '/decisions/:id',
    element: <DecisionDetails />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/decisions/new',
    element: <DecisionNew />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/decisions/:id/edit',
    element: <DecisionEdit />,
    guard: 'protected',
    hideInNav: true,
  },

  // Bank
  {
    path: '/bank',
    element: <BankAccounts />,
    guard: 'protected',
    title: 'Bankowość',
    icon: 'Landmark',
    section: 'finance',
  },

  // Assets
  {
    path: '/assets',
    element: <CapitalCommitments />,
    guard: 'protected',
    title: 'Aktywa',
    icon: 'Building',
    section: 'finance',
  },

  // Accounting (Premium)
  {
    path: '/accounting',
    element: <AccountingShell />,
    guard: 'premium',
    title: 'Księgowość',
    icon: 'Calculator',
    section: 'accounting',
    children: [
      {
        path: '/accounting',
        element: <Accounting />,
      },
      {
        path: '/accounting/bank',
        element: <BankAccounts />,
      },
      {
        path: '/accounting/balance-sheet',
        element: <BalanceSheet />,
      },
      {
        path: '/accounting/equity',
        element: <EquityModule />,
      },
      {
        path: '/accounting/shareholders',
        element: <Shareholders />,
      },
      {
        path: '/accounting/company-registry',
        element: <CompanyRegistry />,
      },
      {
        path: '/accounting/capital-events',
        element: <CapitalEvents />,
      },
      {
        path: '/accounting/cit',
        element: <CITDashboard />,
      },
      {
        path: '/accounting/contracts',
        element: <TransactionalContracts />,
      },
      {
        path: '/accounting/kasa',
        element: <Kasa />,
      },
      {
        path: '/accounting/event-log',
        element: <EventLog />,
      },
    ],
  },

  // Inventory (Premium)
  {
    path: '/inventory',
    element: <InventoryPage />,
    guard: 'premium',
    title: 'Magazyn',
    icon: 'Package',
    section: 'operations',
  },

  // Inbox (Unified Event System)
  {
    path: '/inbox',
    element: <UnifiedInboxPage />,
    guard: 'protected',
    title: 'Skrzynka',
    icon: 'Inbox',
    section: 'communication',
  },
  {
    path: '/inbox/legacy',
    element: <BusinessInbox />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/inbox/discussions',
    element: <DiscussionsPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/inbox/invoice/:id',
    element: <ReceivedInvoiceDetail />,
    guard: 'protected',
    hideInNav: true,
  },

  // Analytics
  {
    path: '/analytics',
    element: <Analytics />,
    guard: 'protected',
    title: 'Analityka',
    icon: 'BarChart',
    section: 'main',
  },

  // Ledger
  {
    path: '/ledger',
    element: <LedgerPage />,
    guard: 'protected',
    title: 'Księga finansowa',
    icon: 'BookOpen',
    section: 'finance',
  },

  // Settings
  {
    path: '/settings',
    element: <SettingsMenu />,
    guard: 'protected',
    title: 'Ustawienia',
    icon: 'Settings',
    section: 'settings',
  },
  {
    path: '/settings/profile',
    element: <ProfileSettings />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/business-profiles',
    element: <BusinessProfiles />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/business-profiles/new',
    element: <NewBusinessProfile />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/business-profiles/:id/edit',
    element: <EditBusinessProfile />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/documents',
    element: <DocumentSettings />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/erp',
    element: <ERPIntegrations />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/settings/team',
    element: <TeamManagement />,
    guard: 'protected',
    hideInNav: true,
  },

  // Shared Links
  {
    path: '/shares',
    element: <SharedLinksPage />,
    guard: 'protected',
    hideInNav: true,
  },

  // Premium
  {
    path: '/premium',
    element: <Premium />,
    title: 'Premium',
    hideInNav: true,
  },
  {
    path: '/premium/plan/:planId',
    element: <PremiumPlanDetails />,
    hideInNav: true,
  },

  // 404
  {
    path: '*',
    element: <NotFound />,
    hideInNav: true,
  },
];

/**
 * Helper to flatten routes for rendering
 */
export function flattenRoutes(routes: RouteConfig[]): RouteConfig[] {
  const flat: RouteConfig[] = [];
  
  function traverse(routes: RouteConfig[]) {
    routes.forEach(route => {
      flat.push(route);
      if (route.children) {
        traverse(route.children);
      }
    });
  }
  
  traverse(routes);
  return flat;
}

/**
 * Helper to get routes by section for nav generation
 */
export function getRoutesBySection(section: string): RouteConfig[] {
  return routes.filter(r => r.section === section && !r.hideInNav);
}

/**
 * Helper to get all sections
 */
export function getSections(): string[] {
  const sections = new Set<string>();
  routes.forEach(r => {
    if (r.section) sections.add(r.section);
  });
  return Array.from(sections);
}
