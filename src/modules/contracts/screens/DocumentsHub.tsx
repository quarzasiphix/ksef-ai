import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { flushSync } from 'react-dom';
import { 
  FileText, FolderOpen, Plus, Upload, Search, Filter,
  FileCheck, Mail, Receipt, BarChart, Award, Briefcase,
  ArrowUpCircle, ArrowDownCircle, Info, Download, Trash2,
  Eye, Edit, FileDown, MoreVertical, FolderPlus, Pencil, X, Check, Menu, Building2
} from 'lucide-react';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { useDepartmentDocumentFolders } from '@/modules/documents/hooks/useDepartmentDocuments';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
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
  uploadCompanyDocument,
  getDocumentDownloadUrl,
  type DocumentFolder,
  type FolderTreeNode,
  type CompanyDocument,
  type GeneratedDocument,
  type DocumentTemplate,
  type DocumentCategory,
} from '@/modules/contracts/data/documentsRepository';
import { cn } from '@/shared/lib/utils';
import { FOLDER_TYPE_LABELS, type FolderType } from '@/modules/contracts/documents';
import { getContractsByBusinessProfile } from '@/modules/contracts/data/contractRepository';
import type { Contract } from '@/shared/types';
import { getDecisions } from '@/modules/spolka/data/decisionsRepository';
import type { Decision } from '@/modules/decisions/decisions';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import NextActionPanel from '@/modules/accounting/components/NextActionPanel';

type DocumentView = 'all' | 'transactional_payout' | 'transactional_payin' | 'informational' | 'generated' | 'uploaded' | 'decisions';

