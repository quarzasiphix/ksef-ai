import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FileText, FolderOpen, Upload, Filter, FileCheck, 
  Receipt, Award, Briefcase, ArrowUpCircle, ArrowDownCircle,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DocumentsSidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onItemSelect?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({ 
  collapsed = false, 
  onToggleCollapsed,
  onItemSelect 
}) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/contracts') {
      return location.pathname === '/contracts';
    }
    return location.pathname.startsWith(href);
  };

  const navSections: NavSection[] = [
    {
      title: 'FILTRY',
      items: [
        { label: 'Wszystkie', href: '/contracts', icon: <FileText className="h-4 w-4" /> },
        { label: 'Przesłane', href: '/contracts?view=uploaded', icon: <Upload className="h-4 w-4" /> },
        { label: 'Wygenerowane', href: '/contracts?view=generated', icon: <FileCheck className="h-4 w-4" /> },
      ],
    },
    {
      title: 'RODZAJ',
      items: [
        { label: 'Umowy transakcyjne', href: '/contracts?category=transactional', icon: <Receipt className="h-4 w-4" /> },
        { label: 'Przychody', href: '/contracts?category=payin', icon: <ArrowDownCircle className="h-4 w-4" /> },
        { label: 'Wydatki', href: '/contracts?category=payout', icon: <ArrowUpCircle className="h-4 w-4" /> },
        { label: 'Informacyjne', href: '/contracts?category=informational', icon: <FileText className="h-4 w-4" /> },
      ],
    },
    {
      title: 'ŹRÓDŁO',
      items: [
        { label: 'Decyzje', href: '/contracts?source=decisions', icon: <Award className="h-4 w-4" /> },
        { label: 'Umowy', href: '/contracts?source=contracts', icon: <Briefcase className="h-4 w-4" /> },
      ],
    },
    {
      title: 'FOLDERY',
      items: [
        { label: 'Zarządzaj folderami', href: '/contracts/folders', icon: <FolderOpen className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-module-sidebar module-sidebar">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-3 border-b border-module-sidebar-border">
        {!collapsed && (
          <h3 className="text-sm font-semibold text-module-sidebar-foreground">
            Dokumenty
          </h3>
        )}
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className="h-7 w-7 text-module-sidebar-foreground hover:bg-module-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Scrollable navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="module-sidebar-section-header">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onItemSelect}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md transition-colors module-sidebar-item',
                    isActive(item.href) && 'active',
                    collapsed && 'justify-center'
                  )}
                >
                  {item.icon}
                  {!collapsed && (
                    <span className="flex-1 text-sm">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="text-xs bg-module-sidebar-accent px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsSidebar;
