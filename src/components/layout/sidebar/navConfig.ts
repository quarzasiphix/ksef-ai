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

const navGroupsConfig: NavGroupConfig[] = [
  {
    id: "money",
    label: "PIENIĄDZE",
    subtitle: "Przepływ pieniędzy",
    defaultExpanded: true,
    items: [
      {
        id: "ledger",
        label: "Księga",
        icon: BookOpen,
        path: "/ledger",
        tint: "finance",
        emphasis: true,
      },
      {
        id: "inbox",
        label: "Skrzynka",
        icon: Inbox,
        path: "/inbox",
        tint: "finance",
      },
      {
        id: "invoices",
        label: "Faktury",
        icon: FileText,
        path: "/income",
        tint: "finance",
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
    ],
  },
  {
    id: "reports",
    label: "RAPORTY",
    subtitle: "Analizy i sprawozdania",
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
        showForSpoolka: true,
      },
    ],
  },
  {
    id: "compliance",
    label: "ZGODNOŚĆ",
    subtitle: "Zasady i formalności",
    items: [
      {
        id: "decisions",
        label: "Decyzje",
        icon: Shield,
        path: "/decisions",
        tint: "structure",
      },
      {
        id: "contracts",
        label: "Umowy",
        icon: Signature,
        path: "/contracts",
        tint: "structure",
      },
      {
        id: "equity",
        label: "Kapitał i wspólnicy",
        icon: Users,
        path: "/accounting/equity",
        tint: "structure",
        showForSpoolka: true,
      },
      {
        id: "registry",
        label: "Rejestr spółki",
        icon: Building,
        path: "/accounting/company-registry",
        tint: "structure",
        showForSpoolka: true,
      },
      {
        id: "assets",
        label: "Majątek",
        icon: Landmark,
        path: "/assets",
        tint: "structure",
        showForSpoolka: true,
      },
    ],
  },
  {
    id: "data",
    label: "DANE",
    subtitle: "Dane podstawowe",
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
        showForSpoolka: true,
      },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    subtitle: "Ustawienia",
    collapsible: false,
    items: [
      {
        id: "projects",
        label: "Projekty",
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

  return navGroupsConfig
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
