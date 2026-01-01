/**
 * Documents Hub - Redesigned
 * 
 * Central navigation hub for all document sections
 * Provides overview of all document types with quick access to each section
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { 
  FileText, DollarSign, Truck, FileSearch, Award, 
  ArrowRight, TrendingUp, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SECTION_VIEWS, type DocumentSection } from '@/modules/documents/types/sections';
import { cn } from '@/shared/lib/utils';

interface SectionStats {
  total: number;
  active: number;
  pending: number;
  critical: number;
}

interface RecentDocument {
  id: string;
  title: string;
  section: DocumentSection;
  status: string;
  updated_at: string;
}

const DocumentsHubRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  
  const [loading, setLoading] = useState(true);
  const [sectionStats, setSectionStats] = useState<Record<DocumentSection, SectionStats>>({
    contracts: { total: 0, active: 0, pending: 0, critical: 0 },
    financial: { total: 0, active: 0, pending: 0, critical: 0 },
    operations: { total: 0, active: 0, pending: 0, critical: 0 },
    audit: { total: 0, active: 0, pending: 0, critical: 0 },
    decisions: { total: 0, active: 0, pending: 0, critical: 0 },
  });
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  
  useEffect(() => {
    loadOverviewData();
  }, [selectedProfileId]);
  
  const loadOverviewData = async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual data fetching
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSectionStats({
        contracts: { total: 45, active: 23, pending: 5, critical: 2 },
        financial: { total: 128, active: 98, pending: 12, critical: 8 },
        operations: { total: 67, active: 34, pending: 7, critical: 3 },
        audit: { total: 15, active: 8, pending: 3, critical: 1 },
        decisions: { total: 12, active: 10, pending: 2, critical: 0 },
      });
      
      setRecentDocuments([
        {
          id: '1',
          title: 'Umowa ramowa z ABC Transport',
          section: 'contracts',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Rozliczenie zlecenia TR/12/2024',
          section: 'financial',
          status: 'pending',
          updated_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          title: 'Protokół przekazania - Zlecenie 456',
          section: 'operations',
          status: 'completed',
          updated_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToSection = (section: DocumentSection) => {
    navigate(`/documents/${section}`);
  };
  
  const navigateToDocument = (doc: RecentDocument) => {
    navigate(`/documents/${doc.section}/${doc.id}`);
  };
  
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Ładowanie...</p>
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
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Centrum dokumentów</h1>
                <p className="text-muted-foreground">
                  Zarządzaj wszystkimi dokumentami w jednym miejscu. Wybierz sekcję, aby zobaczyć szczegóły.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/documents/contracts')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Wszystkie dokumenty
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(SECTION_VIEWS) as DocumentSection[]).map(section => {
            const viewDef = SECTION_VIEWS[section];
            const stats = sectionStats[section];
            const Icon = viewDef.theme.icon;
            const hasCritical = stats.critical > 0;
            const hasPending = stats.pending > 0;
            
            return (
              <Card 
                key={section}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                  hasCritical && "border-red-200 dark:border-red-900"
                )}
                onClick={() => navigateToSection(section)}
                style={{ 
                  borderLeftWidth: '4px',
                  borderLeftColor: viewDef.theme.accentColor 
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: viewDef.theme.accentColor + '20' }}
                    >
                      <Icon 
                        className="h-6 w-6" 
                        style={{ color: viewDef.theme.iconColor }}
                      />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg mt-3">{viewDef.title}</CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {viewDef.subtitle}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Wszystkie</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                      <p className="text-xs text-muted-foreground">Aktywne</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                      <p className="text-xs text-muted-foreground">Oczekujące</p>
                    </div>
                  </div>
                  
                  {/* Alerts */}
                  {hasCritical && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-600 font-medium">
                        {stats.critical} wymaga uwagi
                      </span>
                    </div>
                  )}
                  
                  {!hasCritical && hasPending && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950 rounded-md">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-amber-600 font-medium">
                        {stats.pending} do przejrzenia
                      </span>
                    </div>
                  )}
                  
                  {!hasCritical && !hasPending && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">
                        Wszystko aktualne
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToSection(section);
                    }}
                  >
                    Otwórz {viewDef.title.toLowerCase()}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Ostatnio edytowane
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/documents/contracts')}>
                Zobacz wszystkie
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak ostatnich dokumentów
              </p>
            ) : (
              <div className="space-y-2">
                {recentDocuments.map(doc => {
                  const viewDef = SECTION_VIEWS[doc.section];
                  const Icon = viewDef.theme.icon;
                  
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigateToDocument(doc)}
                    >
                      <div 
                        className="p-2 rounded-md flex-shrink-0"
                        style={{ backgroundColor: viewDef.theme.accentColor + '20' }}
                      >
                        <Icon 
                          className="h-4 w-4" 
                          style={{ color: viewDef.theme.iconColor }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: viewDef.theme.accentColor,
                              color: viewDef.theme.accentColor 
                            }}
                          >
                            {viewDef.title}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.updated_at).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(sectionStats).reduce((sum, s) => sum + s.total, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Wszystkie dokumenty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {Object.values(sectionStats).reduce((sum, s) => sum + s.pending, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Oczekujące</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {Object.values(sectionStats).reduce((sum, s) => sum + s.critical, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Wymaga uwagi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentsHubRedesigned;
