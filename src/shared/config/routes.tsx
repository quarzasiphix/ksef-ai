import React from 'react';
import { Navigate } from 'react-router-dom';
import { TransactionType } from '@/shared/types/common';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const IncomeList = React.lazy(() => import('@/modules/invoices/screens/income/IncomeList'));
const ExpenseList = React.lazy(() => import('@/modules/invoices/screens/expense/ExpenseList'));
const ExpensePage = React.lazy(() => import('@/modules/invoices/screens/expense/[id]'));
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
const DocumentRepository = React.lazy(() => import('@/modules/documents/screens/DocumentRepository'));
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
const DocumentsHubRedesigned = React.lazy(() => import('@/modules/documents/screens/DocumentsHubRedesigned'));
const DocumentsShell = React.lazy(() => import('@/modules/documents/layouts/DocumentsShell'));
const SectionDocumentsPage = React.lazy(() => import('@/modules/documents/screens/SectionDocumentsPage'));
const DocumentDetailPage = React.lazy(() => import('@/modules/documents/screens/DocumentDetailPage'));
const AttachmentsPage = React.lazy(() => import('@/modules/documents/screens/AttachmentsPage'));
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
const GeneralLedger = React.lazy(() => import('@/modules/accounting/screens/GeneralLedger'));
const ChartOfAccounts = React.lazy(() => import('@/modules/accounting/screens/ChartOfAccounts'));
const RyczaltAccounts = React.lazy(() => import('@/modules/accounting/screens/RyczaltAccounts'));
const EwidencjaPrzychodow = React.lazy(() => import('@/modules/accounting/screens/EwidencjaPrzychodow'));
const KpirPage = React.lazy(() => import('@/modules/accounting/screens/KpirPage'));
const VatPage = React.lazy(() => import('@/modules/accounting/screens/VatPage'));
const PitPage = React.lazy(() => import('@/modules/accounting/screens/PitPage'));
const EventsShell = React.lazy(() => import('@/modules/events/components/EventsShell'));
const EventsTimeline = React.lazy(() => import('@/modules/events/screens/EventsTimeline'));
const EventsPosting = React.lazy(() => import('@/modules/events/screens/EventsPosting'));
const EventsReconciliation = React.lazy(() => import('@/modules/events/screens/EventsReconciliation'));
const SettingsShell = React.lazy(() => import('@/modules/settings/screens/SettingsShell'));
const SettingsMenu = React.lazy(() => import('@/modules/settings/screens/SettingsMenu'));
const ProfileSettings = React.lazy(() => import('@/modules/settings/screens/ProfileSettings'));
const TeamManagement = React.lazy(() => import('@/modules/settings/screens/TeamManagement'));
const SettingsPremium = React.lazy(() => import('@/modules/settings/screens/SettingsPremium'));
const SharedLinksPage = React.lazy(() => import('@/pages/SharedLinks'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const DepartmentsScreen = React.lazy(() =>
  import('@/modules/projects/screens/DepartmentScreen').then((module) => ({
    default: module.default ?? module.DepartmentScreen,
  }))
);
const OperationsPage = React.lazy(() => import('@/modules/operations/screens/OperationsPage'));
const JobDetailPage = React.lazy(() => import('@/modules/operations/screens/JobDetailPage'));
const JobsListPage = React.lazy(() => import('@/modules/operations/screens/JobsListPage'));
const JobNewPage = React.lazy(() => import('@/modules/operations/screens/JobNewPageEnhanced'));
const DriversListPage = React.lazy(() => import('@/modules/operations/screens/TransportDriversListPage'));
const DriverNewPage = React.lazy(() => import('@/modules/operations/screens/TransportDriverNewPage'));
const VehiclesListPage = React.lazy(() => import('@/modules/operations/screens/TransportVehiclesListPage'));
const VehicleNewPage = React.lazy(() => import('@/modules/operations/screens/TransportVehicleNewPage'));
const FuneralCasesListPage = React.lazy(() => import('@/modules/operations/screens/FuneralCasesListPage'));
const FuneralCaseNewPage = React.lazy(() => import('@/modules/operations/screens/FuneralCaseNewPage'));
const FuneralCaseDetailPage = React.lazy(() => import('@/modules/operations/screens/FuneralCaseDetailPage'));
const KsefPage = React.lazy(() => import('@/modules/ksef/screens/KsefPage'));

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

  // Operations
  {
    path: '/operations',
    element: <OperationsPage />,
    guard: 'protected',
    title: 'Operacje',
    icon: 'Truck',
    section: 'operations',
  },
  {
    path: '/operations/jobs',
    element: <JobsListPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/jobs/new',
    element: <JobNewPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/jobs/:id',
    element: <JobDetailPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/drivers',
    element: <DriversListPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/drivers/new',
    element: <DriverNewPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/vehicles',
    element: <VehiclesListPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/vehicles/new',
    element: <VehicleNewPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/funeral-cases',
    element: <FuneralCasesListPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/funeral-cases/new',
    element: <FuneralCaseNewPage />,
    guard: 'protected',
    hideInNav: true,
  },
  {
    path: '/operations/funeral-cases/:id',
    element: <FuneralCaseDetailPage />,
    guard: 'protected',
    hideInNav: true,
  },

  // Legacy /shares route -> settings screen
  {
    path: '/shares',
    element: <Navigate to="/settings/shared-links" replace />,
    guard: 'protected',
    hideInNav: true,
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
    element: <ExpensePage />,
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

  // Documents - Section-based routes with persistent shell
  {
    path: '/documents',
    element: <DocumentsShell />,
    guard: 'protected',
    title: 'Dokumenty',
    icon: 'FileText',
    section: 'documents',
    children: [
      {
        path: '',
        element: <DocumentsHubRedesigned />,
      },
      {
        path: 'attachments',
        element: <AttachmentsPage />,
      },
      {
        path: 'contracts',
        element: <SectionDocumentsPage />,
      },
      {
        path: 'contracts/:id',
        element: <DocumentDetailPage />,
      },
      {
        path: 'financial',
        element: <SectionDocumentsPage />,
      },
      {
        path: 'financial/:id',
        element: <DocumentDetailPage />,
      },
      {
        path: 'operations',
        element: <SectionDocumentsPage />,
      },
      {
        path: 'operations/:id',
        element: <DocumentDetailPage />,
      },
      {
        path: 'audit',
        element: <SectionDocumentsPage />,
      },
      {
        path: 'audit/:id',
        element: <DocumentDetailPage />,
      },
      {
        path: 'repository',
        element: <DocumentRepository />,
      },
      {
        path: 'repository/folder/:folderId',
        element: <DocumentRepository />,
      },
      {
        path: 'repository/file/:fileId',
        element: <DocumentRepository />,
      }
    ],
  },
  
  // Legacy routes - redirect to new structure
  {
    path: '/contracts',
    element: <DocumentsHubRedesigned />,
    guard: 'protected',
    hideInNav: true,
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
    hideInNav: true,
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
      {
        path: '/accounting/general-ledger',
        element: <GeneralLedger />,
      },
      {
        path: '/accounting/coa',
        element: <ChartOfAccounts />,
      },
      {
        path: '/accounting/ryczalt-categories',
        element: <RyczaltAccounts />,
      },
      {
        path: '/accounting/ryczalt-accounts',
        element: <RyczaltAccounts />,
      },
      {
        path: '/accounting/ewidencja',
        element: <EwidencjaPrzychodow />,
      },
      {
        path: '/accounting/kpir',
        element: <KpirPage />,
      },
      {
        path: '/accounting/vat',
        element: <VatPage />,
      },
      {
        path: '/accounting/pit',
        element: <PitPage />,
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

  // KSeF
  {
    path: '/ksef',
    element: <KsefPage />,
    guard: 'protected',
    title: 'KSeF',
    icon: 'FileText',
    section: 'main',
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

  // Events Module
  {
    path: '/events',
    element: <EventsShell />,
    guard: 'protected',
    title: 'Zdarzenia',
    icon: 'Activity',
    section: 'accounting',
    children: [
      {
        path: '/events',
        element: <Navigate to="/events/timeline" replace />,
      },
      {
        path: '/events/timeline',
        element: <EventsTimeline />,
      },
      {
        path: '/events/posting',
        element: <EventsPosting />,
      },
      {
        path: '/events/reconciliation',
        element: <EventsReconciliation />,
      },
    ],
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

  // Settings - wrapped in SettingsShell for sidebar
  {
    path: '/settings',
    element: <SettingsShell />,
    guard: 'protected',
    title: 'Ustawienia',
    icon: 'Settings',
    section: 'settings',
    children: [
      {
        path: '',
        element: <SettingsMenu />,
      },
      {
        path: 'premium',
        element: <SettingsPremium />,
      },
      {
        path: 'profile',
        element: <ProfileSettings />,
      },
      {
        path: 'business-profiles',
        element: <BusinessProfiles />,
      },
      {
        path: 'business-profiles/new',
        element: <NewBusinessProfile />,
      },
      {
        path: 'business-profiles/:id/edit',
        element: <EditBusinessProfile />,
      },
      {
        path: 'documents',
        element: <DocumentSettings />,
      },
      {
        path: 'erp',
        element: <ERPIntegrations />,
      },
      {
        path: 'team',
        element: <TeamManagement />,
      },
      {
        path: 'shared-links',
        element: <SharedLinksPage />,
      },
      {
        path: 'projects',
        element: <DepartmentsScreen />,
      },
      {
        path: 'event-log',
        element: <EventLog />,
      },
    ],
  },

  // Legacy departmnets path -> settings departments
  {
    path: '/departments',
    element: <Navigate to="/settings/departments" replace />,
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
