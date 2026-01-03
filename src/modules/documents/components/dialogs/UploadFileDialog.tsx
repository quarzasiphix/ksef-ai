import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import { Upload, X, File, Building2, Folder, ChevronRight, ExternalLink, Link as LinkIcon, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useStorageFiles } from '../../hooks/useStorageFiles';
import { useStorageFolder } from '../../hooks/useStorageFolder';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useDepartment } from '@/shared/context/DepartmentContext';
import { useDepartments } from '../../hooks/useDepartments';
import { analyzeFile } from '../../utils/fileDetection';
import type { UploadFileInput } from '../../types/storage';
import type { AttachmentEntityType, AttachmentRole } from '@/shared/types/attachment';
import { ENTITY_TYPE_LABELS, ATTACHMENT_ROLE_LABELS } from '@/shared/types/attachment';
import { EntitySearchPicker, type LinkableEntity } from '@/shared/components/EntitySearchPicker';
import { ContextBar } from '@/shared/components/ContextBar';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  // Optional: pre-link to entity (e.g., from decision detail view)
  entityType?: AttachmentEntityType;
  entityId?: string;
  defaultRole?: AttachmentRole;
  forceLink?: boolean; // Force attachment linking (audit-critical flows)
}

export const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  open,
  onOpenChange,
  folderId,
  entityType: presetEntityType,
  entityId: presetEntityId,
  defaultRole,
  forceLink = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  
  // Attachment linking state
  const [linkAfterUpload, setLinkAfterUpload] = useState(forceLink);
  const [linkEntityType, setLinkEntityType] = useState<AttachmentEntityType | ''>(presetEntityType || '');
  const [linkEntityId, setLinkEntityId] = useState(presetEntityId || '');
  const [linkRole, setLinkRole] = useState<AttachmentRole | ''>(defaultRole || '');
  const [linkNote, setLinkNote] = useState('');
  
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const { selectedDepartment } = useDepartment();
  const { departments } = useDepartments();
  const { uploadFile, isUploading } = useStorageFiles(folderId);
  const { data: folder } = useStorageFolder(folderId);

  // Initialize with folder's department when dialog opens (auto-lock)
  useEffect(() => {
    if (open && folder) {
      if (folder.department_id) {
        setSelectedDeptId(folder.department_id);
      } else if (selectedDepartment) {
        setSelectedDeptId(selectedDepartment.id);
      } else {
        setSelectedDeptId('__company_wide__');
      }
    }
  }, [open, folder, selectedDepartment]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setFileName('');
      setDescription('');
      setTags([]);
      setSuggestedTags([]);
      setUploadedFileId(null);
      setLinkAfterUpload(forceLink);
      setLinkEntityType(presetEntityType || '');
      setLinkEntityId(presetEntityId || '');
      setLinkRole(defaultRole || '');
      setLinkNote('');
    }
  }, [open, forceLink, presetEntityType, presetEntityId, defaultRole]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
    
    // Analyze file and suggest tags
    const analysis = analyzeFile(file);
    setSuggestedTags(analysis.suggestedTags);
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !currentProfile) return;

    const input: UploadFileInput = {
      storage_folder_id: folderId,
      business_profile_id: currentProfile.id,
      department_id: selectedDeptId && selectedDeptId !== '__company_wide__' ? selectedDeptId : undefined,
      file: selectedFile,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    uploadFile(input, {
      onSuccess: (uploadedFile) => {
        setUploadedFileId(uploadedFile.id);
        
        // If linking is enabled and we have entity info, create attachment
        if (linkAfterUpload && linkEntityType && linkEntityId && linkRole) {
          // TODO: Call attachment creation API
          console.log('Creating attachment:', {
            fileId: uploadedFile.id,
            entityType: linkEntityType,
            entityId: linkEntityId,
            role: linkRole,
            note: linkNote,
          });
        }
      },
    });
  };

  const handleOpenFile = () => {
    if (uploadedFileId) {
      // TODO: Navigate to file viewer or open in new tab
      console.log('Open file:', uploadedFileId);
      onOpenChange(false);
    }
  };

  const handleAttachNow = () => {
    if (uploadedFileId) {
      // TODO: Open AttachFileDialog with this file
      console.log('Attach file:', uploadedFileId);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (!isUploading && !uploadedFileId) {
      onOpenChange(false);
    } else if (uploadedFileId) {
      // File uploaded successfully, allow close
      onOpenChange(false);
    }
  };

  // Get department name for folder
  const folderDepartment = folder?.department_id 
    ? departments.find(d => d.id === folder.department_id)
    : null;

  // Build folder breadcrumb
  const folderBreadcrumb = folder ? folder.path.split('/').filter(Boolean).join(' / ') : '';

  // Available entity types for linking
  const entityTypes: AttachmentEntityType[] = [
    'invoice',
    'ledger_event',
    'contract',
    'operation',
    'decision',
    'capital_transaction',
    'case',
  ];

  // Contextual roles based on entity type
  const getRolesForEntityType = (entityType: AttachmentEntityType): AttachmentRole[] => {
    switch (entityType) {
      case 'invoice':
        return ['COST_ESTIMATE', 'PRIMARY', 'SUPPORTING', 'SCAN'];
      case 'decision':
        return ['DECISION_DRAFT_PDF', 'DECISION_SIGNED_PDF', 'DECISION_SUPPORTING_DOC'];
      case 'capital_transaction':
        return ['SHAREHOLDER_DECLARATION', 'TRANSFER_CONFIRMATION', 'NOTARY_DEED', 'SUPPORTING'];
      case 'operation':
        return ['DELIVERY_PROOF', 'PHOTO', 'ROUTE_SHEET', 'CUSTOMER_CORRESPONDENCE'];
      case 'contract':
        return ['CONTRACT_DRAFT', 'CONTRACT_SIGNED', 'CONTRACT_AMENDMENT', 'CONTRACT_ANNEX'];
      default:
        return ['PRIMARY', 'SUPPORTING', 'SCAN', 'CORRESPONDENCE', 'OTHER'];
    }
  };

  const availableRoles = linkEntityType ? getRolesForEntityType(linkEntityType as AttachmentEntityType) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b bg-background sticky top-0 z-10">
            <DialogTitle className="text-base sm:text-lg">Dodaj plik</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {/* Folder context breadcrumb */}
            {folder && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Docelowy folder</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {folderDepartment && (
                      <>
                        <span style={{ color: folderDepartment.color }}>{folderDepartment.name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <span>{folderBreadcrumb || folder.name}</span>
                  </div>
                </div>
                {folderDepartment && (
                  <Badge 
                    variant="outline"
                    style={{ 
                      backgroundColor: `${folderDepartment.color}15`,
                      borderColor: folderDepartment.color,
                      color: folderDepartment.color 
                    }}
                  >
                    {folderDepartment.name}
                  </Badge>
                )}
              </div>
            )}

            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Przeciągnij plik tutaj lub
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    Wybierz plik
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </>
              )}
            </div>

            {/* Department selector */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="file-department">Dział</Label>
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId} disabled={isUploading}>
                  <SelectTrigger id="file-department">
                    <SelectValue placeholder="Wybierz dział lub pozostaw ogólne" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__company_wide__">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span>Ogólne (cała firma)</span>
                      </div>
                    </SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: dept.color || '#6b7280' }}
                          />
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Plik będzie widoczny tylko w wybranym dziale
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="file-description">Opis (opcjonalnie)</Label>
              <Textarea
                id="file-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodaj opis pliku..."
                rows={3}
                disabled={isUploading}
              />
            </div>

            {/* Tags with suggestions */}
            <div className="space-y-2">
              <Label>Tagi (opcjonalnie)</Label>
              
              {/* Selected tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Suggested tags */}
              {suggestedTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sugerowane tagi:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.filter(tag => !tags.includes(tag)).map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleAddTag(tag)}
                      >
                        + {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Input
                placeholder="Dodaj własny tag..."
                disabled={isUploading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      handleAddTag(value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            {/* Optional attachment linking */}
            {!forceLink && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="link-toggle" className="cursor-pointer">
                      Powiąż po dodaniu (opcjonalnie)
                    </Label>
                  </div>
                  <Switch
                    id="link-toggle"
                    checked={linkAfterUpload}
                    onCheckedChange={setLinkAfterUpload}
                    disabled={isUploading}
                  />
                </div>
                
                {linkAfterUpload && (
                  <div className="space-y-3 pt-2">
                    {/* Entity type selector */}
                    <div className="space-y-2">
                      <Label>Typ obiektu</Label>
                      <Select 
                        value={linkEntityType} 
                        onValueChange={(value) => {
                          setLinkEntityType(value as AttachmentEntityType);
                          setLinkRole(''); // Reset role when entity type changes
                        }}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ obiektu" />
                        </SelectTrigger>
                        <SelectContent>
                          {entityTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {ENTITY_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Entity search picker */}
                    {linkEntityType && currentProfile && (
                      <div className="space-y-2">
                        <Label>Obiekt biznesowy</Label>
                        <EntitySearchPicker
                          businessProfileId={currentProfile.id}
                          departmentId={folderDepartment?.id}
                          entityTypes={[linkEntityType as any]}
                          value={linkEntityId}
                          onSelect={(entity) => {
                            if (entity) {
                              setLinkEntityId(entity.entity_id);
                            } else {
                              setLinkEntityId('');
                            }
                          }}
                          placeholder={`Szukaj ${ENTITY_TYPE_LABELS[linkEntityType as AttachmentEntityType].toLowerCase()}...`}
                          disabled={isUploading}
                        />
                      </div>
                    )}

                    {/* Role selector */}
                    {linkEntityType && availableRoles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Rola załącznika</Label>
                        <Select 
                          value={linkRole} 
                          onValueChange={(value) => setLinkRole(value as AttachmentRole)}
                          disabled={isUploading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz rolę" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role} value={role}>
                                {ATTACHMENT_ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Note */}
                    <div className="space-y-2">
                      <Label>Notatka (opcjonalnie)</Label>
                      <Input
                        value={linkNote}
                        onChange={(e) => setLinkNote(e.target.value)}
                        placeholder="Dodatkowe informacje..."
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Force link warning */}
            {forceLink && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Wymagane powiązanie</p>
                  <p className="text-amber-700 text-xs mt-1">
                    Ten plik musi być powiązany z obiektem biznesowym (wymóg audytu).
                  </p>
                </div>
              </div>
            )}

            {/* Department visibility notice */}
            {folderDepartment && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                Widoczność: tylko użytkownicy działu <strong>{folderDepartment.name}</strong> (i uprawnieni w firmie)
              </div>
            )}
          </div>

          <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-background sticky bottom-0">
            {uploadedFileId ? (
              // Post-upload actions
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Zamknij
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenFile}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Otwórz plik
                </Button>
                {!linkAfterUpload && (
                  <Button
                    type="button"
                    onClick={handleAttachNow}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Przypisz teraz
                  </Button>
                )}
              </>
            ) : (
              // Upload form actions
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={!selectedFile || isUploading}>
                  {isUploading ? 'Przesyłanie...' : 'Dodaj plik'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