const DocumentsHub = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  // Get department template folders
  const templateFolders = useDepartmentDocumentFolders(selectedDepartment?.template);
  const departmentTemplate = selectedDepartment ? getDepartmentTemplate(selectedDepartment.template) : null;

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<DocumentView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Folder management states
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderType, setNewFolderType] = useState<FolderType>('custom');
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingNavigationTo, setPendingNavigationTo] = useState<string | null>(null);
  
  // Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'other' as DocumentCategory,
  });

  const safeNavigate = useCallback((to: string) => {
    const hadOverlaysOpen = mobileSidebarOpen || createFolderDialogOpen || deleteFolderDialogOpen || uploadDialogOpen;

    // Always close overlays first (Sheet / Dialog) before route transition.
    flushSync(() => {
      setMobileSidebarOpen(false);
      setCreateFolderDialogOpen(false);
      setDeleteFolderDialogOpen(false);
      setUploadDialogOpen(false);
    });

    if (!hadOverlaysOpen) {
      navigate(to);
      return;
    }

    // If an overlay was open, defer navigation until after close animations.
    setPendingNavigationTo(to);
  }, [createFolderDialogOpen, deleteFolderDialogOpen, mobileSidebarOpen, uploadDialogOpen, navigate]);

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
  const [decisions, setDecisions] = useState<Decision[]>([]);

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
        decisionsData,
      ] = await Promise.all([
        getFolderTree(selectedProfileId).catch(() => []),
        getContractsByBusinessProfile(selectedProfileId).catch(() => []),
        getCompanyDocuments(selectedProfileId).catch(() => []),
        getGeneratedDocuments(selectedProfileId).catch(() => []),
        getDocumentTemplates(selectedProfileId).catch(() => []),
        getDecisions(selectedProfileId, 'active').catch(() => []),
      ]);

      setFolderTree(foldersData);
      setContracts(contractsData);
      setUploadedDocs(uploadedData);
      setGeneratedDocs(generatedData);
      setTemplates(templatesData);
      setDecisions(decisionsData);

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
        parent_folder_id: newFolderParentId,
        name: newFolderName.trim(),
        folder_type: newFolderType,
      });
      
      toast.success('Folder utworzony');
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      setNewFolderParentId(null);
      setNewFolderType('custom');
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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
    setUploadDialogOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedProfileId || !selectedFile) return;
    
    if (!uploadData.title) {
      toast.error('Podaj tytuł dokumentu');
      return;
    }
    
    setUploading(true);
    try {
      await uploadCompanyDocument(
        selectedProfileId,
        uploadData.category,
        selectedFile,
        {
          title: uploadData.title,
          description: uploadData.description || undefined,
          folder_id: selectedFolder || undefined,
        }
      );
      
      toast.success('Dokument przesłany');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadData({
        title: '',
        description: '',
        category: 'other',
      });
      loadData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Błąd przesyłania dokumentu');
    } finally {
      setUploading(false);
    }
  };

  const getCurrentFolderName = () => {
    if (!selectedFolder) return null;
    const findFolder = (folders: FolderTreeNode[]): FolderTreeNode | null => {
      for (const folder of folders) {
        if (folder.id === selectedFolder) return folder;
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(folderTree);
  };

  const currentFolder = getCurrentFolderName();

  const getFolderPurpose = (folderType?: FolderType | null) => {
    switch (folderType) {
      case 'tax_documents':
        return 'Zbieraj tutaj deklaracje, potwierdzenia, korespondencję i inne dokumenty podatkowe. Ułatwia to szybkie odnalezienie plików podczas kontroli i rozliczeń.';
      case 'board_documents':
        return 'Dokumenty Zarządu: protokoły, decyzje, notatki, pełnomocnictwa i inne pliki związane z prowadzeniem spółki.';
      case 'correspondence':
        return 'Korespondencja urzędowa i firmowa: pisma, odpowiedzi, wezwania, potwierdzenia nadania/odbioru.';
      case 'financial_reports':
        return 'Sprawozdania finansowe i raporty: bilans, RZiS, zestawienia, pliki do audytu i dokumenty roczne.';
      case 'licenses':
        return 'Licencje, pozwolenia i certyfikaty: dokumenty, które mają ważność i często wymagają odnowienia.';
      case 'contracts':
        return 'Umowy i dokumenty powiązane: porządkuj je tematycznie, aby łatwo śledzić zobowiązania i terminy.';
      case 'resolutions':
        return 'Uchwały: trzymaj tutaj uchwały Zarządu/Wspólników oraz dokumenty wspierające (załączniki, projekty, podpisy).';
      case 'custom':
      default:
        return 'Folder do organizacji dokumentów według Twojej struktury. Możesz tu trzymać dowolne pliki powiązane z tematem folderu.';
    }
  };

  // Filter contracts by category
  const scopedContracts = selectedFolder ? contracts.filter(c => c.folder_id === selectedFolder) : contracts;
  const scopedGeneratedDocs = selectedFolder ? generatedDocs.filter(d => d.folder_id === selectedFolder) : generatedDocs;
  const scopedUploadedDocs = selectedFolder ? uploadedDocs.filter(d => d.folder_id === selectedFolder) : uploadedDocs;

  const scopedTotalCount = scopedContracts.length + scopedGeneratedDocs.length + scopedUploadedDocs.length;

  const mixedItems = [
    ...scopedContracts.map(c => ({
      kind: 'contract' as const,
      ts: new Date(c.created_at || c.issueDate || 0).getTime(),
      contract: c,
    })),
    ...scopedGeneratedDocs.map(d => ({
      kind: 'generated' as const,
      ts: new Date(d.created_at || 0).getTime(),
      doc: d,
    })),
    ...scopedUploadedDocs.map(d => ({
      kind: 'uploaded' as const,
      ts: new Date((d as any).created_at || 0).getTime(),
      doc: d,
    })),
  ].sort((a, b) => b.ts - a.ts);

  const transactionalPayoutContracts = scopedContracts.filter(c => c.document_category === 'transactional_payout');
  const transactionalPayinContracts = scopedContracts.filter(c => c.document_category === 'transactional_payin');
  const informationalContracts = scopedContracts.filter(c => c.document_category === 'informational' || !c.document_category);

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
        return scopedGeneratedDocs.length;
      case 'uploaded':
        return scopedUploadedDocs.length;
      default:
        return scopedContracts.length + scopedGeneratedDocs.length + scopedUploadedDocs.length;
    }
  };

  // Generate smart next actions for documents
  const getDocumentNextActions = () => {
    const actions = [];

    // Check for missing critical documents (spółka only)
    if (isSpoolka && contracts.length === 0) {
      actions.push({
        id: 'first-contract',
        title: 'Dodaj pierwszą umowę',
        description: 'Każda transakcja powinna mieć umowę. Zacznij od umowy z kluczowym kontrahentem.',
        href: '/contracts/new',
        variant: 'info' as const,
        dismissible: true,
      });
    }

    // Check for missing decisions link (spółka only)
    if (isSpoolka && decisions.length === 0) {
      actions.push({
        id: 'add-decision',
        title: 'Brak decyzji autoryzujących',
        description: 'Umowy wymagają decyzji zarządu lub wspólników. Utwórz pierwszą decyzję.',
        href: '/decisions',
        variant: 'warning' as const,
        dismissible: true,
      });
    }

    // Suggest organizing if many unorganized docs
    if (uploadedDocs.length > 5 && folderTree.length === 0) {
      actions.push({
        id: 'create-folders',
        title: 'Uporządkuj dokumenty w foldery',
        description: `Masz ${uploadedDocs.length} dokumentów. Utwórz foldery dla lepszej organizacji.`,
        action: () => setCreateFolderDialogOpen(true),
        variant: 'info' as const,
        dismissible: true,
      });
    }

    // Suggest uploading if no uploaded docs
    if (uploadedDocs.length === 0 && contracts.length > 0) {
      actions.push({
        id: 'upload-first',
        title: 'Prześlij skany lub pliki PDF',
        description: 'Przechowuj oryginały dokumentów w systemie dla łatwego dostępu.',
        action: () => setUploadDialogOpen(true),
        variant: 'info' as const,
        dismissible: true,
      });
    }

    return actions;
  };

  const documentNextActions = getDocumentNextActions();

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const SidebarNavButton = ({ active, onClick, children }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        'text-foreground/85 hover:bg-muted/40',
        active && 'bg-muted/60 text-foreground font-medium'
      )}
    >
      {children}
    </button>
  );

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="h-full module-sidebar p-3 overflow-y-auto">
      {/* Department Context Header */}
      {selectedDepartment && departmentTemplate && (
        <div className="mb-3 p-2 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedDepartment.color || '#3b82f6' }}
            />
            <span className="text-xs font-semibold truncate">{selectedDepartment.name}</span>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">
            {departmentTemplate.name}
          </Badge>
        </div>
      )}

      <div className="mb-2">
        <h2 className="font-semibold text-sm mb-2">Dokumenty</h2>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            safeNavigate('/contracts/new');
          }}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-muted/60 hover:bg-muted/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">Nowy dokument</span>
        </button>
      </div>

      <div className="space-y-1 mb-2">
        <SidebarNavButton
          active={view === 'all'}
          onClick={() => {
            setView('all');
            onNavigate?.();
          }}
        >
          <FileText className="h-4 w-4" />
          <span className="flex-1 text-left">Wszystkie</span>
          <span className="text-xs text-muted-foreground">
            {contracts.length + generatedDocs.length + uploadedDocs.length}
          </span>
        </SidebarNavButton>

        {isSpoolka && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground px-2">TRANSAKCYJNE</p>
            </div>
            <SidebarNavButton
              active={view === 'transactional_payout'}
              onClick={() => {
                setView('transactional_payout');
                onNavigate?.();
              }}
            >
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">Wydatki</span>
              <span className="text-xs text-muted-foreground">{transactionalPayoutContracts.length}</span>
            </SidebarNavButton>
            <SidebarNavButton
              active={view === 'transactional_payin'}
              onClick={() => {
                setView('transactional_payin');
                onNavigate?.();
              }}
            >
              <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">Przychody</span>
              <span className="text-xs text-muted-foreground">{transactionalPayinContracts.length}</span>
            </SidebarNavButton>
          </>
        )}

        <div className="pt-2 pb-1">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground px-2">INFORMACYJNE</p>
        </div>
        {isSpoolka && (
          <SidebarNavButton
            active={view === 'decisions'}
            onClick={() => {
              setView('decisions');
              onNavigate?.();
            }}
          >
            <Award className="h-4 w-4" />
            <span className="flex-1 text-left">Decyzje</span>
            <span className="text-xs text-muted-foreground">{decisions.length}</span>
          </SidebarNavButton>
        )}
        <SidebarNavButton
          onClick={() => {
            onNavigate?.();
            safeNavigate('/contracts/resolutions');
          }}
        >
          <FileCheck className="h-4 w-4" />
          <span className="flex-1 text-left">Uchwały</span>
        </SidebarNavButton>
        {isSpoolka && (
          <SidebarNavButton
            active={view === 'informational'}
            onClick={() => {
              setView('informational');
              onNavigate?.();
            }}
          >
            <Info className="h-4 w-4" />
            <span className="flex-1 text-left">Dokumenty spółki</span>
            <span className="text-xs text-muted-foreground">{informationalContracts.length}</span>
          </SidebarNavButton>
        )}

        <div className="pt-2 pb-1">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground px-2">TYP DOKUMENTU</p>
        </div>
        <SidebarNavButton
          active={view === 'generated'}
          onClick={() => {
            setView('generated');
            onNavigate?.();
          }}
        >
          <FileCheck className="h-4 w-4" />
          <span className="flex-1 text-left">Wygenerowane</span>
          <span className="text-xs text-muted-foreground">{generatedDocs.length}</span>
        </SidebarNavButton>
        <SidebarNavButton
          active={view === 'uploaded'}
          onClick={() => {
            setView('uploaded');
            onNavigate?.();
          }}
        >
          <Upload className="h-4 w-4" />
          <span className="flex-1 text-left">Przesłane</span>
          <span className="text-xs text-muted-foreground">{uploadedDocs.length}</span>
        </SidebarNavButton>
      </div>

      {/* Department Template Folders */}
      {selectedDepartment && templateFolders.length > 0 ? (
        <>
          <div className="pt-2 pb-1">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground px-2">
              FOLDERY DZIAŁU
            </p>
          </div>
          <div className="space-y-1">
            {templateFolders.map(folder => (
              <SidebarNavButton
                key={folder.id}
                active={selectedFolder === folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id);
                  onNavigate?.();
                }}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="flex-1 text-left truncate">{folder.label}</span>
                {folder.required && (
                  <span className="text-[10px] text-red-600">*</span>
                )}
              </SidebarNavButton>
            ))}
          </div>
        </>
      ) : isSpoolka && (
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
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className="hidden md:flex md:flex-col w-64 border-r border-module-sidebar-border h-full overflow-hidden">
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
            <div className="space-y-2">
              <Label htmlFor="folder-type">Kategoria folderu</Label>
              <Select value={newFolderType} onValueChange={(value) => setNewFolderType(value as FolderType)}>
                <SelectTrigger id="folder-type">
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FOLDER_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kategoria pomaga w organizacji i filtrowaniu dokumentów
              </p>
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Prześlij dokument</DialogTitle>
            <DialogDescription>
              {currentFolder ? `Dokument zostanie dodany do folderu: ${currentFolder.name}` : 'Prześlij plik PDF lub inny dokument'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedFile ? (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Przeciągnij plik tutaj</p>
                <p className="text-xs text-muted-foreground">lub kliknij, aby wybrać plik</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-title">Tytuł dokumentu *</Label>
                  <Input
                    id="upload-title"
                    className="w-full"
                    value={uploadData.title}
                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="np. Umowa najmu biura"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-description">Opis (opcjonalnie)</Label>
                  <Textarea
                    id="upload-description"
                    className="w-full"
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Dodatkowe informacje o dokumencie"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFile(null);
            }}>
              Anuluj
            </Button>
            {selectedFile && (
              <Button onClick={handleUpload} disabled={uploading || !uploadData.title}>
                {uploading ? 'Przesyłanie...' : 'Prześlij'}
              </Button>
            )}
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

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-12 text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-semibold mb-2">Upuść plik tutaj</p>
            <p className="text-muted-foreground">
              {currentFolder ? `Zostanie dodany do: ${currentFolder.name}` : 'Prześlij dokument'}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div className="p-2 space-y-3">
          <div className="px-2 pt-1">
            <Breadcrumbs />
          </div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="md:hidden pt-0.5">
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Menu dokumentów</span>
                      </Button>
                    </SheetTrigger>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold truncate">
                        {currentFolder ? currentFolder.name : 'Dokumenty'}
                      </h1>
                      {currentFolder?.folder_type && currentFolder.folder_type !== 'custom' && (
                        <Badge variant="secondary" className="text-xs">
                          {FOLDER_TYPE_LABELS[currentFolder.folder_type]}
                        </Badge>
                      )}
                      {currentFolder && (
                        <Badge variant="outline" className="text-xs">
                          {currentFolder.path || currentFolder.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentFolder ? getFolderPurpose(currentFolder.folder_type) : 'Wybierz folder po lewej, aby pracować w kontekście konkretnego tematu. Tutaj widzisz podział dokumentów na kategorie i szybkie akcje.'}
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {scopedTotalCount} dokumentów
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:shrink-0">
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Prześlij plik
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => safeNavigate('/contracts/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nowy dokument
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={currentFolder ? `Szukaj w folderze: ${currentFolder.name}` : 'Szukaj dokumentów...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Department Context Banner */}
          {selectedDepartment && departmentTemplate && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedDepartment.color || '#3b82f6' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">Widok działu: {selectedDepartment.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {departmentTemplate.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dokumenty organizowane według szablonu: {departmentTemplate.subtitle}
                    </p>
                    {templateFolders.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {templateFolders.length} folderów szablonu ({templateFolders.filter(f => f.required).length} wymaganych)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Action Panel - contextual guidance */}
          {!loading && documentNextActions.length > 0 && (
            <NextActionPanel actions={documentNextActions} />
          )}

          {/* Document list */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Ładowanie...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mixed list (All) */}
              {view === 'all' && mixedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Wszystko (chronologicznie)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mixedItems.map((item) => {
                        if (item.kind === 'contract') {
                          return (
                            <ContractItem
                              key={`c_${item.contract.id}`}
                              contract={item.contract}
                              onNavigate={safeNavigate}
                            />
                          );
                        }

                        if (item.kind === 'generated') {
                          return <GeneratedDocItem key={`g_${item.doc.id}`} doc={item.doc} />;
                        }

                        return <UploadedDocItem key={`u_${item.doc.id}`} doc={item.doc} />;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transactional Payout Contracts */}
              {view === 'transactional_payout' && transactionalPayoutContracts.length > 0 && (
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
              {view === 'transactional_payin' && transactionalPayinContracts.length > 0 && (
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
              {view === 'informational' && informationalContracts.length > 0 && (
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

              {/* Decisions */}
              {view === 'decisions' && decisions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Decyzje (mandaty)
                      </CardTitle>
                      <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => safeNavigate('/decisions')}>
                        Przejdź do decyzji
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(decisions as any, ['title', 'decision_number', 'category']).map((d: Decision) => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {d.decision_number && (
                                <Badge variant="secondary" className="text-xs">
                                  {d.decision_number}
                                </Badge>
                              )}
                              <p className="font-medium truncate">{d.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {d.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => safeNavigate(`/decisions/${d.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Documents */}
              {view === 'generated' && scopedGeneratedDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Wygenerowane dokumenty
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(scopedGeneratedDocs, ['title', 'document_type']).map(doc => (
                        <GeneratedDocItem key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Uploaded Documents */}
              {view === 'uploaded' && scopedUploadedDocs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Przesłane pliki
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filterBySearch(scopedUploadedDocs, ['title', 'file_name', 'description']).map(doc => (
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
                  <p className="text-muted-foreground mb-4">
                    {currentFolder ? 'Brak dokumentów w tym folderze' : 'Brak dokumentów'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Prześlij plik
                    </Button>
                    <Button onClick={() => safeNavigate('/contracts/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Dodaj pierwszy dokument
                    </Button>
                  </div>
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
              <FolderOpen className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{folder.name}</span>
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
            {contract.decision_reference && (
              <Badge variant="secondary" className="text-xs">
                {contract.decision_reference}
              </Badge>
            )}
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
