/**
 * Document Detail Page
 * 
 * Canonical detail page for documents with section-aware routing
 * Route: /documents/:section/:id
 * 
 * Automatically redirects if document's primary_section doesn't match route section
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ArrowLeft, Edit, Trash2, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getViewDefinition, 
  getDocumentRoute,
  isValidSection,
  type DocumentSection 
} from '@/modules/documents/types/sections';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

interface DocumentData {
  id: string;
  title: string;
  primary_section: DocumentSection;
  status: string;
  created_at: string;
  updated_at: string;
  // ... other fields
}

const DocumentDetailPage: React.FC = () => {
  const { section: sectionParam, id } = useParams<{ section: string; id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<DocumentData | null>(null);
  
  // Validate section
  const section = sectionParam && isValidSection(sectionParam) ? sectionParam : null;
  
  useEffect(() => {
    if (!section || !id) {
      navigate('/documents/contracts');
      return;
    }
    
    loadDocument();
  }, [section, id]);
  
  const loadDocument = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual document fetching
      // const doc = await getDocument(id);
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockDoc: DocumentData = {
        id: id,
        title: 'Example Document',
        primary_section: section as DocumentSection,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Check if document's primary_section matches route section
      if (mockDoc.primary_section !== section) {
        // Redirect to correct section route
        const correctRoute = getDocumentRoute(mockDoc.id, mockDoc.primary_section);
        toast.info('Przekierowanie do właściwej sekcji');
        navigate(correctRoute, { replace: true });
        return;
      }
      
      setDocument(mockDoc);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Błąd ładowania dokumentu');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };
  
  if (!section) {
    return null;
  }
  
  const viewDef = getViewDefinition(section);
  const Icon = viewDef.theme.icon;
  
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Dokument nie znaleziony</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(viewDef.route)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do listy
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-3">
        {/* Breadcrumbs */}
        <div className="px-2 pt-1">
          <Breadcrumbs />
        </div>
        
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(viewDef.route)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: viewDef.theme.accentColor + '20' }}
                >
                  <Icon 
                    className="h-6 w-6" 
                    style={{ color: viewDef.theme.iconColor }}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold">{document.title}</h1>
                    <Badge 
                      variant={viewDef.theme.badgeVariant}
                      style={{ 
                        backgroundColor: viewDef.theme.accentColor + '20',
                        color: viewDef.theme.accentColor 
                      }}
                    >
                      {document.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {viewDef.title} • ID: {document.id}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Document Content */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły dokumentu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sekcja</label>
                <p className="text-sm mt-1">{viewDef.title}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-sm mt-1">{document.status}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Utworzono</label>
                <p className="text-sm mt-1">
                  {new Date(document.created_at).toLocaleString('pl-PL')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ostatnia modyfikacja</label>
                <p className="text-sm mt-1">
                  {new Date(document.updated_at).toLocaleString('pl-PL')}
                </p>
              </div>
              
              {/* TODO: Add section-specific fields based on viewDef.tableColumns */}
            </div>
          </CardContent>
        </Card>
        
        {/* Related Documents / Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Historia aktywności</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Brak aktywności</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
