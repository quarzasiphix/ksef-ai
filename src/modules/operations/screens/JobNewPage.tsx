import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getJobTerminology } from '../types';
import type { JobStatus, OperationalJob } from '../types';
import { createJob } from '../data/operationsRepository';

interface JobFormValues {
  job_number: string;
  title: string;
  description?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

const JobNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();

  const departmentTemplate = selectedDepartment
    ? getDepartmentTemplate(selectedDepartment.template)
    : null;

  const jobTerminology = departmentTemplate
    ? getJobTerminology(departmentTemplate.id)
    : { singular: 'Zadanie', plural: 'Zadania' };

  const form = useForm<JobFormValues>({
    defaultValues: {
      job_number: '',
      title: '',
      description: '',
      scheduled_start: '',
      scheduled_end: '',
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      if (!selectedDepartment || !selectedProfileId) {
        throw new Error('Brak wybranego działu lub profilu.');
      }

      const payload: Partial<OperationalJob> = {
        job_number: values.job_number.trim(),
        title: values.title.trim(),
        description: values.description?.trim(),
        scheduled_start: values.scheduled_start ? new Date(values.scheduled_start).toISOString() : undefined,
        scheduled_end: values.scheduled_end ? new Date(values.scheduled_end).toISOString() : undefined,
        department_id: selectedDepartment.id,
        business_profile_id: selectedProfileId,
        status: 'draft' as JobStatus,
        template_id: departmentTemplate?.id ?? 'general',
      };

      const job = await createJob(payload);
      return job;
    },
    onSuccess: (job) => {
      // Invalidate operations-related queries so dashboards refresh
      queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['operations-context'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate(`/operations/jobs/${job.id}`);
    },
  });

  const onSubmit = (values: JobFormValues) => {
    createJobMutation.mutate(values);
  };

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold mb-2">Wybierz dział, aby utworzyć {jobTerminology.singular.toLowerCase()}</p>
            <Button onClick={() => navigate('/settings/projects')}>Przejdź do działów</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/operations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nowe {jobTerminology.singular.toLowerCase()}</h1>
          <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Podstawowe informacje</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">Numer {jobTerminology.singular.toLowerCase()}</label>
                <Input
                  placeholder="np. TR-2025-001"
                  {...form.register('job_number', { required: true })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tytuł</label>
                <Input
                  placeholder={`Nazwa ${jobTerminology.singular.toLowerCase()}`}
                  {...form.register('title', { required: true })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Opis</label>
              <Textarea
                rows={4}
                placeholder="Szczegóły operacji"
                {...form.register('description')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">Planowany start</label>
                <Input type="datetime-local" {...form.register('scheduled_start')} />
              </div>
              <div>
                <label className="text-sm font-medium">Planowane zakończenie</label>
                <Input type="datetime-local" {...form.register('scheduled_end')} />
              </div>
            </div>

            {createJobMutation.isError && (
              <p className="text-sm text-red-600">
                {(createJobMutation.error as Error).message || 'Nie udało się utworzyć zlecenia.'}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={createJobMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createJobMutation.isPending ? 'Zapisywanie...' : 'Utwórz'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobNewPage;
