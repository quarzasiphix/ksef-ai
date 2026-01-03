import React, { useState } from 'react';
import { Search, Grid, List, Upload, FolderPlus, Pencil, Trash2, Copy, ArrowRightLeft, ExternalLink, Folder, Building2, AlertCircle, Link as LinkIcon } from 'lucide-react';
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
import { AttachmentLinksPopover } from '../AttachmentLinksPopover';

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
  departmentColors?: Map<string, string>;
  departmentNames?: Map<string, string>;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';

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
  departmentColors,
  departmentNames,
  className,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.file_name.localeCompare(b.file_name);
      case 'date':
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      case 'size':
        return b.file_size - a.file_size;
      case 'type':
        return a.file_extension.localeCompare(b.file_extension);
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

  const renderFileCard = (file: StorageFileWithStats) => {
    const iconName = getFileIcon(file.mime_type, file.file_extension);
    const Icon = getIconComponent(iconName);

    return (
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
                <p className="text-sm font-medium truncate" title={file.file_name}>
                  {file.file_name}
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
                {formatFileSize(file.file_size)}
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
    );
  };

  const renderFileRow = (file: StorageFileWithStats) => {
    const iconName = getFileIcon(file.mime_type, file.file_extension);
    const Icon = getIconComponent(iconName);

    return (
      <ContextMenu key={file.id}>
        <ContextMenuTrigger asChild>
          <div
            className="flex items-center gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => {
              onFileSelect(file.id);
              onFileOpen?.(file.id);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, file.id)}
            onDragEnd={handleDragEnd}
          >
            <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                {file.department_id && departmentColors && (
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: departmentColors.get(file.department_id) || '#6b7280' }}
                    title={departmentNames?.get(file.department_id) || 'Department'}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {/* Status pill */}
                {file.link_status === 'unlinked' && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Niepowiązany
                  </Badge>
                )}
                {file.link_status === 'in_use' && (
                  <Badge variant="secondary" className="text-xs text-blue-600">
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
                      className="text-xs cursor-pointer hover:bg-accent"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Powiązane: {file.attachment_count}
                    </Badge>
                  </AttachmentLinksPopover>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="w-16 text-right">{file.file_extension.toUpperCase()}</span>
              <span className="w-20 text-right">{formatFileSize(file.file_size)}</span>
              <span className="w-32 text-right">
                {new Date(file.uploaded_at).toLocaleDateString('pl-PL')}
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
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Folder 
                className="h-5 w-5 flex-shrink-0" 
                style={{ 
                  color: currentDepartmentId && departmentColors
                    ? departmentColors.get(currentDepartmentId)
                    : '#f59e0b'
                }}
              />
              <h2 
                className="text-lg font-semibold truncate"
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
                  className="flex-shrink-0"
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
              <p className="text-xs text-muted-foreground font-mono truncate">
                {currentFolderPath}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {sortedFiles.length} {sortedFiles.length === 1 ? 'plik' : 'plików'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onCreateFolder && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCreateFolder}
                style={currentDepartmentId && departmentColors ? {
                  borderColor: departmentColors.get(currentDepartmentId),
                  color: departmentColors.get(currentDepartmentId)
                } : undefined}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nowy folder
              </Button>
            )}
            {onUploadFile && (
              <Button 
                size="sm" 
                onClick={onUploadFile}
                style={currentDepartmentId && departmentColors ? {
                  backgroundColor: departmentColors.get(currentDepartmentId),
                  borderColor: departmentColors.get(currentDepartmentId)
                } : undefined}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dodaj plik
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

        <div className="flex items-center gap-1 border-l pl-3">
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

        <div className="flex items-center gap-1 border-l pl-3">
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
    </div>
  );
};
