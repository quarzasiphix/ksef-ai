import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ArrowLeft, Plus, Briefcase } from 'lucide-react';
import { getJobs } from '../data/operationsRepository';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getJobTerminology } from '../types';

const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();

  const departmentTemplate = selectedDepartment ? getDepartmentTemplate(selectedDepartment.template) : null;
  const jobTerminology = departmentTemplate ? getJobTerminology(departmentTemplate.id) : { singular: 'Zadanie', plural: 'Zadania' };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getJobs(selectedDepartment.id);
    },
    enabled: !!selectedDepartment,
  });

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

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Wybierz dział</h3>
            <Button onClick={() => navigate('/settings/projects')}>
              Przejdź do działów
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/operations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{jobTerminology.plural}</h1>
            <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/operations/jobs/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nowe {jobTerminology.singular.toLowerCase()}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wszystkie {jobTerminology.plural.toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Ładowanie...</p>
          ) : jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/operations/jobs/${job.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{job.title}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{job.job_number}</p>
                    </div>
                  </div>
                  {job.description && (
                    <p className="text-sm text-muted-foreground mb-2">{job.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {job.scheduled_start && (
                      <span>Start: {new Date(job.scheduled_start).toLocaleDateString('pl-PL')}</span>
                    )}
                    {job.client_name && (
                      <span>Klient: {job.client_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Brak {jobTerminology.plural.toLowerCase()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobsListPage;
