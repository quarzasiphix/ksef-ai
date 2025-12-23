import React from 'react';
import { TransactionType } from '@/types/common';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const IncomeList = React.lazy(() => import('@/pages/income/IncomeList'));
const ExpenseList = React.lazy(() => import('@/pages/expense/ExpenseList'));
const CustomerList = React.lazy(() => import('@/pages/customers/CustomerList'));
const NewCustomer = React.lazy(() => import('@/pages/customers/NewCustomer'));
const EditCustomer = React.lazy(() => import('@/pages/customers/EditCustomer'));
const CustomerDetail = React.lazy(() => import('@/pages/customers/CustomerDetail'));
const ProductList = React.lazy(() => import('@/pages/products/ProductList'));
const NewProduct = React.lazy(() => import('@/pages/products/NewProduct'));
const EditProduct = React.lazy(() => import('@/pages/products/EditProduct'));
const ProductDetail = React.lazy(() => import('@/pages/products/ProductDetail'));
const NewInvoice = React.lazy(() => import('@/pages/invoices/NewInvoice'));
const EditInvoice = React.lazy(() => import('@/pages/invoices/EditInvoice'));
const InvoiceDetail = React.lazy(() => import('@/pages/invoices/InvoiceDetail'));
const BusinessProfiles = React.lazy(() => import('@/pages/settings/BusinessProfiles'));
const NewBusinessProfile = React.lazy(() => import('@/pages/settings/NewBusinessProfile'));
const EditBusinessProfile = React.lazy(() => import('@/pages/settings/EditBusinessProfile'));
const DocumentSettings = React.lazy(() => import('@/pages/settings/DocumentSettings'));
const ERPIntegrations = React.lazy(() => import('@/pages/settings/ERPIntegrations'));
const EmployeesList = React.lazy(() => import('@/pages/employees/EmployeesList'));
const NewEmployee = React.lazy(() => import('@/pages/employees/NewEmployee'));
const LabourHoursPage = React.lazy(() => import('@/pages/employees/LabourHoursPage'));
const InventoryPage = React.lazy(() => import('@/pages/inventory/InventoryPage'));
const Accounting = React.lazy(() => import('@/pages/accounting/Accounting'));
const BalanceSheet = React.lazy(() => import('@/pages/accounting/BalanceSheet'));
const Shareholders = React.lazy(() => import('@/pages/accounting/Shareholders'));
const Premium = React.lazy(() => import('@/pages/Premium'));
const PremiumPlanDetails = React.lazy(() => import('@/pages/PremiumPlanDetails'));
const DocumentsHub = React.lazy(() => import('@/pages/contracts/DocumentsHub'));
const ContractNew = React.lazy(() => import('@/pages/contracts/ContractNew'));
const ContractDetails = React.lazy(() => import('@/pages/contracts/ContractDetails'));
const DecisionsHub = React.lazy(() => import('@/pages/decisions/DecisionsHub'));
const DecisionEdit = React.lazy(() => import('@/pages/decisions/DecisionEdit'));
const DecisionDetails = React.lazy(() => import('@/pages/decisions/DecisionDetails'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const BankAccounts = React.lazy(() => import('@/pages/bank/BankAccounts'));
const CapitalCommitments = React.lazy(() => import('@/pages/assets/CapitalCommitments'));
const BusinessInbox = React.lazy(() => import('@/pages/inbox/BusinessInbox'));
const DiscussionsPage = React.lazy(() => import('@/pages/inbox/DiscussionsPage'));
const ReceivedInvoiceDetail = React.lazy(() => import('@/pages/inbox/ReceivedInvoiceDetail'));
const CompanyRegistry = React.lazy(() => import('@/pages/spolka/CompanyRegistry'));
const CapitalEvents = React.lazy(() => import('@/pages/spolka/CapitalEvents'));
const Resolutions = React.lazy(() => import('@/pages/spolka/Resolutions'));
const CITDashboard = React.lazy(() => import('@/pages/spolka/CITDashboard'));
const AccountingShell = React.lazy(() => import('@/pages/accounting/AccountingShell'));
const Kasa = React.lazy(() => import('@/pages/accounting/Kasa'));
const TransactionalContracts = React.lazy(() => import('@/pages/accounting/TransactionalContracts'));
const EventLog = React.lazy(() => import('@/pages/accounting/EventLog'));
const SettingsMenu = React.lazy(() => import('@/pages/settings/SettingsMenu'));
const ProfileSettings = React.lazy(() => import('@/pages/settings/ProfileSettings'));
const TeamManagement = React.lazy(() => import('@/pages/settings/TeamManagement'));
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

  // Inbox
  {
    path: '/inbox',
    element: <BusinessInbox />,
    guard: 'protected',
    title: 'Skrzynka',
    icon: 'Inbox',
    section: 'communication',
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
