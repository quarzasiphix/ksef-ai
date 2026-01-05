import React, { useState } from 'react';
import { Upload, FileText, Folder } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useDepartment } from '@/shared/context/DepartmentContext';
import { useCreateAttachment } from '@/shared/hooks/useAttachments';
import { useStorageFiles } from '@/modules/documents/hooks/useStorageFiles';
import { StorageService } from '@/shared/services/storageService';
import type { AttachmentRole, AttachmentEntityType, DecisionAttachmentRole } from '@/shared/types/attachment';
import { ATTACHMENT_ROLE_LABELS } from '@/shared/types/attachment';
import { formatFileSize } from '@/modules/documents/types/storage';
import { cn } from '@/shared/lib/utils';

interface AttachFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: AttachmentEntityType;
  entityId: string;
  allowedRoles?: AttachmentRole[];
  defaultRole?: AttachmentRole;
  folderId?: string;
}

export const AttachFileDialog: React.FC<AttachFileDialogProps> = ({
  open,
  onOpenChange,
  entityType,
  entityId,
  allowedRoles,
  defaultRole,
  folderId,
}) => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { selectedDepartment } = useDepartment();
  const createAttachment = useCreateAttachment();
  
  const [selectedTab, setSelectedTab] = useState<'repository' | 'upload'>('repository');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [role, setRole] = useState<AttachmentRole>(defaultRole || 'OTHER');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const { files } = useStorageFiles(folderId || undefined);

  const availableRoles = allowedRoles || Object.keys(ATTACHMENT_ROLE_LABELS) as AttachmentRole[];

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    setUploadedFile(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setSelectedFileId(null);
    }
  };

  const handleSubmit = async () => {
    if (!currentProfile) return;
    
    let fileId = selectedFileId;

    try {
      setIsSubmitting(true);

      // If uploading a new file, upload it first
      if (uploadedFile && !fileId) {
        if (!folderId) {
          throw new Error('Folder ID is required for file upload');
        }
        const uploadResult = await StorageService.uploadFile({
          storage_folder_id: folderId,
          business_profile_id: currentProfile.id,
          department_id: selectedDepartment?.id,
          file: uploadedFile,
        });
        fileId = uploadResult.id;
      }

      if (!fileId) {
        throw new Error('No file selected');
      }

      // Create attachment
      await createAttachment.mutateAsync({
        business_profile_id: currentProfile.id,
        department_id: selectedDepartment?.id,
        storage_file_id: fileId,
        entity_type: entityType,
        entity_id: entityId,
        role,
        note: note.trim() || undefined,
      });

      // Reset and close
      setSelectedFileId(null);
      setUploadedFile(null);
      setNote('');
      setRole(defaultRole || 'OTHER');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to attach file:', error);
      alert('Nie udało się dodać załącznika');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = (selectedFileId || uploadedFile) && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj załącznik</DialogTitle>
          <DialogDescription>
            Wybierz plik z repozytorium lub prześlij nowy plik
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repository">
              <Folder className="h-4 w-4 mr-2" />
              Repozytorium
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Prześlij
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repository" className="space-y-4">
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {files.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  Brak plików w tym folderze
                </div>
              ) : (
                <div className="divide-y">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleFileSelect(file.id)}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                        selectedFileId === file.id && 'bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">
                  Kliknij aby wybrać plik
                </p>
                <p className="text-xs text-muted-foreground">
                  lub przeciągnij i upuść plik tutaj
                </p>
              </label>
            </div>
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div>
            <Label htmlFor="role">Typ załącznika</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AttachmentRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ATTACHMENT_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note">Notatka (opcjonalnie)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodaj notatkę do załącznika..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Dodawanie...' : 'Dodaj załącznik'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
