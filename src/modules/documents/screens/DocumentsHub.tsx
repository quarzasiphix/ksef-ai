/**
 * Documents Hub - DMS with context switching
 * 
 * Philosophy: Document ≠ File
 * - Documents are records with metadata + lifecycle
 * - Folders are saved filter presets (not directories)
 * - Context switching: Department → Job → Client → Vehicle → Driver
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  FileText, Plus, Search, AlertCircle, Clock, CheckCircle2,
  Building2, Briefcase, User, Truck, Users, Filter
} from 'lucide-react';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getDocuments, getDocumentStats } from '../data/documentsRepository';
import { getFolderPresetsForDepartment } from '../types';
import type { DocumentContext, DocumentFilter, FolderPreset } from '../types';
import { ContextAwareDocumentDialog } from '../components/ContextAwareDocumentDialog';
import type { DocumentCreationContext, DocumentSection } from '../types/blueprints';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

const DocumentsHub: React.FC = () => {
  const { selectedProject: selectedDepartment } = useProjectScope();
  const departmentTemplate = selectedDepartment ? getDepartmentTemplate(selectedDepartment.template) : null;

  // Context state
  const [context, setContext] = useState<DocumentContext>({
    type: 'department',
    department_id: selectedDepartment?.id || '',
  });

  // UI state
  const [selectedFolderPreset, setSelectedFolderPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDocumentDialogOpen, setNewDocumentDialogOpen] = useState(false);
  
  const { selectedProfileId } = useBusinessProfile();

  // Get folder presets for department
  const folderPresets = departmentTemplate
    ? getFolderPresetsForDepartment(departmentTemplate.id)
    : [];

  // Get current filter from selected preset
  const currentFilter: DocumentFilter | undefined = selectedFolderPreset
    ? folderPresets.find(f => f.id === selectedFolderPreset)?.filter
    : undefined;

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedDepartment?.id, currentFilter, searchQuery],
    queryFn: async () => {
      if (!selectedDepartment?.id) return [];
      const filter: DocumentFilter = {
        ...currentFilter,
        search: searchQuery || undefined,
      };
      return getDocuments(selectedDepartment.id, filter);
    },
    enabled: !!selectedDepartment?.id,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['document-stats', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment?.id) return null;
      return getDocumentStats(selectedDepartment.id);
    },
    enabled: !!selectedDepartment?.id,
  });

  const renderContextSelector = () => (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm text-muted-foreground">Viewing documents for:</span>
      <Tabs value={context.type} onValueChange={(value) => {
        setContext({ type: value as any, department_id: selectedDepartment?.id || '' });
      }}>
        <TabsList>
          <TabsTrigger value="department">
            <Building2 className="h-4 w-4 mr-2" />
            Department
          </TabsTrigger>
          <TabsTrigger value="job">
            <Briefcase className="h-4 w-4 mr-2" />
            Job
          </TabsTrigger>
          <TabsTrigger value="client">
            <User className="h-4 w-4 mr-2" />
            Client
          </TabsTrigger>
          <TabsTrigger value="vehicle">
            <Truck className="h-4 w-4 mr-2" />
            Vehicle
          </TabsTrigger>
          <TabsTrigger value="driver">
            <Users className="h-4 w-4 mr-2" />
            Driver
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  const renderDashboardStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total_documents}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.missing_required > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing Required</p>
                <p className="text-2xl font-bold text-red-600">{stats.missing_required}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.expiring_soon > 0 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.expiring_soon}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.requires_action > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requires Action</p>
                <p className="text-2xl font-bold text-orange-600">{stats.requires_action}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.by_status.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFolderPresets = () => (
    <div className="space-y-2 mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders (Filter Presets)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {folderPresets.map((preset) => {
          const Icon = getIconForPreset(preset.icon);
          const isSelected = selectedFolderPreset === preset.id;
          const count = getDocumentCountForPreset(preset, stats);

          return (
            <Button
              key={preset.id}
              variant={isSelected ? 'default' : 'outline'}
              className="justify-start"
              onClick={() => setSelectedFolderPreset(isSelected ? null : preset.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left truncate">{preset.name_pl}</span>
              {count > 0 && (
                <Badge variant={isSelected ? 'secondary' : 'default'} className="ml-2">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderDocumentsList = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create your first document to get started'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{doc.title}</h4>
                    <Badge variant="outline">{doc.type}</Badge>
                    <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>
                    {doc.required_level === 'required' && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                    {doc.is_locked && (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Scope: {doc.scope}</span>
                    {doc.has_attachments && (
                      <span>{doc.attachment_count} attachment(s)</span>
                    )}
                    {doc.valid_to && (
                      <span className={doc.is_expired ? 'text-red-600' : ''}>
                        {doc.is_expired ? 'Expired' : `Expires in ${doc.days_until_expiry} days`}
                      </span>
                    )}
                    <span>Created {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Structured document management with metadata and lifecycle
          </p>
        </div>
        <Button onClick={() => setNewDocumentDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Context Selector */}
      {renderContextSelector()}

      {/* Dashboard Stats */}
      {renderDashboardStats()}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </div>

      {/* Folder Presets */}
      {renderFolderPresets()}

      {/* Documents List */}
      {renderDocumentsList()}
      
      {/* New Document Dialog */}
      {selectedDepartment && selectedProfileId && (
        <ContextAwareDocumentDialog
          open={newDocumentDialogOpen}
          onOpenChange={setNewDocumentDialogOpen}
          context={{
            section: 'operations' as DocumentSection,
            department_template_id: selectedDepartment.template,
            business_profile_id: selectedProfileId,
            user_id: '', // TODO: Get from auth
          }}
        />
      )}
    </div>
  );
};

// Helper functions
function getIconForPreset(iconName?: string) {
  switch (iconName) {
    case 'AlertCircle': return AlertCircle;
    case 'FileText': return FileText;
    case 'ClipboardList': return Briefcase;
    case 'Shield': return AlertCircle;
    case 'DollarSign': return FileText;
    case 'PenTool': return FileText;
    case 'Clock': return Clock;
    default: return FileText;
  }
}

function getDocumentCountForPreset(preset: FolderPreset, stats: any): number {
  if (!stats) return 0;
  
  // Map preset to stat count
  if (preset.id === 'required') return stats.missing_required || 0;
  if (preset.id === 'expiring_soon') return stats.expiring_soon || 0;
  if (preset.id === 'pending_signature') return stats.awaiting_signature || 0;
  
  // Type-based counts
  if (preset.filter.type && preset.filter.type.length === 1) {
    const type = preset.filter.type[0];
    return stats.by_type[type] || 0;
  }
  
  return 0;
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
    case 'signed':
      return 'default';
    case 'requires_action':
      return 'destructive';
    case 'draft':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default DocumentsHub;
