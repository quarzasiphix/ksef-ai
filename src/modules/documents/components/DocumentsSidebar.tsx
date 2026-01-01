import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  SECTION_VIEWS,
  type DocumentSection,
} from '@/modules/documents/types/sections';
import { getFoldersForSection } from '@/modules/documents/types/smartFolders';

interface DocumentsSidebarProps {
  currentSection: DocumentSection | null;
  currentFolderId: string | null;
  onNavigate?: () => void;
}

const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  currentSection,
  currentFolderId,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const folders = currentSection ? getFoldersForSection(currentSection) : [];

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-module-sidebar text-module-sidebar-foreground">
      <div className="border-b border-module-sidebar-border p-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-module-sidebar-muted">
            Centrum dokumentów
          </p>
          <p className="text-sm text-module-sidebar-foreground/70">
            Sekcje i foldery dokumentów
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => handleNavigate('/documents')}
        >
          <Home className="h-4 w-4" />
          Pulpit dokumentów
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3">
          <p className="module-sidebar-section-header mb-1">Sekcje</p>
          <div className="space-y-1">
            {(Object.keys(SECTION_VIEWS) as DocumentSection[]).map(section => {
              const view = SECTION_VIEWS[section];
              const Icon = view.theme.icon;
              const isActive = currentSection === section;
              return (
                <NavLink
                  key={section}
                  to={`/documents/${section}`}
                  onClick={onNavigate}
                  className={({ isActive: navIsActive }) =>
                    cn(
                      'module-sidebar-item flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      (navIsActive || isActive) && 'active font-semibold',
                    )
                  }
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: view.theme.iconColor }}
                  />
                  <span className="flex-1 truncate">{view.title}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {currentSection && folders.length > 0 && (
          <div className="mt-6 px-3">
            <p className="module-sidebar-section-header mb-1">Foldery</p>
            <div className="space-y-1">
              {folders.map(folder => {
                const isActive = currentFolderId === folder.id;
                return (
                  <NavLink
                    key={folder.id}
                    to={`/documents/${currentSection}/folders/${folder.id}`}
                    onClick={onNavigate}
                    className={({ isActive: navIsActive }) =>
                      cn(
                        'module-sidebar-item flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        (navIsActive || isActive) && 'active font-semibold',
                      )
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="flex-1 truncate">{folder.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSidebar;
