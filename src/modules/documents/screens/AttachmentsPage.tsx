import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useDepartment } from '@/shared/context/DepartmentContext';
import { useDepartments } from '../hooks/useDepartments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AttachmentWithFile, AttachmentEntityType } from '@/shared/types/attachment';
import { ATTACHMENT_ROLE_LABELS } from '@/shared/types/attachment';
import { formatFileSize } from '../types/storage';
import { cn } from '@/shared/lib/utils';

const ENTITY_TYPE_LABELS: Record<AttachmentEntityType, string> = {
  decision: 'Decyzje',
  ledger_event: 'Księga główna',
  contract: 'Umowy',
  operation: 'Operacje',
  capital_transaction: 'Kapitał',
  invoice: 'Faktury',
  case: 'Sprawy',
  document: 'Dokumenty',
};

const AttachmentsPage: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { selectedDepartment } = useDepartment();
  const { departments } = useDepartments();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<AttachmentEntityType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked' | 'needs_attention'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // Fetch all attachments with file details
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments-all', selectedProfileId, filterDepartment],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      let query = supabase
        .from('attachments_with_files')
        .select('*')
        .eq('business_profile_id', selectedProfileId);

      if (filterDepartment !== 'all') {
        if (filterDepartment === 'company_wide') {
          query = query.is('department_id', null);
        } else {
          query = query.eq('department_id', filterDepartment);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AttachmentWithFile[];
    },
    enabled: !!selectedProfileId,
  });

  // Fetch unlinked files using the new view
  const { data: unlinkedFiles = [] } = useQuery({
    queryKey: ['unlinked-files', selectedProfileId, filterDepartment],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      let query = supabase
        .from('storage_files_unlinked')
        .select('*')
        .eq('business_profile_id', selectedProfileId);

      if (filterDepartment !== 'all') {
        if (filterDepartment === 'company_wide') {
          query = query.is('department_id', null);
        } else {
          query = query.eq('department_id', filterDepartment);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProfileId,
  });

  // Filter attachments
  const filteredAttachments = attachments.filter(att => {
    if (filterEntityType !== 'all' && att.entity_type !== filterEntityType) return false;
    if (searchQuery && !att.file_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Status filter
    if (filterStatus === 'needs_attention') {
      // Decision without signed PDF
      if (att.entity_type === 'decision' && att.role !== 'DECISION_SIGNED_PDF') {
        // Check if this decision has any signed PDF
        const hasSignedPDF = attachments.some(
          a => a.entity_id === att.entity_id && a.role === 'DECISION_SIGNED_PDF'
        );
        if (hasSignedPDF) return false;
      } else {
        return false;
      }
    }
    
    return true;
  });

  // Group attachments by entity
  const groupedAttachments = filteredAttachments.reduce((acc, att) => {
    const key = `${att.entity_type}:${att.entity_id}`;
    if (!acc[key]) {
      acc[key] = {
        entity_type: att.entity_type,
        entity_id: att.entity_id,
        attachments: [],
      };
    }
    acc[key].attachments.push(att);
    return acc;
  }, {} as Record<string, { entity_type: AttachmentEntityType; entity_id: string; attachments: AttachmentWithFile[] }>);

  const groupedByType = Object.values(groupedAttachments).reduce((acc, group) => {
    if (!acc[group.entity_type]) {
      acc[group.entity_type] = [];
    }
    acc[group.entity_type].push(group);
    return acc;
  }, {} as Record<AttachmentEntityType, typeof groupedAttachments[string][]>);

  const getDepartmentColor = (deptId: string | null) => {
    if (!deptId) return '#6b7280';
    const dept = departments.find(d => d.id === deptId);
    return dept?.color || '#6b7280';
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'Ogólne';
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'Nieznany';
  };

  const getEntityLink = (entityType: AttachmentEntityType, entityId: string) => {
    switch (entityType) {
      case 'decision':
        return `/decisions/${entityId}`;
      case 'contract':
        return `/contracts/${entityId}`;
      case 'invoice':
        return `/invoices/${entityId}`;
      case 'operation':
        return `/operations/${entityId}`;
      default:
        return null;
    }
  };

  const needsAttentionCount = attachments.filter(att => {
    if (att.entity_type === 'decision' && att.role !== 'DECISION_SIGNED_PDF') {
      const hasSignedPDF = attachments.some(
        a => a.entity_id === att.entity_id && a.role === 'DECISION_SIGNED_PDF'
      );
      return !hasSignedPDF;
    }
    return false;
  }).length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Ładowanie załączników...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Załączniki</h1>
        <p className="text-muted-foreground">
          Wszystkie pliki powiązane z dokumentami, fakturami, decyzjami i operacjami
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attachments.length}</div>
            <p className="text-sm text-muted-foreground">Wszystkie załączniki</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{unlinkedFiles.length}</div>
            <p className="text-sm text-muted-foreground">Bez powiązań</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{needsAttentionCount}</div>
            <p className="text-sm text-muted-foreground">Wymaga uwagi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Object.keys(groupedAttachments).length}</div>
            <p className="text-sm text-muted-foreground">Powiązanych obiektów</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Szukaj</Label>
              <Input
                placeholder="Nazwa pliku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Typ powiązania</Label>
              <Select value={filterEntityType} onValueChange={(v) => setFilterEntityType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="linked">Powiązane</SelectItem>
                  <SelectItem value="needs_attention">Wymaga uwagi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dział</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="company_wide">Ogólne (cała firma)</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped attachments */}
      {Object.entries(groupedByType).map(([entityType, groups]) => (
        <Card key={entityType}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              {ENTITY_TYPE_LABELS[entityType as AttachmentEntityType]} ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groups.map((group) => {
                const link = getEntityLink(group.entity_type, group.entity_id);
                const hasSignedPDF = group.entity_type === 'decision' 
                  ? group.attachments.some(a => a.role === 'DECISION_SIGNED_PDF')
                  : true;

                return (
                  <div key={group.entity_id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {link ? (
                            <Link to={link} className="font-medium hover:underline">
                              {group.entity_type} • {group.entity_id.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {group.entity_type} • {group.entity_id.slice(0, 8)}
                            </span>
                          )}
                          {group.entity_type === 'decision' && !hasSignedPDF && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Brak podpisanej PDF
                            </Badge>
                          )}
                          {group.entity_type === 'decision' && hasSignedPDF && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Gotowe do audytu
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.attachments.length} {group.attachments.length === 1 ? 'załącznik' : 'załączników'}
                        </p>
                      </div>
                      {link && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={link}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {group.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 p-2 rounded bg-muted/50"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{att.file_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {ATTACHMENT_ROLE_LABELS[att.role]}
                              </Badge>
                              {att.department_id && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getDepartmentColor(att.department_id) }}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {getDepartmentName(att.department_id)}
                                  </span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(att.file_size)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Unlinked files */}
      {unlinkedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Bez powiązań ({unlinkedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Te pliki nie są powiązane z żadnym dokumentem, fakturą, decyzją ani operacją.
            </p>
            <div className="space-y-2">
              {unlinkedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Przypisz do...
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredAttachments.length === 0 && unlinkedFiles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Brak załączników spełniających wybrane kryteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttachmentsPage;
