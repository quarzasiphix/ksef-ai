import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Plus, MoreVertical, Trash2, Edit, FolderPlus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import type { StorageFolderTreeNode, StorageFile } from '../../types/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface DirectoryTreeProps {
  folders: StorageFolderTreeNode[];
  files: StorageFile[];
  selectedFolderId?: string;
  selectedFileId?: string;
  onFolderSelect: (folderId: string) => void;
  onFileSelect: (fileId: string) => void;
  onCreateFolder?: (parentId?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string) => void;
  onUploadFile?: (folderId: string) => void;
  className?: string;
}

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  folders,
  files,
  selectedFolderId,
  selectedFileId,
  onFolderSelect,
  onFileSelect,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onUploadFile,
  className,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const renderFolder = (folder: StorageFolderTreeNode) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer group',
            isSelected && 'bg-muted'
          )}
          style={{ paddingLeft: `${folder.level * 12 + 8}px` }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Folder Icon & Name */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => onFolderSelect(folder.id)}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-sm truncate">{folder.name}</span>
            {folder.file_count !== undefined && (
              <span className="text-xs text-muted-foreground">({folder.file_count})</span>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateFolder && (
                <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Nowy podfolder
                </DropdownMenuItem>
              )}
              {onUploadFile && (
                <DropdownMenuItem onClick={() => onUploadFile(folder.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj plik
                </DropdownMenuItem>
              )}
              {onRenameFolder && (
                <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Zmień nazwę
                </DropdownMenuItem>
              )}
              {onDeleteFolder && (
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(folder.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map(child => renderFolder(child))}
          </div>
        )}
      </div>
    );
  };

  const renderFile = (file: StorageFile) => {
    const isSelected = selectedFileId === file.id;

    return (
      <div
        key={file.id}
        className={cn(
          'flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: '32px' }}
        onClick={() => onFileSelect(file.id)}
      >
        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate flex-1">{file.file_name}</span>
        <span className="text-xs text-muted-foreground">{file.file_extension}</span>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Repozytorium plików</h3>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateFolder()}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-2">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Folder className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Brak folderów</p>
            {onCreateFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateFolder()}
                className="mt-2"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Utwórz folder
              </Button>
            )}
          </div>
        ) : (
          <>
            {folders.map(folder => renderFolder(folder))}
            {selectedFolderId && files.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                {files.map(file => renderFile(file))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
