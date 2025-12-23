import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { 
  ArrowLeft, Upload, Download, Trash2, FileText, FolderOpen, 
  Car, Building, Briefcase, FileCheck, AlertCircle, Calendar,
  CheckCircle, XCircle, AlertTriangle, Sparkles, Paperclip, Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  getDocumentsByCategory,
  uploadCompanyDocument,
  deleteCompanyDocument,
  getDocumentDownloadUrl,
  getExpiringDocuments,
  type CompanyDocument,
  type DocumentCategory,
  DOCUMENT_CATEGORY_LABELS,
} from '@/modules/contracts/data/documentsRepository';

const CATEGORY_ICONS: Record<DocumentCategory, React.ReactNode> = {
  contracts_vehicles: <Car className="h-5 w-5" />,
  contracts_infrastructure: <Building className="h-5 w-5" />,
  contracts_services: <Briefcase className="h-5 w-5" />,
  contracts_other: <FileText className="h-5 w-5" />,
  resolutions: <FileCheck className="h-5 w-5" />,
  licenses: <FileCheck className="h-5 w-5" />,
  financial_statements: <FileText className="h-5 w-5" />,
  tax_filings: <FileText className="h-5 w-5" />,
  other: <FolderOpen className="h-5 w-5" />,
};

const Documents = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Record<DocumentCategory, CompanyDocument[]>>({
    contracts_vehicles: [],
    contracts_infrastructure: [],
    contracts_services: [],
    contracts_other: [],
    resolutions: [],
    licenses: [],
    financial_statements: [],
    tax_filings: [],
    other: [],
  });
  const [expiringDocs, setExpiringDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    category: 'other' as DocumentCategory,
    title: '',
    description: '',
    document_date: '',
    expiry_date: '',
    reference_number: '',
  });

  const loadData = useCallback(async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      const [docsData, expiringData] = await Promise.all([
        getDocumentsByCategory(selectedProfileId),
        getExpiringDocuments(selectedProfileId, 30),
      ]);
      setDocuments(docsData);
      setExpiringDocs(expiringData);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Błąd wczytywania dokumentów');
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProfile && selectedProfile.entityType !== 'sp_zoo' && selectedProfile.entityType !== 'sa') {
      navigate('/accounting');
    }
  }, [selectedProfile, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setUploadDialogOpen(true);
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
          document_date: uploadData.document_date || undefined,
          expiry_date: uploadData.expiry_date || undefined,
          reference_number: uploadData.reference_number || undefined,
        }
      );
      
      toast.success('Dokument przesłany');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadData({
        category: 'other',
        title: '',
        description: '',
        document_date: '',
        expiry_date: '',
        reference_number: '',
      });
      loadData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Błąd przesyłania dokumentu');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: CompanyDocument) => {
    try {
      const url = await getDocumentDownloadUrl(doc.file_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Błąd pobierania dokumentu');
    }
  };

  const handleDelete = async (doc: CompanyDocument) => {
    if (!confirm(`Czy na pewno chcesz usunąć dokument "${doc.title}"?`)) return;
    
    try {
      await deleteCompanyDocument(doc.id);
      toast.success('Dokument usunięty');
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Błąd usuwania dokumentu');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalDocuments = Object.values(documents).reduce((sum, docs) => sum + docs.length, 0);

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const categories = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];

  // Calculate folder status
  const getFolderStatus = (category: DocumentCategory): 'complete' | 'missing' | 'required' => {
    const docs = documents[category];
    if (docs.length === 0) {
      // Mark certain categories as required
      if (['resolutions', 'licenses'].includes(category)) return 'required';
      return 'missing';
    }
    return 'complete';
  };

  const getStatusBadge = (status: 'complete' | 'missing' | 'required') => {
    switch (status) {
      case 'complete':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Kompletne</Badge>;
      case 'missing':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Brak dokumentów</Badge>;
      case 'required':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Wymagane prawnie</Badge>;
    }
  };

  // Find next required document
  const missingRequiredCategories = categories.filter(cat => getFolderStatus(cat) === 'required');
  const nextRequiredCategory = missingRequiredCategories[0];

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              Dokumenty Spółki
          </h1>
          <p className="text-muted-foreground">
            Repozytorium umów, licencji i dokumentów firmowych
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Prześlij dokument
          </Button>
        </div>
      </div>

      {/* Next Required Document Banner */}
      {nextRequiredCategory && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Brakuje wymaganego dokumentu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {DOCUMENT_CATEGORY_LABELS[nextRequiredCategory]}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Ta kategoria jest wymagana prawnie dla spółek
                </p>
              </div>
              <Button
                onClick={() => {
                  setUploadData(prev => ({ ...prev, category: nextRequiredCategory }));
                  fileInputRef.current?.click();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Dodaj dokument
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Dokumenty wygasające w ciągu 30 dni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    <Calendar className="h-3 w-3 mr-1" />
                    {doc.expiry_date && format(new Date(doc.expiry_date), 'dd.MM.yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{totalDocuments}</p>
              <p className="text-sm text-muted-foreground">Wszystkie dokumenty</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {documents.contracts_vehicles.length + documents.contracts_infrastructure.length + 
                 documents.contracts_services.length + documents.contracts_other.length}
              </p>
              <p className="text-sm text-muted-foreground">Umowy</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{documents.licenses.length}</p>
              <p className="text-sm text-muted-foreground">Licencje</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{expiringDocs.length}</p>
              <p className="text-sm text-muted-foreground">Wygasające</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <Tabs defaultValue="contracts_vehicles" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs px-2 py-1.5">
              {CATEGORY_ICONS[cat]}
              <span className="ml-1 hidden md:inline">{DOCUMENT_CATEGORY_LABELS[cat]}</span>
              {documents[cat].length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {documents[cat].length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {CATEGORY_ICONS[cat]}
                      {DOCUMENT_CATEGORY_LABELS[cat]}
                    </CardTitle>
                    <CardDescription>
                      {documents[cat].length} dokumentów
                    </CardDescription>
                  </div>
                  {getStatusBadge(getFolderStatus(cat))}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
                ) : documents[cat].length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak dokumentów w tej kategorii</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setUploadData(prev => ({ ...prev, category: cat }));
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Dodaj pierwszy dokument
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Document Type Legend */}
                    <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-muted-foreground">Przesłane dokumenty</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-muted-foreground">Wygenerowane przez system</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-muted-foreground">Powiązane z decyzjami</span>
                      </div>
                    </div>
                    
                    {documents[cat].map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                            <Paperclip className="h-4 w-4 text-blue-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{doc.file_name}</span>
                              {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                              {doc.document_date && (
                                <span>• {format(new Date(doc.document_date), 'dd.MM.yyyy')}</span>
                              )}
                            </div>
                            {doc.reference_number && (
                              <p className="text-xs text-muted-foreground">Nr: {doc.reference_number}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {doc.expiry_date && (
                            <Badge 
                              variant={new Date(doc.expiry_date) < new Date() ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              Ważny do: {format(new Date(doc.expiry_date), 'dd.MM.yyyy')}
                            </Badge>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prześlij dokument</DialogTitle>
            <DialogDescription>
              {selectedFile?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category">Kategoria</Label>
              <Select
                value={uploadData.category}
                onValueChange={(value) => setUploadData({ ...uploadData, category: value as DocumentCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {DOCUMENT_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="title">Tytuł dokumentu *</Label>
              <Input
                id="title"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="np. Umowa najmu biura"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Opis</Label>
              <Input
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Dodatkowe informacje..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document_date">Data dokumentu</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={uploadData.document_date}
                  onChange={(e) => setUploadData({ ...uploadData, document_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Data wygaśnięcia</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={uploadData.expiry_date}
                  onChange={(e) => setUploadData({ ...uploadData, expiry_date: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="reference_number">Numer referencyjny</Label>
              <Input
                id="reference_number"
                value={uploadData.reference_number}
                onChange={(e) => setUploadData({ ...uploadData, reference_number: e.target.value })}
                placeholder="np. UMO/2024/001"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Anuluj
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Przesyłanie...' : 'Prześlij'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
