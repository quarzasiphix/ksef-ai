import {
  BookOpen,
  FileText,
  CreditCard,
  Landmark,
  Wallet,
  TrendingUp,
  Building,
  Signature,
  Shield,
  Boxes,
  Users,
  Package,
  UserCheck,
  Inbox,
  Calculator,
  Scale,
  DollarSign,
  Settings,
  FolderKanban,
  Truck,
  Activity,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type NavTint = "finance" | "structure" | "operations" | "accounting" | "system";

type EntityType = "jdg" | "spoolka";

export interface NavContext {
  entityType: EntityType;
  bankPath: string;
  hasPremium: boolean;
}

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  pathResolver?: (ctx: NavContext) => string;
  tint?: NavTint;
  emphasis?: boolean;
  showForJdg?: boolean;
  showForSpoolka?: boolean;
  requiresPremium?: boolean;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  showForJdg?: boolean;
  showForSpoolka?: boolean;
  items: NavItemConfig[];
}

export interface NavItem extends NavItemConfig {
  path: string;
}

export interface NavGroup extends NavGroupConfig {
  items: NavItem[];
}

// JDG Navigation: Focus on daily work, tax, and simplicity
const jdgNavGroups: NavGroupConfig[] = [
  {
    id: "daily",
    label: "DZIAŁALNOŚĆ",
    subtitle: "Codzienna praca",
    defaultExpanded: true,
    collapsible: false,
    showForJdg: true,
    items: [
      {
        id: "invoices",
        label: "Przychody",
        icon: FileText,
        path: "/income",
        tint: "finance",
        emphasis: true,
      },
      {
        id: "expenses",
        label: "Wydatki",
        icon: CreditCard,
        path: "/expense",
        tint: "finance",
      },
      {
        id: "bank",
        label: "Bank",
        icon: Landmark,
        pathResolver: (ctx) => ctx.bankPath,
        tint: "finance",
      },
      {
        id: "cash",
        label: "Kasa",
        icon: Wallet,
        path: "/accounting/kasa",
        tint: "finance",
      },
      {
        id: "inbox",
        label: "Skrzynka",
        icon: Inbox,
        path: "/inbox",
        tint: "finance",
      },
    ],
  },
  {
    id: "tax",
    label: "PODATKI",
    subtitle: "Księgowość i rozliczenia",
    defaultExpanded: false,
    showForJdg: true,
    items: [
      {
        id: "ledger",
        label: "Księga przychodów",
        icon: BookOpen,
        path: "/ledger",
        tint: "accounting",
      },
      {
        id: "accounting",
        label: "Rozliczenia",
        icon: Calculator,
        path: "/accounting",
        tint: "accounting",
      },
      {
        id: "events",
        label: "Zdarzenia",
        icon: Activity,
        path: "/events/timeline",
        tint: "accounting",
      },
    ],
  },
  {
    id: "reports",
    label: "RAPORTY",
    subtitle: "Analizy",
    defaultExpanded: false,
    showForJdg: true,
    items: [
      {
        id: "analytics",
        label: "Analizy",
        icon: TrendingUp,
        path: "/analytics",
        tint: "accounting",
      },
    ],
  },
  {
    id: "data",
    label: "DANE",
    subtitle: "Podstawowe",
    defaultExpanded: false,
    showForJdg: true,
    items: [
      {
        id: "customers",
        label: "Klienci",
        icon: Users,
        path: "/customers",
        tint: "operations",
      },
      {
        id: "products",
        label: "Produkty",
        icon: Package,
        path: "/products",
        tint: "operations",
      },
      {
        id: "employees",
        label: "Pracownicy",
        icon: UserCheck,
        path: "/employees",
        tint: "operations",
      },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    subtitle: "Ustawienia",
    collapsible: false,
    defaultExpanded: false,
    showForJdg: true,
    items: [
      {
        id: "projects",
        label: "Działy",
        icon: FolderKanban,
        path: "/settings/projects",
        tint: "system",
      },
      {
        id: "settings",
        label: "Ustawienia",
        icon: Settings,
        path: "/settings",
        tint: "system",
      },
    ],
  },
];

// Sp. z o.o. Navigation: Focus on operations, governance, and structure
const spoolkaNavGroups: NavGroupConfig[] = [
  {
    id: "operations",
    label: "OPERACJE",
    subtitle: "Ruch pieniędzy",
    defaultExpanded: true,
    collapsible: false,
    showForSpoolka: true,
    items: [
      {
        id: "invoices",
        label: "Faktury",
        icon: FileText,
        path: "/income",
        tint: "finance",
        emphasis: true,
      },
      {
        id: "expenses",
        label: "Wydatki",
        icon: CreditCard,
        path: "/expense",
        tint: "finance",
      },
      {
        id: "bank",
        label: "Bank",
        icon: Landmark,
        pathResolver: (ctx) => ctx.bankPath,
        tint: "finance",
      },
      {
        id: "cash",
        label: "Kasa",
        icon: Wallet,
        path: "/accounting/kasa",
        tint: "finance",
      },
      {
        id: "inbox",
        label: "Skrzynka",
        icon: Inbox,
        path: "/inbox",
        tint: "finance",
      },
    ],
  },
  {
    id: "accounting",
    label: "KSIĘGOWOŚĆ",
    subtitle: "Podatki i rozliczenia",
    defaultExpanded: false,
    showForSpoolka: true,
    items: [
      {
        id: "ledger",
        label: "Księga",
        icon: BookOpen,
        path: "/ledger",
        tint: "accounting",
      },
      {
        id: "accounting",
        label: "Rozliczenia",
        icon: Calculator,
        path: "/accounting",
        tint: "accounting",
      },
      {
        id: "events",
        label: "Zdarzenia",
        icon: Activity,
        path: "/events/timeline",
        tint: "accounting",
      },
    ],
  },
  {
    id: "governance",
    label: "SPÓŁKA",
    subtitle: "Struktura i zarządzanie",
    defaultExpanded: false,
    showForSpoolka: true,
    items: [
      {
        id: "decisions",
        label: "Decyzje",
        icon: Shield,
        path: "/decisions",
        tint: "structure",
      },
      {
        id: "documents",
        label: "Dokumenty",
        icon: FileText,
        path: "/documents",
        tint: "structure",
      },
      {
        id: "equity",
        label: "Kapitał i wspólnicy",
        icon: Users,
        path: "/accounting/equity",
        tint: "structure",
      },
      {
        id: "registry",
        label: "Rejestr spółki",
        icon: Building,
        path: "/accounting/company-registry",
        tint: "structure",
      },
      {
        id: "assets",
        label: "Majątek",
        icon: Landmark,
        path: "/assets",
        tint: "structure",
      },
    ],
  },
  {
    id: "data",
    label: "DANE",
    subtitle: "Podstawowe",
    defaultExpanded: false,
    showForSpoolka: true,
    items: [
      {
        id: "customers",
        label: "Klienci",
        icon: Users,
        path: "/customers",
        tint: "operations",
      },
      {
        id: "products",
        label: "Produkty",
        icon: Package,
        path: "/products",
        tint: "operations",
      },
      {
        id: "employees",
        label: "Pracownicy",
        icon: UserCheck,
        path: "/employees",
        tint: "operations",
      },
      {
        id: "warehouse",
        label: "Magazyn",
        icon: Boxes,
        path: "/inventory",
        tint: "operations",
        requiresPremium: true,
      },
      {
        id: "operations",
        label: "Operacje",
        icon: Truck,
        path: "/operations",
        tint: "operations",
      },
    ],
  },
  {
    id: "reports",
    label: "RAPORTY",
    subtitle: "Analizy i sprawozdania",
    defaultExpanded: false,
    showForSpoolka: true,
    items: [
      {
        id: "analytics",
        label: "Analizy",
        icon: TrendingUp,
        path: "/analytics",
        tint: "accounting",
      },
      {
        id: "balance",
        label: "Bilans",
        icon: Scale,
        path: "/accounting/balance-sheet",
        tint: "accounting",
      },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    subtitle: "Ustawienia",
    collapsible: false,
    defaultExpanded: false,
    showForSpoolka: true,
    items: [
      {
        id: "projects",
        label: "Działy",
        icon: FolderKanban,
        path: "/settings/projects",
        tint: "system",
      },
      {
        id: "settings",
        label: "Ustawienia",
        icon: Settings,
        path: "/settings",
        tint: "system",
      },
    ],
  },
];

export function buildNavGroups(ctx: NavContext): NavGroup[] {
  const entityType = ctx.entityType;
  
  // Select the appropriate navigation structure based on entity type
  const selectedNavConfig = entityType === "spoolka" ? spoolkaNavGroups : jdgNavGroups;

  return selectedNavConfig
    .filter((group) => {
      if (entityType === "spoolka") {
        return group.showForSpoolka !== false;
      }
      return group.showForJdg !== false;
    })
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          const entityAllowed = entityType === "spoolka" ? item.showForSpoolka !== false : item.showForJdg !== false;
          const premiumAllowed = !item.requiresPremium || ctx.hasPremium;
          return entityAllowed && premiumAllowed;
        })
        .map((item) => ({
          ...item,
          path: item.pathResolver ? item.pathResolver(ctx) : item.path || "/",
        })),
    }));
}
