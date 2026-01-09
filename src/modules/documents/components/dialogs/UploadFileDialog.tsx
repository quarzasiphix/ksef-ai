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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
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
      setSelectedFiles([]);
      setFileNames([]);
      setDescription('');
      setTags([]);
      setSuggestedTags([]);
      setUploadedFileIds([]);
      setCurrentFileIndex(0);
      setLinkAfterUpload(forceLink);
      setLinkEntityType(presetEntityType || '');
      setLinkEntityId(presetEntityId || '');
      setLinkRole(defaultRole || '');
      setLinkNote('');
    }
  }, [open, forceLink, presetEntityType, presetEntityId, defaultRole]);

  const handleFileSelect = (files: File[] | File) => {
    const filesArray = Array.isArray(files) ? files : [files];
    setSelectedFiles(filesArray);
    setFileNames(filesArray.map(f => f.name));
    setCurrentFileIndex(0);
    
    // Analyze first file and suggest tags
    if (filesArray.length > 0) {
      const analysis = analyzeFile(filesArray[0]);
      setSuggestedTags(analysis.suggestedTags);
    }
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
      handleFileSelect(files);
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
    
    if (selectedFiles.length === 0 || !currentProfile) return;

    // Upload all files
    const uploadPromises = selectedFiles.map(async (file, index) => {
      const input: UploadFileInput = {
        storage_folder_id: folderId,
        business_profile_id: currentProfile.id,
        department_id: selectedDeptId && selectedDeptId !== '__company_wide__' ? selectedDeptId : undefined,
        file,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      return new Promise<{ file: File; result?: any; error?: any }>((resolve) => {
        uploadFile(input, {
          onSuccess: (uploadedFile) => {
            resolve({ file, result: uploadedFile });
          },
          onError: (error) => {
            resolve({ file, error });
          },
        });
      });
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.result);
      const failed = results.filter(r => r.error);

      if (successful.length > 0) {
        setUploadedFileIds(successful.map(s => s.result.id));
        
        // If linking is enabled and we have entity info, create attachments for all successful uploads
        if (linkAfterUpload && linkEntityType && linkEntityId && linkRole) {
          successful.forEach(({ result }) => {
            console.log('Creating attachment:', {
              fileId: result.id,
              entityType: linkEntityType,
              entityId: linkEntityId,
              role: linkRole,
              note: linkNote,
            });
          });
        }
      }

      if (failed.length > 0) {
        console.error('Failed to upload files:', failed);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleOpenFile = () => {
    if (uploadedFileIds.length > 0) {
      // TODO: Navigate to file viewer or open in new tab
      console.log('Open files:', uploadedFileIds);
      onOpenChange(false);
    }
  };

  const handleAttachNow = () => {
    if (uploadedFileIds.length > 0) {
      // TODO: Open AttachFileDialog with these files
      console.log('Attach files:', uploadedFileIds);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (!isUploading && uploadedFileIds.length === 0) {
      onOpenChange(false);
    } else if (uploadedFileIds.length > 0) {
      // Files uploaded successfully, allow close
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
              {selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{selectedFiles.length} plik(ów) wybranych</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Wyczyść
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                        <File className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Przeciągnij pliki tutaj lub
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    Wybierz pliki
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) handleFileSelect(files);
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
            {uploadedFileIds.length > 0 ? (
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
                <Button type="submit" disabled={selectedFiles.length === 0 || isUploading}>
                  {isUploading ? 'Przesyłanie...' : `Dodaj ${selectedFiles.length > 1 ? `${selectedFiles.length} plików` : 'plik'}`}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
