import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { flushSync } from 'react-dom';
import { 
  FileText, FolderOpen, Plus, Upload, Search, Filter,
  FileCheck, Mail, Receipt, BarChart, Award, Briefcase,
  ArrowUpCircle, ArrowDownCircle, Info, Download, Trash2,
  Eye, Edit, FileDown, MoreVertical, FolderPlus, Pencil, X, Check, Menu
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  getDocumentFolders,
  getFolderTree,
  getCompanyDocuments,
  getDocumentsByFolder,
  getGeneratedDocuments,
  getDocumentTemplates,
  initializeDefaultFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  type DocumentFolder,
  type FolderTreeNode,
  type CompanyDocument,
  type GeneratedDocument,
  type DocumentTemplate,
} from '@/integrations/supabase/repositories/documentsRepository';
import { getContracts } from '@/integrations/supabase/repositories/contractRepository';
import type { Contract } from '@/types';

type DocumentView = 'all' | 'transactional_payout' | 'transactional_payin' | 'informational' | 'generated' | 'uploaded';

const DocumentsHub = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<DocumentView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Folder management states
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingNavigationTo, setPendingNavigationTo] = useState<string | null>(null);

  const safeNavigate = useCallback((to: string) => {
    const hadOverlaysOpen = mobileSidebarOpen || createFolderDialogOpen || deleteFolderDialogOpen;

    // Always close overlays first (Sheet / Dialog) before route transition.
    flushSync(() => {
      setMobileSidebarOpen(false);
      setCreateFolderDialogOpen(false);
      setDeleteFolderDialogOpen(false);
    });

    if (!hadOverlaysOpen) {
      navigate(to);
      return;
    }

    // If an overlay was open, defer navigation until after close animations.
    setPendingNavigationTo(to);
  }, [createFolderDialogOpen, deleteFolderDialogOpen, mobileSidebarOpen, navigate]);

  useEffect(() => {
    if (!pendingNavigationTo) return;

    const to = pendingNavigationTo;
    setPendingNavigationTo(null);

    const t = window.setTimeout(() => {
      navigate(to);
    }, 900);

    return () => window.clearTimeout(t);
  }, [navigate, pendingNavigationTo]);

  // Data states
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<CompanyDocument[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  const loadData = useCallback(async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      const [
        foldersData,
        contractsData,
        uploadedData,
        generatedData,
        templatesData,
      ] = await Promise.all([
        getFolderTree(selectedProfileId).catch(() => []),
        getContracts(selectedProfileId).catch(() => []),
        getCompanyDocuments(selectedProfileId).catch(() => []),
        getGeneratedDocuments(selectedProfileId).catch(() => []),
        getDocumentTemplates(selectedProfileId).catch(() => []),
      ]);

      setFolderTree(foldersData);
      setContracts(contractsData);
      setUploadedDocs(uploadedData);
      setGeneratedDocs(generatedData);
      setTemplates(templatesData);

      // Initialize default folders if none exist
      if (foldersData.length === 0 && selectedProfile?.entityType === 'sp_zoo') {
        await initializeDefaultFolders(selectedProfileId);
        const newFolders = await getFolderTree(selectedProfileId);
        setFolderTree(newFolders);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Błąd wczytywania dokumentów');
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, selectedProfile?.entityType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateFolder = async () => {
    if (!selectedProfileId || !newFolderName.trim()) return;
    
    try {
      await createFolder({
        business_profile_id: selectedProfileId,
        name: newFolderName.trim(),
        parent_folder_id: newFolderParentId,
      });
      toast.success('Folder utworzony');
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      setNewFolderParentId(null);
      loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Błąd tworzenia folderu');
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    try {
      await deleteFolder(folderToDelete);
      toast.success('Folder usunięty');
      setDeleteFolderDialogOpen(false);
      setFolderToDelete(null);
      if (selectedFolder === folderToDelete) {
        setSelectedFolder(null);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Błąd usuwania folderu');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      await updateFolder(folderId, { name: newName.trim() });
      toast.success('Folder zmieniony');
      loadData();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Błąd zmiany nazwy');
    }
  };

  // Filter contracts by category
  const transactionalPayoutContracts = contracts.filter(c => c.document_category === 'transactional_payout');
  const transactionalPayinContracts = contracts.filter(c => c.document_category === 'transactional_payin');
  const informationalContracts = contracts.filter(c => c.document_category === 'informational' || !c.document_category);

  // Search filter
  const filterBySearch = (items: any[], searchFields: string[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      searchFields.some(field => 
        item[field]?.toString().toLowerCase().includes(query)
      )
    );
  };

  const getDocumentCount = () => {
    switch (view) {
      case 'transactional_payout':
        return transactionalPayoutContracts.length;
      case 'transactional_payin':
        return transactionalPayinContracts.length;
      case 'informational':
        return informationalContracts.length;
      case 'generated':
        return generatedDocs.length;
      case 'uploaded':
        return uploadedDocs.length;
      default:
        return contracts.length + generatedDocs.length + uploadedDocs.length;
    }
  };

  if (!selectedProfile) {
    return (
      <div className="p-0">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const isSpoolka = selectedProfile.entityType === 'sp_zoo' || selectedProfile.entityType === 'sa';

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="h-full bg-muted/30 p-2 overflow-y-auto">
      <div className="mb-2">
        <h2 className="font-semibold text-base mb-2">Dokumenty</h2>
        <Button
          onClick={() => {
            onNavigate?.();
            // Defer route change until after the mobile Sheet close animation
            safeNavigate('/contracts/new');
          }}
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nowy dokument
        </Button>
      </div>

      <div className="space-y-1 mb-2">
        <Button
          variant={view === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setView('all');
            onNavigate?.();
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          Wszystkie
          <Badge variant="outline" className="ml-auto">
            {contracts.length + generatedDocs.length + uploadedDocs.length}
          </Badge>
        </Button>

        {isSpoolka && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-muted-foreground px-2">TRANSAKCYJNE</p>
            </div>
            <Button
              variant={view === 'transactional_payout' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setView('transactional_payout');
                onNavigate?.();
              }}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2 text-red-600" />
              Wydatki
              <Badge variant="outline" className="ml-auto">
                {transactionalPayoutContracts.length}
              </Badge>
            </Button>
            <Button
              variant={view === 'transactional_payin' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setView('transactional_payin');
                onNavigate?.();
              }}
            >
              <ArrowDownCircle className="h-4 w-4 mr-2 text-green-600" />
              Przychody
              <Badge variant="outline" className="ml-auto">
                {transactionalPayinContracts.length}
              </Badge>
            </Button>
          </>
        )}

        <div className="pt-2 pb-1">
          <p className="text-xs font-semibold text-muted-foreground px-2">INFORMACYJNE</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.();
            safeNavigate('/contracts/resolutions');
          }}
        >
          <FileCheck className="h-4 w-4 mr-2" />
          Uchwały
        </Button>
        {isSpoolka && (
          <Button
            variant={view === 'informational' ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setView('informational');
              onNavigate?.();
            }}
          >
            <Info className="h-4 w-4 mr-2" />
            Dokumenty spółki
            <Badge variant="outline" className="ml-auto">
              {informationalContracts.length}
            </Badge>
          </Button>
        )}

        <div className="pt-2 pb-1">
          <p className="text-xs font-semibold text-muted-foreground px-2">TYP DOKUMENTU</p>
        </div>
        <Button
          variant={view === 'generated' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setView('generated');
            onNavigate?.();
          }}
        >
          <FileCheck className="h-4 w-4 mr-2" />
          Wygenerowane
          <Badge variant="outline" className="ml-auto">
            {generatedDocs.length}
          </Badge>
        </Button>
        <Button
          variant={view === 'uploaded' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setView('uploaded');
            onNavigate?.();
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Przesłane
          <Badge variant="outline" className="ml-auto">
            {uploadedDocs.length}
          </Badge>
        </Button>
      </div>

      {isSpoolka && (
        <>
          <div className="pt-2 pb-1 flex items-center justify-between px-2">
            <p className="text-xs font-semibold text-muted-foreground">FOLDERY</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setCreateFolderDialogOpen(true);
                onNavigate?.();
              }}
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
          </div>
          {folderTree.length > 0 ? (
            <div className="space-y-1">
              {folderTree.map(folder => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  selectedId={selectedFolder}
                  onSelect={(id) => {
                    setSelectedFolder(id);
                    onNavigate?.();
                  }}
                  onRename={handleRenameFolder}
                  onDelete={(id) => {
                    setFolderToDelete(id);
                    setDeleteFolderDialogOpen(true);
                    onNavigate?.();
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-2 py-2">Brak folderów</p>
          )}
        </>
      )}

      {isSpoolka && templates.length > 0 && (
        <>
          <div className="pt-3 pb-1">
            <p className="text-xs font-semibold text-muted-foreground px-2">SZABLONY</p>
          </div>
          <div className="space-y-1">
            {templates.slice(0, 5).map(template => (
              <Button
                key={template.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  toast.info('Generator dokumentów - wkrótce');
                  onNavigate?.();
                }}
              >
                <FileText className="h-3 w-3 mr-2" />
                {template.name}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="hidden md:block w-64 border-r">
          <SidebarContent />
        </div>

        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Dokumenty</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy folder</DialogTitle>
            <DialogDescription>
              Utwórz nowy folder do organizacji dokumentów
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nazwa folderu</Label>
              <Input
                id="folder-name"
                placeholder="np. Umowy z dostawcami"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Utwórz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno usunąć folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Dokumenty w folderze nie zostaną usunięte, ale stracą przypisanie do folderu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-red-600 hover:bg-red-700">
              Usuń folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu dokumentów</span>
                  </Button>
                </SheetTrigger>
              </div>
              <div>
                <h1 className="text-xl font-bold">
                {view === 'all' && 'Wszystkie dokumenty'}
                {view === 'transactional_payout' && 'Umowy - Wydatki'}
                {view === 'transactional_payin' && 'Umowy - Przychody'}
                {view === 'informational' && 'Dokumenty informacyjne'}
                {view === 'generated' && 'Wygenerowane dokumenty'}
                {view === 'uploaded' && 'Przesłane pliki'}
              </h1>
              <p className="text-muted-foreground">
                {getDocumentCount()} dokumentów
              </p>
            </div>
            </div>
            <div className="flex gap-2">
              {(view === 'transactional_payin' || view === 'transactional_payout') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const focus = view === 'transactional_payin' ? 'payin' : 'payout';
                    safeNavigate(`/accounting/contracts?focus=${focus}`);
                  }}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Analizy w księgowości
                </Button>
              )}
              <Button variant="outline" onClick={() => toast.info('Przesyłanie plików - wkrótce')}>
                <Upload className="h-4 w-4 mr-2" />
                Prześlij PDF
              </Button>
              <Button onClick={() => toast.info('Generator dokumentów - wkrótce')}>
                <Plus className="h-4 w-4 mr-2" />
                Generuj dokument
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Uchwały
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Uchwały to kluczowe dokumenty korporacyjne (np. zatwierdzenie sprawozdania, podział zysku, powołania).
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    safeNavigate('/contracts/resolutions');
                  }}
                >
                  Otwórz
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj dokumentów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Document list */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Ładowanie...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Transactional Payout Contracts */}
              {(view === 'all' || view === 'transactional_payout') && transactionalPayoutContracts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      Umowy - Wydatki
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(transactionalPayoutContracts, ['number', 'subject', 'content']).map(contract => (
                        <ContractItem key={contract.id} contract={contract} onNavigate={safeNavigate} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transactional Payin Contracts */}
              {(view === 'all' || view === 'transactional_payin') && transactionalPayinContracts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownCircle className="h-5 w-5 text-green-600" />
                      Umowy - Przychody
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(transactionalPayinContracts, ['number', 'subject', 'content']).map(contract => (
                        <ContractItem key={contract.id} contract={contract} onNavigate={safeNavigate} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informational Contracts */}
              {(view === 'all' || view === 'informational') && informationalContracts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Dokumenty informacyjne
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(informationalContracts, ['number', 'subject', 'content']).map(contract => (
                        <ContractItem key={contract.id} contract={contract} onNavigate={safeNavigate} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Documents */}
              {(view === 'all' || view === 'generated') && generatedDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Wygenerowane dokumenty
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(generatedDocs, ['title', 'document_type']).map(doc => (
                        <GeneratedDocItem key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Uploaded Documents */}
              {(view === 'all' || view === 'uploaded') && uploadedDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Przesłane pliki
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(uploadedDocs, ['title', 'file_name', 'description']).map(doc => (
                        <UploadedDocItem key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {getDocumentCount() === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">Brak dokumentów w tej kategorii</p>
                  <Button onClick={() => safeNavigate('/contracts/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj pierwszy dokument
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </Sheet>
  );
};

// Folder tree item component
const FolderTreeItem: React.FC<{
  folder: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (folderId: string, newName: string) => Promise<void>;
  onDelete: (folderId: string) => void;
  level?: number;
}> = ({ folder, selectedId, onSelect, onRename, onDelete, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const handleRename = async () => {
    if (editName.trim() && editName !== folder.name) {
      await onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1 group">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1" style={{ paddingLeft: `${level * 12 + 8}px` }}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(folder.name);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm"
              autoFocus
              onBlur={handleRename}
            />
          </div>
        ) : (
          <>
            <Button
              variant={selectedId === folder.id ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 justify-start"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => {
                onSelect(folder.id);
                setIsOpen(!isOpen);
              }}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {folder.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3 w-3 mr-2" />
                  Zmień nazwę
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(folder.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Usuń folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {isOpen && folder.children?.map(child => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          selectedId={selectedId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          level={level + 1}
        />
      ))}
    </div>
  );
};

// Contract item component
const ContractItem: React.FC<{ contract: Contract; onNavigate: (to: string) => void }> = ({ contract, onNavigate }) => {

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{contract.subject || contract.number}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{contract.number}</span>
            {contract.issueDate && <span>• {contract.issueDate}</span>}
            {contract.document_category && (
              <Badge variant="outline" className="text-xs">
                {contract.document_category === 'transactional_payout' && 'Wydatek'}
                {contract.document_category === 'transactional_payin' && 'Przychód'}
                {contract.document_category === 'informational' && 'Informacyjny'}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => onNavigate(`/contracts/${contract.id}`)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onNavigate(`/contracts/${contract.id}/edit`)}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Generated document item component
const GeneratedDocItem: React.FC<{ doc: GeneratedDocument }> = ({ doc }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileCheck className="h-8 w-8 text-blue-600 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{doc.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {doc.document_number && <span>{doc.document_number}</span>}
            {doc.document_date && <span>• {doc.document_date}</span>}
            <Badge variant="outline" className="text-xs">{doc.status}</Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => toast.info('Podgląd - wkrótce')}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast.info('Eksport PDF - wkrótce')}>
          <FileDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Uploaded document item component
const UploadedDocItem: React.FC<{ doc: CompanyDocument }> = ({ doc }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Upload className="h-8 w-8 text-purple-600 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{doc.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{doc.file_name}</span>
            {doc.document_date && <span>• {doc.document_date}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => toast.info('Pobierz - wkrótce')}>
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast.info('Usuń - wkrótce')}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

export default DocumentsHub;
