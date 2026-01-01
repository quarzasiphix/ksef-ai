import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  ArrowLeft, FileText, Shield, DollarSign, Clock, 
  Users, Truck, AlertCircle, CheckCircle2, Calendar
} from 'lucide-react';
import { getJobById } from '../data/operationsRepository';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getJobTerminology } from '../types';
import type { OperationalJob, JobDocument } from '../types';
import { JobDocumentsTab } from '../components/JobDocumentsTab';
import { getJobDocumentTemplatesForDepartment } from '../utils/departmentDocumentTemplates';
import { calculateDocumentReadiness } from '../types/documentCategories';

/**
 * Job Detail Page - Universal container for Job/Case/Project/Initiative
 * 
 * Tabs adapt to department template:
 * - Overview: Basic info, status, timeline
 * - Resources: Assigned people, vehicles, equipment
 * - Legal & Contracts: Linked contracts, decisions, compliance
 * - Costs: Financial tracking, invoices
 * - Documents: Job-scoped documents
 * - Timeline: Activity log, milestones
 * 
 * Philosophy: Job = Container (not a document)
 * - Links to contracts (not embeds)
 * - Has resources assigned
 * - Tracks costs and timeline
 */
const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const [activeTab, setActiveTab] = useState('overview');

  const departmentTemplate = selectedDepartment ? getDepartmentTemplate(selectedDepartment.template) : null;
  const jobTerminology = departmentTemplate ? getJobTerminology(departmentTemplate.id) : { singular: 'Zadanie', plural: 'Zadania' };

  // Fetch job data
  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) throw new Error('Job ID required');
      return getJobById(id);
    },
    enabled: !!id,
  });

  // Fetch job documents
  const { data: jobDocuments = [] } = useQuery<JobDocument[]>({
    queryKey: ['job-documents', id],
    queryFn: async () => {
      if (!id) return [];
      const { getJobDocuments } = await import('../data/operationsRepository');
      return getJobDocuments(id);
    },
    enabled: !!id,
  });

  // Get department-specific document templates
  const departmentDocumentTemplates = departmentTemplate 
    ? getJobDocumentTemplatesForDepartment(departmentTemplate)
    : [];

  // Calculate document readiness using department templates
  const documentReadiness = job ? calculateDocumentReadiness(
    job.status, 
    jobDocuments,
    departmentDocumentTemplates
  ) : {
    status: 'missing_required' as const,
    compliance_blocked: false,
    missing_required: [],
    missing_recommended: [],
    expired: [],
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nie znaleziono {jobTerminology.singular.toLowerCase()}</h3>
            <Button onClick={() => navigate('/operations')}>
              Powrót do operacji
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-500">W trakcie</Badge>;
      case 'ready':
        return <Badge className="bg-green-500">Gotowe</Badge>;
      case 'draft':
        return <Badge variant="secondary">Projekt</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500">Zablokowane</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500">Zakończone</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/operations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{job.title}</h1>
              {getStatusBadge(job.status)}
              {job.stage && (
                <Badge variant="outline" className="text-xs">
                  {job.stage}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">{job.job_number}</span>
              {selectedDepartment && (
                <>
                  <span>•</span>
                  <span>{selectedDepartment.name}</span>
                </>
              )}
              {job.scheduled_start && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(job.scheduled_start).toLocaleDateString('pl-PL')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/operations/jobs/${id}/edit`)}>
          Edytuj
        </Button>
      </div>

      {/* Blocking Issues Alert */}
      {job.blocking_issues && job.blocking_issues.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Problemy blokujące ({job.blocking_issues.length})
                </h3>
                <div className="space-y-2">
                  {job.blocking_issues.map((issue, idx) => (
                    <div key={idx} className="text-sm text-red-800 dark:text-red-200">
                      • {issue.message}
                      {issue.resolution_action && (
                        <span className="block ml-4 text-xs mt-1">→ {issue.resolution_action}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users className="h-4 w-4 mr-2" />
            Zasoby
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Shield className="h-4 w-4 mr-2" />
            Prawne
          </TabsTrigger>
          <TabsTrigger value="costs">
            <DollarSign className="h-4 w-4 mr-2" />
            Koszty
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Dokumenty
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Historia
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informacje podstawowe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Opis</h4>
                  <p className="text-sm">{job.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <div>{getStatusBadge(job.status)}</div>
                </div>
                {job.stage && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Etap</h4>
                    <Badge variant="outline">{job.stage}</Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {job.scheduled_start && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Planowany start</h4>
                    <p className="text-sm">{new Date(job.scheduled_start).toLocaleString('pl-PL')}</p>
                  </div>
                )}
                {job.scheduled_end && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Planowane zakończenie</h4>
                    <p className="text-sm">{new Date(job.scheduled_end).toLocaleString('pl-PL')}</p>
                  </div>
                )}
              </div>

              {job.client_name && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Klient</h4>
                  <p className="text-sm">{job.client_name}</p>
                  {job.client_contact && (
                    <p className="text-xs text-muted-foreground">{job.client_contact}</p>
                  )}
                </div>
              )}

              {/* Template-specific data */}
              {job.template_data && Object.keys(job.template_data).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Szczegóły</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(job.template_data).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-xs text-muted-foreground">{key}:</span>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          {job.milestones && job.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Kamienie milowe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {job.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {milestone.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{milestone.label}</p>
                        {milestone.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Ukończono: {new Date(milestone.completed_at).toLocaleString('pl-PL')}
                          </p>
                        )}
                      </div>
                      {milestone.required && (
                        <Badge variant="secondary" className="text-xs">Wymagane</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Przypisane zasoby</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {job.assigned_driver_id && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Kierowca</p>
                      <p className="text-xs text-muted-foreground">ID: {job.assigned_driver_id}</p>
                    </div>
                  </div>
                )}
                {job.assigned_vehicle_id && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Pojazd</p>
                      <p className="text-xs text-muted-foreground">ID: {job.assigned_vehicle_id}</p>
                    </div>
                  </div>
                )}
                {!job.assigned_driver_id && !job.assigned_vehicle_id && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Brak przypisanych zasobów
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal & Contracts Tab */}
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Podstawa prawna i umowy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Department Decision */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium">Decyzja działu</h4>
                    </div>
                    {job.department_decision_id ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  {job.department_decision_id ? (
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/decisions/${job.department_decision_id}`)}>
                      Zobacz decyzję →
                    </Button>
                  ) : (
                    <p className="text-sm text-red-600">Brak decyzji autoryzującej</p>
                  )}
                </div>

                {/* Vehicle Contract */}
                {job.vehicle_contract_id && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h4 className="font-medium">Umowa pojazdu</h4>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/contracts/${job.vehicle_contract_id}`)}>
                      Zobacz umowę →
                    </Button>
                  </div>
                )}

                {/* Driver Contract */}
                {job.driver_contract_id && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h4 className="font-medium">Umowa z kierowcą</h4>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/contracts/${job.driver_contract_id}`)}>
                      Zobacz umowę →
                    </Button>
                  </div>
                )}

                {/* Client Contract */}
                {job.client_contract_id && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h4 className="font-medium">Umowa z klientem</h4>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/contracts/${job.client_contract_id}`)}>
                      Zobacz umowę →
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Koszty i przychody</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Szacowane koszty</p>
                    <p className="text-2xl font-bold">
                      {job.estimated_cost ? `${job.estimated_cost.toFixed(2)} ${job.currency || 'PLN'}` : '-'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Rzeczywiste koszty</p>
                    <p className="text-2xl font-bold">
                      {job.actual_cost ? `${job.actual_cost.toFixed(2)} ${job.currency || 'PLN'}` : '-'}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Cena dla klienta</p>
                    <p className="text-2xl font-bold">
                      {job.client_price ? `${job.client_price.toFixed(2)} ${job.currency || 'PLN'}` : '-'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Szczegółowe rozliczenie kosztów - wkrótce
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <JobDocumentsTab
            jobId={job.id}
            jobStatus={job.status}
            documents={jobDocuments}
            readiness={documentReadiness}
            availableTemplates={departmentDocumentTemplates}
            onUpload={(category) => {
              // TODO: Implement document upload dialog
              console.log('Upload document for category:', category);
            }}
            onView={(document) => {
              // TODO: Implement document viewer
              console.log('View document:', document);
            }}
            onDownload={(document) => {
              if (document.file_url) {
                window.open(document.file_url, '_blank');
              }
            }}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historia zmian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {job.created_at && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="w-px h-full bg-border" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">Utworzono</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>
                )}
                {job.actual_start && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="w-px h-full bg-border" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">Rozpoczęto</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.actual_start).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>
                )}
                {job.actual_end && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Zakończono</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.actual_end).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobDetailPage;
