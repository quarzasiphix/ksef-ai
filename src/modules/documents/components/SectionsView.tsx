import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { FileText, DollarSign, TrendingUp, Eye, Download } from 'lucide-react';
import { useAllDocuments, getAccountingVirtualFolders } from '../hooks/useAllDocuments';
import { formatFileSize } from '../types/storage';

interface SectionsViewProps {
  onFileOpen: (fileId: string) => void;
}

const SectionsView: React.FC<SectionsViewProps> = ({ onFileOpen }) => {
  const { data: allDocuments = [] } = useAllDocuments();
  const virtualFolders = getAccountingVirtualFolders();

  // Group documents by sections
  const documentsBySection = React.useMemo(() => {
    const sections: Record<string, any[]> = {
      'audytowe_dokumenty': [],
      'finansowe': [],
      'inne': []
    };

    allDocuments.forEach(doc => {
      if (doc.source === 'accounting' && doc.virtual_category) {
        const category = virtualFolders.find(f => f.id === `virtual-${doc.virtual_category}`);
        if (category) {
          category.sections.forEach((section: string) => {
            if (!sections[section]) sections[section] = [];
            sections[section].push(doc);
          });
        }
      }
    });

    return sections;
  }, [allDocuments, virtualFolders]);

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'audytowe_dokumenty':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'finansowe':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'audytowe_dokumenty':
        return 'Audytowe dokumenty';
      case 'finansowe':
        return 'Finansowe';
      default:
        return 'Inne';
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'capital':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'tax':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'financial':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryName = (categoryId: string) => {
    switch (categoryId) {
      case 'capital':
        return 'Kapitał';
      case 'tax':
        return 'Podatki';
      case 'financial':
        return 'Finanse';
      default:
        return 'Inne';
    }
  };

  const handleFileView = (file: any) => {
    // Use the file viewer system for all files
    onFileOpen(file.id);
  };

  const handleFileDownload = (file: any) => {
    // TODO: Implement secure download via edge function
    console.log('Download file:', file.id);
    // For now, trigger the file viewer which can handle downloads
    onFileOpen(file.id);
  };

  return (
    <div className="space-y-6">
      {Object.entries(documentsBySection).map(([section, documents]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getSectionIcon(section)}
              {getSectionTitle(section)}
              <Badge variant="secondary">{documents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak dokumentów w tej sekcji</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group by category within section */}
                {Array.from(
                  new Set(documents.map(doc => doc.virtual_category))
                ).map(category => {
                  const categoryDocs = documents.filter(doc => doc.virtual_category === category);
                  if (!category) return null;

                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getCategoryIcon(category)}
                        <h4 className="font-semibold">{getCategoryName(category)}</h4>
                        <Badge variant="outline">{categoryDocs.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {categoryDocs.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatFileSize(doc.file_size || 0)}</span>
                                  <span>•</span>
                                  <span>
                                    {doc.uploaded_at 
                                      ? new Date(doc.uploaded_at).toLocaleDateString('pl-PL')
                                      : '—'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleFileView(doc)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Podgląd
                              </button>
                              <button
                                onClick={() => handleFileDownload(doc)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Pobierz
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SectionsView;
