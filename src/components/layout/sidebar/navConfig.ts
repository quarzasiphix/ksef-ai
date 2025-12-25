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
      {
        id: "analytics",
        label: "Analizy",
        icon: TrendingUp,
        path: "/analytics",
        tint: "finance",
      },
    ],
  },
  {
    id: "structure",
    label: "STRUKTURA",
    subtitle: "Formalności i dokumenty",
    items: [
      {
        id: "company",
        label: "Firma",
        icon: Building,
        path: "/dashboard",
        tint: "structure",
      },
      {
        id: "documents",
        label: "Dokumenty",
        icon: Signature,
        path: "/contracts",
        tint: "structure",
      },
      {
        id: "decisions",
        label: "Decyzje",
        icon: Shield,
        path: "/decisions",
        tint: "structure",
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
    id: "operations",
    label: "OPERACJE",
    subtitle: "Działanie firmy",
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
        id: "inbox",
        label: "Skrzynka",
        icon: Inbox,
        path: "/inbox",
        tint: "operations",
      },
    ],
  },
  {
    id: "accounting",
    label: "KSIĘGOWOŚĆ",
    subtitle: "Podatki i sprawozdania",
    showForSpoolka: true,
    items: [
      {
        id: "accounting-panel",
        label: "Księgowość",
        icon: Calculator,
        path: "/accounting",
        tint: "accounting",
      },
      {
        id: "balance",
        label: "Bilans",
        icon: Scale,
        path: "/accounting/balance-sheet",
        tint: "accounting",
      },
      {
        id: "capital",
        label: "Kapitał",
        icon: DollarSign,
        path: "/accounting/capital-events",
        tint: "accounting",
      },
      {
        id: "shareholders",
        label: "Wspólnicy",
        icon: Users,
        path: "/accounting/shareholders",
        tint: "accounting",
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
