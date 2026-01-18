import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, FolderTree, FileText, ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Copy, ArrowRightLeft, Building2, Link as LinkIcon, FileCheck, Scale, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import {
  SECTION_VIEWS,
  type DocumentSection,
} from '@/modules/documents/types/sections';
import { getFoldersForSection } from '@/modules/documents/types/smartFolders';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { StorageFolderTreeNode } from '@/modules/documents/types/storage';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/shared/ui/context-menu';
import { useDepartment } from '@/shared/context/DepartmentContext';
import { useStorageFoldersByDepartment } from '../hooks/useStorageFoldersByDepartment';

interface DocumentsSidebarProps {
  currentSection: DocumentSection | null;
  currentFolderId: string | null;
  onNavigate?: () => void;
  storageFolders?: StorageFolderTreeNode[];
  selectedStorageFolderId?: string;
  onStorageFolderSelect?: (folderId: string) => void;
  onCreateStorageFolder?: () => void;
  onRenameStorageFolder?: (folderId: string) => void;
  onDeleteStorageFolder?: (folderId: string) => void;
  onMoveStorageFolder?: (folderId: string) => void;
  onCopyStorageFolder?: (folderId: string) => void;
  draggedFileId?: string;
  onFileDropOnFolder?: (folderId: string) => void;
}

type ViewMode = 'sections' | 'repository';

