import React, { useState, useRef, useEffect } from 'react';
import { Search, Grid, List, Upload, FolderPlus, Pencil, Trash2, Copy, ArrowRightLeft, ExternalLink, Folder, Building2, AlertCircle, Link as LinkIcon, Eye, EyeOff, Loader2, ChevronDown, Filter, Menu } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { StorageFile } from '../../types/storage';
import { formatFileSize, getFileIcon } from '../../types/storage';
import * as LucideIcons from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/shared/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, } from '@/shared/ui/sheet';
import { AttachmentLinksPopover } from '../AttachmentLinksPopover';
import { useDepartment } from '@/shared/context/DepartmentContext';

// Extended StorageFile type with attachment stats from view
interface StorageFileWithStats extends StorageFile {
  attachment_count?: number;
  linked_entities_count?: number;
  link_status?: 'unlinked' | 'in_use' | 'unknown';
  requires_attention?: boolean;
}

interface FileBrowserProps {
  files: StorageFileWithStats[];
  currentFolderId?: string;
  currentFolderName?: string;
  currentFolderPath?: string;
  currentDepartmentId?: string;
  onFileSelect: (fileId: string) => void;
  onUploadFile?: () => void;
  onCreateFolder?: () => void;
  onFileDragStart?: (fileId: string) => void;
  onFileDragEnd?: () => void;
  onFileOpen?: (fileId: string) => void;
  onFileRename?: (fileId: string) => void;
  onFileMove?: (fileId: string) => void;
  onFileCopy?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onAttachFile?: (fileId: string) => void;
  onToggleFileViewer?: () => void;
  showFileViewer?: boolean;
  selectedFileId?: string;
  departmentColors?: Map<string, string>;
  departmentNames?: Map<string, string>;
  className?: string;
  isUploading?: boolean;
  onToggleMobileSidebar?: () => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';

// Custom animation for eye icon bounce-in effect
const eyeIconAnimation = `
  @keyframes bounce-in {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.1) rotate(10deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out;
  }
`;

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  currentFolderId,
  currentFolderName,
  currentFolderPath,
  currentDepartmentId,
  onFileSelect,
  onUploadFile,
  onCreateFolder,
  onFileDragStart,
  onFileDragEnd,
  onFileOpen,
  onFileRename,
  onFileMove,
  onFileCopy,
  onFileDelete,
  onAttachFile,
  onToggleFileViewer,
  showFileViewer,
  selectedFileId,
  departmentColors,
  departmentNames,
  className,
  isUploading,
  onToggleMobileSidebar,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMobileFile, setSelectedMobileFile] = useState<StorageFileWithStats | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressThreshold = 500; // 500ms for long press
  const lastTapTime = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const doubleTapDelay = 300; // 300ms between taps for double click

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile long press handlers
  const handleTouchStart = (file: StorageFileWithStats) => {
    if (!isMobile) return;
    
    longPressTimer.current = setTimeout(() => {
      setSelectedMobileFile(file);
      setMobileMenuOpen(true);
    }, longPressThreshold);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const filteredFiles = files.filter(file =>
    (file.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (file.tags?.some?.(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) || false)
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.file_name || '').localeCompare(b.file_name || '');
      case 'date':
        return new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime();
      case 'size':
        return (b.file_size || 0) - (a.file_size || 0);
      case 'type':
        return (a.file_extension || '').localeCompare(b.file_extension || '');
      default:
        return 0;
    }
  });

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.File;
  };

  const handleDragStart = (event: React.DragEvent, fileId: string) => {
    event.dataTransfer.setData('application/x-storage-file-id', fileId);
    event.dataTransfer.effectAllowed = 'move';
    onFileDragStart?.(fileId);
  };

  const handleDragEnd = () => {
    onFileDragEnd?.();
  };

  // Handle double click on mobile for selected files
  const handleMobileFileClick = (file: StorageFileWithStats) => {
    const currentTime = Date.now();
    
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
    }
    
    // Check if this is a double tap (within 300ms of last tap)
    if (currentTime - lastTapTime.current < doubleTapDelay) {
      // Double tap detected
      if (selectedFileId === file.id) {
        // File is already selected, open the viewer
        console.log('Mobile double click detected, opening file:', file.file_name);
        onFileOpen?.(file.id);
      } else {
        // Different file, select it first
        onFileSelect(file.id);
      }
      lastTapTime.current = 0; // Reset to prevent triple taps
    } else {
      // Single tap - select the file
      onFileSelect(file.id);
      // Set a timeout to reset the tap time
      tapTimeout.current = setTimeout(() => {
        lastTapTime.current = 0;
        tapTimeout.current = null;
      }, doubleTapDelay);
    }
    
    lastTapTime.current = currentTime;
  };

  const renderFileCard = (file: StorageFileWithStats) => {
    const iconName = getFileIcon(file.mime_type, file.file_extension);
    const Icon = getIconComponent(iconName);

    return (
      <>
        {/* Desktop context menu */}
        {!isMobile ? (
          <ContextMenu key={file.id}>
            <ContextMenuTrigger asChild>
              <div
                className="flex flex-col p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  onFileSelect(file.id);
                  onFileOpen?.(file.id);
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, file.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center justify-center h-16 mb-2">
                  <Icon className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <p className="text-sm font-medium truncate" title={file.file_name || 'Untitled'}>
                      {file.file_name || 'Untitled'}
                    </p>
                    {file.department_id && departmentColors && (
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: departmentColors.get(file.department_id) || '#6b7280' }}
                        title={departmentNames?.get(file.department_id) || 'Department'}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(file.file_size || 0)}
                  </p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => onFileOpen?.(file.id)}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Otwórz
              </ContextMenuItem>
              {file.link_status === 'unlinked' && onAttachFile && (
                <ContextMenuItem onClick={() => onAttachFile(file.id)}>
                  <LinkIcon className="h-3.5 w-3.5 mr-2" />
                  Przypisz do...
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onFileRename?.(file.id)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Zmień nazwę
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileMove?.(file.id)}>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                Przenieś
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileCopy?.(file.id)}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Kopiuj
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onFileDelete?.(file.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Usuń plik
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          /* Mobile touch interaction - always use card layout on mobile */
          <div
            key={file.id}
            className={cn(
              "flex flex-col p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 active:bg-accent/50 relative",
              selectedFileId === file.id && "border-primary bg-primary/5 ring-2 ring-primary/20"
            )}
            onClick={() => {
              console.log('Mobile file clicked:', file.id, file.file_name);
              handleMobileFileClick(file);
            }}
            onTouchStart={() => handleTouchStart(file)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            {/* Eye icon animation for selected file */}
            {selectedFileId === file.id && (
              <div className="absolute top-2 right-2 animate-bounce-in">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            )}
            
            <div className="flex items-center justify-center h-16 mb-2">
              <Icon 
                className={cn(
                  "h-12 w-12 transition-colors duration-200",
                  selectedFileId === file.id ? "text-primary" : "text-muted-foreground"
                )} 
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <p className="text-sm font-medium truncate" title={file.file_name || 'Untitled'}>
                  {file.file_name || 'Untitled'}
                </p>
                {file.department_id && departmentColors && (
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: departmentColors.get(file.department_id) || '#6b7280' }}
                    title={departmentNames?.get(file.department_id) || 'Department'}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(file.file_size || 0)}
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderFileRow = (file: StorageFileWithStats) => {
    const iconName = getFileIcon(file.mime_type, file.file_extension);
    const Icon = getIconComponent(iconName);

    return (
      <ContextMenu key={file.id}>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 p-4 md:p-3 border-b hover:bg-muted/50 cursor-pointer transition-all duration-200 active:bg-accent/30 relative",
              selectedFileId === file.id && "border-l-4 border-l-primary bg-primary/5"
            )}
            onClick={() => {
              onFileSelect(file.id);
              onFileOpen?.(file.id);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, file.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Eye icon for selected file */}
            {selectedFileId === file.id && (
              <div className="absolute top-2 right-2 animate-bounce-in">
                <Eye className="h-4 w-4 text-primary" />
              </div>
            )}
            
            <Icon 
              className={cn(
                "h-6 w-6 md:h-5 md:w-5 transition-colors duration-200 flex-shrink-0",
                selectedFileId === file.id ? "text-primary" : "text-muted-foreground"
              )} 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base md:text-sm font-medium truncate">{file.file_name || 'Untitled'}</p>
                {file.department_id && departmentColors && (
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: departmentColors.get(file.department_id) || '#6b7280' }}
                    title={departmentNames?.get(file.department_id) || 'Department'}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 md:mt-1">
                {/* File info - visible on mobile */}
                <span className="text-xs text-muted-foreground md:hidden">
                  {file.file_extension?.toUpperCase() || 'FILE'} • {formatFileSize(file.file_size || 0)}
                </span>
                
                {/* Status pill */}
                {file.link_status === 'unlinked' && (
                  <Badge variant="outline" className="text-xs text-muted-foreground hidden md:inline-flex">
                    Niepowiązany
                  </Badge>
                )}
                {file.link_status === 'in_use' && (
                  <Badge variant="secondary" className="text-xs text-blue-600 hidden md:inline-flex">
                    W użyciu
                  </Badge>
                )}
                {file.requires_attention && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Wymaga uwagi
                  </Badge>
                )}
                
                {/* Powiązania pill with popover */}
                {file.attachment_count !== undefined && file.attachment_count > 0 && (
                  <AttachmentLinksPopover fileId={file.id} linkCount={file.attachment_count}>
                    <Badge 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-accent hidden md:inline-flex"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Powiązane: {file.attachment_count}
                    </Badge>
                  </AttachmentLinksPopover>
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="w-16 text-right">{file.file_extension?.toUpperCase() || '—'}</span>
              <span className="w-20 text-right">{formatFileSize(file.file_size || 0)}</span>
              <span className="w-32 text-right">
                {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('pl-PL') : '—'}
              </span>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onFileOpen?.(file.id)}>
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Otwórz
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onFileRename?.(file.id)}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Zmień nazwę
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onFileMove?.(file.id)}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
            Przenieś
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onFileCopy?.(file.id)}>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Kopiuj
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onFileDelete?.(file.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Usuń plik
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div 
        className="border-b"
        style={{
          backgroundColor: currentDepartmentId && departmentColors 
            ? `${departmentColors.get(currentDepartmentId)}08`
            : 'rgb(var(--muted) / 0.3)',
          borderBottomColor: currentDepartmentId && departmentColors
            ? `${departmentColors.get(currentDepartmentId)}40`
            : undefined
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Folder 
                className="h-6 w-6 md:h-5 md:w-5 flex-shrink-0" 
                style={{ 
                  color: currentDepartmentId && departmentColors
                    ? departmentColors.get(currentDepartmentId)
                    : '#f59e0b'
                }}
              />
              <h2 
                className="text-xl md:text-lg font-semibold truncate"
                style={{
                  color: currentDepartmentId && departmentColors
                    ? departmentColors.get(currentDepartmentId)
                    : undefined
                }}
              >
                {currentFolderName || 'Repozytorium plików'}
              </h2>
              {currentDepartmentId && departmentNames && (
                <Badge 
                  variant="secondary" 
                  className="flex-shrink-0 hidden md:inline-flex"
                  style={{ 
                    backgroundColor: `${departmentColors?.get(currentDepartmentId)}25`,
                    color: departmentColors?.get(currentDepartmentId),
                    borderColor: departmentColors?.get(currentDepartmentId)
                  }}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  {departmentNames.get(currentDepartmentId)}
                </Badge>
              )}
            </div>
            {currentFolderPath && (
              <p className="text-xs text-muted-foreground truncate">
                {currentFolderPath}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onCreateFolder && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCreateFolder}
                className="flex-1 md:flex-none h-10 md:h-9"
                style={currentDepartmentId && departmentColors ? {
                  borderColor: departmentColors.get(currentDepartmentId),
                  color: departmentColors.get(currentDepartmentId)
                } : undefined}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nowy folder</span>
                <span className="sm:hidden">Folder</span>
              </Button>
            )}
            {onUploadFile && (
              <Button 
                size="sm" 
                onClick={onUploadFile}
                className="flex-1 md:flex-none h-10 md:h-9"
                style={currentDepartmentId && departmentColors ? {
                  backgroundColor: departmentColors.get(currentDepartmentId),
                  borderColor: departmentColors.get(currentDepartmentId)
                } : undefined}
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dodaj plik</span>
                <span className="sm:hidden">Plik</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj plików..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Desktop filter buttons */}
        <div className="hidden sm:flex sm:items-center sm:gap-1 sm:border-l sm:pl-3">
          <Button
            variant={sortBy === 'name' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('name')}
          >
            Nazwa
          </Button>
          <Button
            variant={sortBy === 'date' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('date')}
          >
            Data
          </Button>
          <Button
            variant={sortBy === 'size' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('size')}
          >
            Rozmiar
          </Button>
        </div>

        {/* Desktop view mode buttons */}
        <div className="hidden sm:flex sm:items-center sm:gap-1 sm:border-l sm:pl-3">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile filter dropdown */}
        <div className="flex sm:hidden items-center gap-1 border-l pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 text-sm font-medium border-b">
                Sortuj według
              </div>
              <DropdownMenuItem onClick={() => setSortBy('name')} className={sortBy === 'name' ? 'bg-accent' : ''}>
                Nazwa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('date')} className={sortBy === 'date' ? 'bg-accent' : ''}>
                Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('size')} className={sortBy === 'size' ? 'bg-accent' : ''}>
                Rozmiar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 text-sm font-medium border-b">
                Widok
              </div>
              <DropdownMenuItem onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-accent' : ''}>
                <List className="h-4 w-4 mr-2" />
                Lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-accent' : ''}>
                <Grid className="h-4 w-4 mr-2" />
                Siatka
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Upload Progress Indicator */}
        {isUploading && (
          <div className="flex items-center gap-2 border-l pl-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Przesyłanie...</span>
          </div>
        )}

        {selectedFileId && onToggleFileViewer && (
          <div className="flex items-center gap-1 border-l pl-3 lg:block hidden">
            <Button
              variant={showFileViewer ? 'default' : 'ghost'}
              size="sm"
              onClick={onToggleFileViewer}
              title={showFileViewer ? 'Ukryj podgląd pliku' : 'Pokaż podgląd pliku'}
            >
              {showFileViewer ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ukryj podgląd
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Pokaż podgląd
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mobile podgląd button - always visible on mobile */}
        {selectedFileId && onToggleFileViewer && (
          <div className="flex items-center gap-1 border-l pl-3 block lg:hidden">
            <Button
              variant={showFileViewer ? 'default' : 'ghost'}
              size="sm"
              onClick={onToggleFileViewer}
              title={showFileViewer ? 'Ukryj podgląd pliku' : 'Pokaż podgląd pliku'}
              className="h-8 w-8 p-0 sm:h-8 sm:w-8 sm:p-0"
            >
              {showFileViewer ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Mobile sidebar toggle button */}
        {onToggleMobileSidebar && (
          <div className="flex items-center gap-1 border-l pl-3 block lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleMobileSidebar}
              title="Otwórz panel folderów"
              className="h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {sortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Upload className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Nie znaleziono plików' : 'Brak plików'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'Spróbuj zmienić kryteria wyszukiwania'
                : 'Dodaj pierwszy plik do tego folderu'}
            </p>
            {onUploadFile && !searchQuery && (
              <Button onClick={onUploadFile}>
                <Upload className="h-4 w-4 mr-2" />
                Dodaj plik
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {sortedFiles.map(file => renderFileCard(file))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {sortedFiles.map(file => renderFileRow(file))}
          </div>
        )}
      </div>
      
      {/* Mobile Context Menu - Sheet for long press */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Opcje pliku</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {selectedMobileFile && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {(() => {
                    const iconName = getFileIcon(selectedMobileFile.mime_type, selectedMobileFile.file_extension);
                    const Icon = getIconComponent(iconName);
                    return <Icon className="h-6 w-6 text-muted-foreground" />;
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedMobileFile.file_name || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedMobileFile.file_size || 0)}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onFileOpen?.(selectedMobileFile.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Otwórz</span>
                  </button>
                  
                  {selectedMobileFile.link_status === 'unlinked' && onAttachFile && (
                    <button
                      onClick={() => {
                        onAttachFile(selectedMobileFile.id);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>Przypisz do...</span>
                    </button>
                  )}
                  
                  <div className="border-t pt-2 mt-2">
                    <button
                      onClick={() => {
                        onFileRename?.(selectedMobileFile.id);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Zmień nazwę</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onFileMove?.(selectedMobileFile.id);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Przenieś</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onFileCopy?.(selectedMobileFile.id);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Kopiuj</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onFileDelete?.(selectedMobileFile.id);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Usuń plik</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
};
