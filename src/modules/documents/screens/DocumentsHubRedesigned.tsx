/**
 * Documents Hub - Redesigned
 * 
 * Central navigation hub for all document sections
 * Provides overview of all document types with quick access to each section
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  FileText, ArrowRight, AlertCircle, Link as LinkIcon, 
  FolderTree, Scale, Building2, Upload, Plus
} from 'lucide-react';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SECTION_VIEWS, type DocumentSection } from '@/modules/documents/types/sections';
import { useDocumentStats } from '../hooks/useDocumentStats';
import { cn } from '@/shared/lib/utils';

const DocumentsHubRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useDocumentStats();
  
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Błąd ładowania danych</p>
                <p className="text-sm text-muted-foreground">Spróbuj odświeżyć stronę</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const hasAnyData = stats && (
    stats.attachments.total > 0 ||
    stats.files.total > 0 ||
    stats.decisions.total > 0 ||
    stats.contracts.total > 0
  );
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs />
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Centrum dokumentów</h1>
          <p className="text-muted-foreground">
            Zarządzaj plikami, załącznikami i rejestrami dokumentów w jednym miejscu
          </p>
        </div>
        
        {/* 3-Tier Structure */}
        <div className="space-y-6">
          {/* Row 1: Powiązane (Linked Evidence) */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Powiązane</h2>
            <p className="text-sm text-muted-foreground mb-4">Dowody pracy - pliki połączone z fakturami, decyzjami, operacjami</p>
            
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg border-l-4"
              style={{ borderLeftColor: '#3b82f6' }}
              onClick={() => navigate('/documents/attachments')}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950">
                      <LinkIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">Załączniki</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Wszystkie pliki powiązane z dokumentami biznesowymi
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-2xl font-bold">{stats?.attachments.total || 0}</p>
                          <p className="text-xs text-muted-foreground">Wszystkie załączniki</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-600">{stats?.attachments.unlinked || 0}</p>
                          <p className="text-xs text-muted-foreground">Bez powiązań</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{stats?.attachments.requiresAttention || 0}</p>
                          <p className="text-xs text-muted-foreground">Wymaga uwagi</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{stats?.attachments.linkedEntities || 0}</p>
                          <p className="text-xs text-muted-foreground">Powiązanych obiektów</p>
                        </div>
                      </div>
                      
                      {!hasAnyData && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Zacznij od przesłania plików</p>
                          <p className="text-xs text-muted-foreground">
                            Przejdź do Repozytorium → Utwórz folder → Dodaj plik
                          </p>
                        </div>
                      )}
                      
                      {stats && stats.attachments.unlinked > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <p className="text-sm font-medium text-amber-600">
                              {stats.attachments.unlinked} plików bez powiązań - przypisz do dokumentów
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Row 2: Rejestry (Typed Modules) */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Rejestry</h2>
            <p className="text-sm text-muted-foreground mb-4">Wyspecjalizowane moduły dokumentów</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Contracts */}
              <Card 
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => navigate('/documents/contracts')}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: SECTION_VIEWS.contracts.theme.accentColor + '20' }}>
                      <FileText className="h-6 w-6" style={{ color: SECTION_VIEWS.contracts.theme.iconColor }} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">{SECTION_VIEWS.contracts.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{SECTION_VIEWS.contracts.subtitle}</p>
                  <p className="text-2xl font-bold">{stats?.contracts.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Umów</p>
                </CardContent>
              </Card>
              
              {/* Decisions */}
              <Card 
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => navigate('/decisions')}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-950">
                      <Scale className="h-6 w-6 text-purple-600" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">Decyzje i uchwały</h3>
                  <p className="text-xs text-muted-foreground mb-3">Podstawa prawna działań spółki</p>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-2xl font-bold">{stats?.decisions.total || 0}</p>
                      <p className="text-xs text-muted-foreground">Decyzji</p>
                    </div>
                    {stats && stats.decisions.requiresAttention > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.decisions.requiresAttention} bez PDF
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Other sections */}
              {(['financial', 'operations', 'audit'] as DocumentSection[]).map(section => {
                const viewDef = SECTION_VIEWS[section];
                const Icon = viewDef.theme.icon;
                return (
                  <Card 
                    key={section}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => navigate(`/documents/${section}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: viewDef.theme.accentColor + '20' }}>
                          <Icon className="h-6 w-6" style={{ color: viewDef.theme.iconColor }} />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold mb-1">{viewDef.title}</h3>
                      <p className="text-xs text-muted-foreground">{viewDef.subtitle}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          
          {/* Row 3: Repozytorium (Storage) */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Repozytorium</h2>
            <p className="text-sm text-muted-foreground mb-4">Fizyczna struktura katalogów i plików</p>
            
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg border-l-4"
              style={{ borderLeftColor: '#f59e0b' }}
              onClick={() => navigate('/documents/repository')}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950">
                      <FolderTree className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">Foldery i pliki</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Przeglądaj strukturę katalogów, zarządzaj plikami
                      </p>
                      
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-2xl font-bold">{stats?.files.total || 0}</p>
                          <p className="text-xs text-muted-foreground">Wszystkie pliki</p>
                        </div>
                      </div>
                      
                      {stats?.files.total === 0 && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Brak plików w repozytorium</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/documents/repository'); }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Utwórz folder
                            </Button>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/documents/repository'); }}>
                              <Upload className="h-4 w-4 mr-2" />
                              Prześlij plik
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsHubRedesigned;