const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  currentSection,
  currentFolderId,
  onNavigate,
  storageFolders = [],
  selectedStorageFolderId,
  onStorageFolderSelect,
  onCreateStorageFolder,
  onRenameStorageFolder,
  onDeleteStorageFolder,
  onMoveStorageFolder,
  onCopyStorageFolder,
  draggedFileId,
  onFileDropOnFolder,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDepartment } = useDepartment();
  const { foldersByDepartment } = useStorageFoldersByDepartment();
  const [viewMode, setViewMode] = useState<ViewMode>(
    location.pathname.includes('/repository') ? 'repository' : 'sections'
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [contextMenuFolderId, setContextMenuFolderId] = useState<string | null>(null);
  const folders = currentSection ? getFoldersForSection(currentSection) : [];
  
  // Determine if we should show department grouping
  const showDepartmentGrouping = viewMode === 'repository' && !selectedDepartment && foldersByDepartment.length > 1;

  // Helper to get department color
  const getDepartmentColor = (deptId: string): string => {
    const dept = foldersByDepartment.find(d => d.departmentId === deptId);
    return dept?.departmentColor || '#6b7280';
  };

  // Helper to get department name
  const getDepartmentName = (deptId: string): string => {
    const dept = foldersByDepartment.find(d => d.departmentId === deptId);
    return dept?.departmentName || 'Unknown';
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'repository') {
      handleNavigate('/documents/repository');
    } else {
      handleNavigate('/documents');
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderStorageFolder = (folder: StorageFolderTreeNode) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedStorageFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isDragTarget = dragOverFolderId === folder.id;
    const isContextMenuOpen = contextMenuFolderId === folder.id;
    const isVirtual = (folder as any).is_virtual;
    const virtualIcon = (folder as any).icon;

    return (
      <ContextMenu key={folder.id} onOpenChange={(open) => {
        if (open) {
          setContextMenuFolderId(folder.id);
        } else {
          setContextMenuFolderId(null);
        }
      }}>
        <ContextMenuTrigger asChild>
          <div className="select-none">
            <div
              className={cn(
                'flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent/50 cursor-pointer group transition-colors duration-200',
                isSelected && 'bg-primary/10 border border-primary/30 text-primary font-medium',
                isContextMenuOpen && 'bg-primary/10 ring-2 ring-primary/20'
              )}
              style={{ paddingLeft: `${folder.level * 12 + 8}px` }}
              onDragOver={(e) => {
                // Support both file moves and external file drops
                e.preventDefault();
                e.dataTransfer.dropEffect = draggedFileId ? 'move' : 'copy';
                setDragOverFolderId(folder.id);
              }}
              onDragLeave={(e) => {
                if ((e.relatedTarget as HTMLElement)?.closest('[data-folder-id]')?.getAttribute('data-folder-id') === folder.id) {
                  return;
                }
                setDragOverFolderId((prev) => (prev === folder.id ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                
                // Check if it's a file move or external files
                if (draggedFileId) {
                  onFileDropOnFolder?.(folder.id);
                } else if (e.dataTransfer.files.length > 0) {
                  // External files dropped - trigger upload dialog
                  const files = Array.from(e.dataTransfer.files);
                  console.log('Files dropped on folder:', folder.id, files);
                  // TODO: Open upload dialog with these files and target folder
                }
                
                setDragOverFolderId(null);
              }}
              data-folder-id={folder.id}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className={cn(
                  "p-0.5 hover:bg-accent/50 rounded transition-colors duration-200",
                  isSelected && "text-primary"
                )}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-module-sidebar-muted")} />
                  ) : (
                    <ChevronRight className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-module-sidebar-muted")} />
                  )
                ) : (
                  <span className="w-3.5" />
                )}
              </button>

              <div
                className={cn(
                  'flex items-center gap-2 flex-1 min-w-0 border border-transparent rounded-md px-1 py-0.5 transition-colors',
                  isDragTarget && draggedFileId && 'border-primary/40 bg-primary/5',
                  isVirtual && 'bg-blue-500/5 border-blue-200'
                )}
                onClick={() => onStorageFolderSelect?.(folder.id)}
              >
                {/* Virtual folder icon */}
                {isVirtual ? (
                  virtualIcon === 'DollarSign' ? (
                    <DollarSign className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  ) : virtualIcon === 'TrendingUp' ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  )
                ) : isExpanded ? (
                  <FolderOpen className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-primary" : "text-amber-500")} />
                ) : (
                  <Folder className={cn("h-3.5 w-3.5 flex-shrink-0", isSelected ? "text-primary" : "text-amber-500")} />
                )}
                <span className="text-sm truncate">{folder.name}</span>
                {isVirtual && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Wirtualny
                  </Badge>
                )}
                {folder.file_count !== undefined && folder.file_count > 0 && (
                  <span className="text-xs text-module-sidebar-muted">({folder.file_count})</span>
                )}
                {/* Department indicator dot */}
                {folder.department_id && (
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                    style={{ backgroundColor: getDepartmentColor(folder.department_id) }}
                    title={getDepartmentName(folder.department_id)}
                  />
                )}
              </div>
            </div>

            {isExpanded && hasChildren && (
              <div>
                {folder.children.map(child => renderStorageFolder(child))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onStorageFolderSelect?.(folder.id)}>
            Otwórz
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRenameStorageFolder?.(folder.id)}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Zmień nazwę
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onMoveStorageFolder?.(folder.id)}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
            Przenieś
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCopyStorageFolder?.(folder.id)}>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Kopiuj
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteStorageFolder?.(folder.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Usuń folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
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

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sections" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Sekcje
            </TabsTrigger>
            <TabsTrigger value="repository" className="text-xs">
              <FolderTree className="h-3 w-3 mr-1" />
              Katalogi
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
        {viewMode === 'sections' ? (
          <>
            {/* Powiązane (Linked) */}
            <div className="px-3 mb-6">
              <p className="module-sidebar-section-header mb-2 text-xs uppercase tracking-wide">Powiązane</p>
              <div className="space-y-1">
                <NavLink
                  to="/documents/attachments"
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'module-sidebar-item flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive && 'active font-semibold',
                    )
                  }
                >
                  <LinkIcon className="h-4 w-4" />
                  <span className="flex-1 truncate">Załączniki</span>
                </NavLink>
              </div>
            </div>

            {/* Rejestry (Registers) */}
            <div className="px-3 mb-6">
              <p className="module-sidebar-section-header mb-2 text-xs uppercase tracking-wide">Rejestry</p>
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
                <NavLink
                  to="/decisions"
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'module-sidebar-item flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive && 'active font-semibold',
                    )
                  }
                >
                  <Scale className="h-4 w-4 text-purple-600" />
                  <span className="flex-1 truncate">Decyzje i uchwały</span>
                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                </NavLink>
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
          </>
        ) : (
          <div className="px-3">
            <div className="mb-4">
              <p className="module-sidebar-section-header mb-2 text-xs uppercase tracking-wide">Repozytorium</p>
              <p className="text-xs text-module-sidebar-foreground/60 mb-3">
                Fizyczna struktura katalogów i plików
              </p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Foldery</p>
              {onCreateStorageFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onCreateStorageFolder}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            
            {/* Department indicator */}
            {selectedDepartment && (
              <div className="mb-3">
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {selectedDepartment.name}
                </Badge>
              </div>
            )}
            
            {storageFolders.length === 0 && !showDepartmentGrouping ? (
              <div className="text-center py-4">
                <Folder className="h-8 w-8 text-module-sidebar-muted mx-auto mb-2" />
                <p className="text-xs text-module-sidebar-muted mb-2">Brak folderów</p>
                {onCreateStorageFolder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateStorageFolder}
                    className="text-xs"
                  >
                    <FolderPlus className="h-3 w-3 mr-1" />
                    Utwórz folder
                  </Button>
                )}
              </div>
            ) : showDepartmentGrouping ? (
              <div className="space-y-3">
                {foldersByDepartment.map((dept, index) => (
                  <div key={dept.departmentId || 'company-wide'}>
                    {/* Department separator */}
                    {index > 0 && <div className="border-t border-module-sidebar-border my-2" />}
                    
                    <div 
                      className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md sticky top-0 z-10"
                      style={{ 
                        backgroundColor: dept.departmentColor ? `${dept.departmentColor}20` : 'rgba(107, 114, 128, 0.15)',
                        borderLeft: `3px solid ${dept.departmentColor || '#6b7280'}`,
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <Building2 
                        className="h-3.5 w-3.5 flex-shrink-0" 
                        style={{ color: dept.departmentColor || '#6b7280' }}
                      />
                      <span 
                        className="text-xs font-bold uppercase tracking-wider flex-1 truncate"
                        style={{ color: dept.departmentColor || '#6b7280' }}
                      >
                        {dept.departmentName}
                      </span>
                      <span 
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: dept.departmentColor ? `${dept.departmentColor}30` : 'rgba(107, 114, 128, 0.2)',
                          color: dept.departmentColor || '#6b7280'
                        }}
                      >
                        {dept.folders.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dept.folders.map(folder => renderStorageFolder(folder))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {storageFolders.map(folder => renderStorageFolder(folder))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSidebar;
