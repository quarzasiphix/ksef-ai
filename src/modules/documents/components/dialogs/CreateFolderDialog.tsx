import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useStorageFolders } from '../../hooks/useStorageFolders';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useDepartment } from '@/shared/context/DepartmentContext';
import { useDepartments } from '../../hooks/useDepartments';
import type { CreateStorageFolderInput } from '../../types/storage';
import { useToast } from '@/shared/ui/use-toast';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  parentFolderId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const { selectedDepartment } = useDepartment();
  const { departments } = useDepartments();
  const { createFolder, isCreating } = useStorageFolders();
  const { toast } = useToast();

  // Initialize with current department when dialog opens
  React.useEffect(() => {
    if (open) {
      if (selectedDepartment) {
        setSelectedDeptId(selectedDepartment.id);
      } else {
        setSelectedDeptId('__company_wide__');
      }
    }
  }, [open, selectedDepartment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!name.trim() || !currentProfile) return;

    const input: CreateStorageFolderInput = {
      business_profile_id: currentProfile.id,
      name: name.trim(),
      description: description.trim() || undefined,
      parent_folder_id: parentFolderId,
      department_id: selectedDeptId && selectedDeptId !== '__company_wide__' ? selectedDeptId : undefined,
    };

    createFolder(input, {
      onSuccess: () => {
        setName('');
        setDescription('');
        setSelectedDeptId('__company_wide__');
        toast({
          title: 'Folder utworzony',
          description: `Folder „${name.trim()}” jest już dostępny w repozytorium.`,
        });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Utwórz nowy folder</DialogTitle>
            <DialogDescription>
              Stwórz nowy folder w repozytorium dokumentów
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current department indicator */}
            {selectedDepartment && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Building2 className="h-4 w-4" style={{ color: selectedDepartment.color || '#6b7280' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Aktualny dział</p>
                  <p className="text-xs text-muted-foreground">{selectedDepartment.name}</p>
                </div>
                <Badge 
                  variant="secondary" 
                  style={{ 
                    backgroundColor: `${selectedDepartment.color}20`,
                    color: selectedDepartment.color 
                  }}
                >
                  Domyślny
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="folder-name">Nazwa folderu</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. KRS, Umowy, Faktury"
                autoFocus
                required
              />
            </div>

            {/* Department selector */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="department">Dział</Label>
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger id="department">
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
                  Folder będzie widoczny tylko w wybranym dziale
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="folder-description">Opis (opcjonalnie)</Label>
              <Textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodaj opis folderu..."
                rows={3}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-3">
              {errorMessage}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? 'Tworzenie...' : 'Utwórz folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
