/**
 * Section Documents Page
 * 
 * Unified page component that adapts based on section (contracts, financial, operations, audit)
 * Uses ViewDefinition to provide section-specific:
 * - Theme and visual identity
 * - KPI metrics
 * - Table columns
 * - Quick filters
 * - Allowed blueprints
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { toast } from 'sonner';
import { 
  getViewDefinition, 
  getSectionFromRoute, 
  isValidSection,
  type DocumentSection,
  type ViewDefinition,
  type MetricCard 
} from '@/modules/documents/types/sections';
import { ContractNewModal } from '@/modules/contracts/components/ContractNewModal';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const SectionDocumentsPage: React.FC = () => {
  const { section: sectionParam } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  
  // Validate section
  const section: DocumentSection = useMemo(() => {
    if (!sectionParam || !isValidSection(sectionParam)) {
      navigate('/documents/contracts');
      return 'contracts';
    }
    return sectionParam;
  }, [sectionParam, navigate]);
  
  const viewDef: ViewDefinition = useMemo(() => getViewDefinition(section), [section]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  
  // Load documents and metrics
  useEffect(() => {
    loadData();
  }, [section, selectedProfileId]);
  
  const loadData = async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual data fetching based on section
      // For now, mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setDocuments([]);
      setMetrics({});
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Błąd ładowania dokumentów');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };
  
  const handleNewDocument = () => {
    setModalOpen(true);
  };
  
  const Icon = viewDef.theme.icon;
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-3">
        {/* Breadcrumbs */}
        <div className="px-2 pt-1">
          <Breadcrumbs />
        </div>
        
        {/* Header Card */}
        <Card style={{ borderColor: viewDef.theme.accentColor + '20', backgroundColor: viewDef.theme.accentColorLight }}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: viewDef.theme.accentColor + '20' }}
                >
                  <Icon 
                    className="h-6 w-6" 
                    style={{ color: viewDef.theme.iconColor }}
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold">{viewDef.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{viewDef.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-2">{viewDef.description}</p>
                </div>
              </div>
              
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:shrink-0">
                {viewDef.secondaryActions?.map(action => (
                  <Button 
                    key={action.action}
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => toast.info(`${action.label} - wkrótce`)}
                  >
                    {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                ))}
                <Button 
                  className="w-full sm:w-auto"
                  style={{ backgroundColor: viewDef.theme.accentColor }}
                  onClick={handleNewDocument}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {viewDef.primaryCTA.label}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {viewDef.metrics.map(metric => {
            const MetricIcon = metric.icon;
            const value = metrics[metric.queryKey] || 0;
            const isWarning = metric.threshold && value >= metric.threshold.warning && value < metric.threshold.critical;
            const isCritical = metric.threshold && value >= metric.threshold.critical;
            
            return (
              <Card key={metric.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {metric.format === 'amount' ? `${value.toLocaleString('pl-PL')} zł` : value}
                      </p>
                      {metric.description && (
                        <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                      )}
                    </div>
                    {MetricIcon && (
                      <div 
                        className="p-2 rounded-lg"
                        style={{ 
                          backgroundColor: (isCritical ? '#ef4444' : isWarning ? '#f59e0b' : metric.color || viewDef.theme.accentColor) + '20' 
                        }}
                      >
                        <MetricIcon 
                          className="h-5 w-5" 
                          style={{ 
                            color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : metric.color || viewDef.theme.iconColor 
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Szukaj w ${viewDef.title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Filters */}
            {viewDef.quickFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewDef.quickFilters.map(filter => {
                  const FilterIcon = filter.icon;
                  const isActive = activeFilters.includes(filter.id);
                  
                  return (
                    <Button
                      key={filter.id}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFilter(filter.id)}
                      style={isActive ? { backgroundColor: viewDef.theme.accentColor } : undefined}
                    >
                      {FilterIcon && <FilterIcon className="h-3 w-3 mr-1" />}
                      {filter.label}
                      {filter.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {metrics[filter.field] || 0}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Documents List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{viewDef.emptyState.title}</h3>
              <p className="text-muted-foreground mb-4">{viewDef.emptyState.description}</p>
              <Button 
                onClick={handleNewDocument}
                style={{ backgroundColor: viewDef.theme.accentColor }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {viewDef.primaryCTA.label}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" style={{ color: viewDef.theme.iconColor }} />
                {viewDef.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Implement table with section-specific columns */}
              <div className="space-y-2">
                <p className="text-muted-foreground">Tabela dokumentów - wkrótce</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Section-Contextual Modal */}
      <ContractNewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        section={section}
        businessProfileId={selectedProfileId || undefined}
        onSuccess={() => {
          loadData();
          toast.success('Dokument został utworzony');
        }}
      />
    </div>
  );
};

export default SectionDocumentsPage;
