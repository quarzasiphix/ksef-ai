import React, { useState, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import { formatFileSize } from '../../types/storage';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string;
  folderName?: string;
  onUpload: (files: File[], metadata: FileMetadata[]) => Promise<void>;
}

interface FileMetadata {
  description?: string;
  tags: string[];
}

interface FileWithMetadata {
  file: File;
  metadata: FileMetadata;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  onUpload,
}) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const filesWithMetadata: FileWithMetadata[] = newFiles.map(file => ({
      file,
      metadata: {
        description: '',
        tags: [],
      },
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...filesWithMetadata]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileMetadata = (index: number, metadata: Partial<FileMetadata>) => {
    setFiles(prev =>
      prev.map((f, i) =>
        i === index
          ? { ...f, metadata: { ...f.metadata, ...metadata } }
          : f
      )
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const fileList = files.map(f => f.file);
      const metadataList = files.map(f => f.metadata);
      await onUpload(fileList, metadataList);
      
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dodaj pliki</DialogTitle>
          <DialogDescription>
            {folderName ? `Dodaj pliki do folderu: ${folderName}` : 'Dodaj pliki do repozytorium'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              files.length > 0 && 'py-4'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Przeciągnij i upuść pliki tutaj
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              lub
            </p>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span>Wybierz pliki</span>
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Wybrane pliki ({files.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={uploading}
                >
                  Wyczyść wszystko
                </Button>
              </div>

              {files.map((fileWithMeta, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <File className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileWithMeta.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileWithMeta.file.size)}
                      </p>
                    </div>
                    {fileWithMeta.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {fileWithMeta.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {fileWithMeta.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {fileWithMeta.status === 'pending' && (
                    <div className="space-y-2 pl-8">
                      <div>
                        <Label htmlFor={`description-${index}`} className="text-xs">
                          Opis (opcjonalnie)
                        </Label>
                        <Input
                          id={`description-${index}`}
                          placeholder="Dodaj opis pliku..."
                          value={fileWithMeta.metadata.description}
                          onChange={(e) =>
                            updateFileMetadata(index, { description: e.target.value })
                          }
                          disabled={uploading}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tags-${index}`} className="text-xs">
                          Tagi (oddzielone przecinkami)
                        </Label>
                        <Input
                          id={`tags-${index}`}
                          placeholder="np. krs, signed, 2024"
                          value={fileWithMeta.metadata.tags.join(', ')}
                          onChange={(e) =>
                            updateFileMetadata(index, {
                              tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                            })
                          }
                          disabled={uploading}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {fileWithMeta.error && (
                    <p className="text-xs text-destructive pl-8">{fileWithMeta.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Anuluj
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? 'Przesyłanie...' : `Prześlij (${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
