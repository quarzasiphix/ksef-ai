import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getJobTerminology } from '../types';
import type { JobStatus, OperationalJob, JobDeliverable, JobResourceRequirement, JobComplianceItem } from '../types';
import { createJob, getDrivers, getVehicles } from '../data/operationsRepository';

interface JobFormValues {
  // Basic
  job_number: string;
  title: string;
  description?: string;
  
  // Ownership
  owner_id?: string;
  coordinator_id?: string;
  client_contact_id?: string;
  
  // Scope
  scope_definition?: string;
  acceptance_criteria?: string;
  
  // Timeline
  scheduled_start?: string;
  scheduled_end?: string;
  
  // Resources (for transport)
  assigned_driver_id?: string;
  assigned_vehicle_id?: string;
  
  // Client
  client_name?: string;
  client_contact?: string;
  
  // Transport-specific
  origin?: string;
  destination?: string;
  distance_km?: number;
  cargo_description?: string;
  
  // Financial
  estimated_cost?: number;
  client_price?: number;
  budget_margin?: number;
  cost_cap?: number;
}

const JobNewPageEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();

  const [deliverables, setDeliverables] = useState<Partial<JobDeliverable>[]>([
    { label: 'Zwierzę dostarczone', required: true, completed: false },
    { label: 'Dokumenty podpisane', required: true, completed: false },
  ]);

  const [riskFlags, setRiskFlags] = useState<string[]>(['insurance_required']);

  const departmentTemplate = selectedDepartment
    ? getDepartmentTemplate(selectedDepartment.template)
    : null;

  const jobTerminology = departmentTemplate
    ? getJobTerminology(departmentTemplate.id)
    : { singular: 'Zadanie', plural: 'Zadania' };

  const isTransportTemplate = departmentTemplate?.id === 'transport_operations' || departmentTemplate?.id === 'operations';

  // Fetch drivers and vehicles for transport templates
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getDrivers(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && isTransportTemplate,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getVehicles(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && isTransportTemplate,
  });

  const form = useForm<JobFormValues>({
    defaultValues: {
      job_number: '',
      title: '',
      description: '',
      scope_definition: '',
      acceptance_criteria: '',
      scheduled_start: '',
      scheduled_end: '',
      assigned_driver_id: '',
      assigned_vehicle_id: '',
      client_name: '',
      client_contact: '',
      origin: '',
      destination: '',
      distance_km: undefined,
      cargo_description: '',
      estimated_cost: undefined,
      client_price: undefined,
      budget_margin: undefined,
      cost_cap: undefined,
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      if (!selectedDepartment || !selectedProfileId) {
        throw new Error('Brak wybranego działu lub profilu.');
      }

      // Build resource requirements
      const resource_requirements: Partial<JobResourceRequirement>[] = [];
      if (isTransportTemplate) {
        resource_requirements.push({
          resource_type: 'driver',
          role: 'primary_driver',
          quantity: 1,
          qualifications_required: ['animal_transport_cert'],
          fulfilled: !!values.assigned_driver_id,
          assigned_resource_id: values.assigned_driver_id,
        });
        resource_requirements.push({
          resource_type: 'vehicle',
          role: 'transport_vehicle',
          quantity: 1,
          fulfilled: !!values.assigned_vehicle_id,
          assigned_resource_id: values.assigned_vehicle_id,
        });
      }

      // Build compliance checklist
      const compliance_checklist: Partial<JobComplianceItem>[] = [
        {
          requirement: 'driver_license_valid',
          category: 'legal',
          required: true,
          status: 'pending',
        },
        {
          requirement: 'vehicle_insured',
          category: 'legal',
          required: true,
          status: 'pending',
        },
        {
          requirement: 'decision_attached',
          category: 'legal',
          required: true,
          status: 'pending',
        },
      ];

      // Build template data for transport
      const template_data: Record<string, any> = {};
      if (isTransportTemplate) {
        template_data.origin = values.origin;
        template_data.destination = values.destination;
        template_data.distance_km = values.distance_km;
        template_data.cargo_description = values.cargo_description;
      }

      const payload: Partial<OperationalJob> = {
        job_number: values.job_number.trim(),
        title: values.title.trim(),
        description: values.description?.trim(),
        scope_definition: values.scope_definition?.trim(),
        acceptance_criteria: values.acceptance_criteria?.trim(),
        scheduled_start: values.scheduled_start ? new Date(values.scheduled_start).toISOString() : undefined,
        scheduled_end: values.scheduled_end ? new Date(values.scheduled_end).toISOString() : undefined,
        department_id: selectedDepartment.id,
        business_profile_id: selectedProfileId,
        status: 'draft' as JobStatus,
        template_id: departmentTemplate?.id ?? 'general',
        
        // Ownership
        owner_id: values.owner_id,
        coordinator_id: values.coordinator_id,
        client_contact_id: values.client_contact_id,
        
        // Resources
        assigned_driver_id: values.assigned_driver_id,
        assigned_vehicle_id: values.assigned_vehicle_id,
        resource_requirements: resource_requirements as any,
        
        // Client
        client_name: values.client_name,
        client_contact: values.client_contact,
        
        // Template data
        template_data,
        
        // Deliverables
        deliverables: deliverables as any,
        
        // Financial
        estimated_cost: values.estimated_cost,
        client_price: values.client_price,
        budget_margin: values.budget_margin,
        cost_cap: values.cost_cap,
        currency: 'PLN',
        
        // Risk & Compliance
        risk_flags: riskFlags,
        compliance_checklist: compliance_checklist as any,
        compliance_status: 'pending',
      };

      const job = await createJob(payload);
      return job;
    },
    onSuccess: (job) => {
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

  const addDeliverable = () => {
    setDeliverables([...deliverables, { label: '', required: false, completed: false }]);
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const updateDeliverable = (index: number, field: keyof JobDeliverable, value: any) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [field]: value };
    setDeliverables(updated);
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

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Podstawowe informacje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Numer {jobTerminology.singular.toLowerCase()} *</label>
                <Input
                  placeholder="np. TR-2025-001"
                  {...form.register('job_number', { required: true })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tytuł *</label>
                <Input
                  placeholder={`Nazwa ${jobTerminology.singular.toLowerCase()}`}
                  {...form.register('title', { required: true })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Opis</label>
              <Textarea
                rows={3}
                placeholder="Szczegóły operacji"
                {...form.register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scope & Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle>Zakres i rezultaty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Definicja zakresu</label>
              <Textarea
                rows={2}
                placeholder="Co oznacza 'zrobione'?"
                {...form.register('scope_definition')}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Kryteria akceptacji</label>
              <Textarea
                rows={2}
                placeholder="Jak zweryfikować ukończenie?"
                {...form.register('acceptance_criteria')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Rezultaty do dostarczenia</label>
                <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj
                </Button>
              </div>
              <div className="space-y-2">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Nazwa rezultatu"
                      value={deliverable.label || ''}
                      onChange={(e) => updateDeliverable(index, 'label', e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={deliverable.required || false}
                        onChange={(e) => updateDeliverable(index, 'required', e.target.checked)}
                      />
                      Wymagane
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDeliverable(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Harmonogram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Planowany start</label>
                <Input type="datetime-local" {...form.register('scheduled_start')} />
              </div>
              <div>
                <label className="text-sm font-medium">Planowane zakończenie</label>
                <Input type="datetime-local" {...form.register('scheduled_end')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources (Transport only) */}
        {isTransportTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Zasoby</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Kierowca</label>
                  <Select onValueChange={(value) => form.setValue('assigned_driver_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kierowcę" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} ({driver.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Pojazd</label>
                  <Select onValueChange={(value) => form.setValue('assigned_vehicle_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz pojazd" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration_number} - {vehicle.make} {vehicle.model} ({vehicle.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle>Klient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nazwa klienta</label>
                <Input placeholder="Firma / Osoba" {...form.register('client_name')} />
              </div>
              <div>
                <label className="text-sm font-medium">Kontakt</label>
                <Input placeholder="Email lub telefon" {...form.register('client_contact')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport-specific */}
        {isTransportTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Szczegóły transportu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Miejsce początkowe</label>
                  <Input placeholder="Adres odbioru" {...form.register('origin')} />
                </div>
                <div>
                  <label className="text-sm font-medium">Miejsce docelowe</label>
                  <Input placeholder="Adres dostawy" {...form.register('destination')} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dystans (km)</label>
                  <Input type="number" placeholder="0" {...form.register('distance_km', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Opis ładunku</label>
                  <Input placeholder="np. Pies, 25kg" {...form.register('cargo_description')} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>Finanse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Szacowany koszt (PLN)</label>
                <Input type="number" step="0.01" placeholder="0.00" {...form.register('estimated_cost', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Cena dla klienta (PLN)</label>
                <Input type="number" step="0.01" placeholder="0.00" {...form.register('client_price', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Oczekiwana marża (PLN)</label>
                <Input type="number" step="0.01" placeholder="0.00" {...form.register('budget_margin', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="text-sm font-medium">Limit kosztów (PLN)</label>
                <Input type="number" step="0.01" placeholder="0.00" {...form.register('cost_cap', { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground mt-1">Przekroczenie wymaga zatwierdzenia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Ryzyko i zgodność</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {riskFlags.map((flag) => (
                <Badge key={flag} variant="outline">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {flag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Zgodność zostanie sprawdzona automatycznie przed zatwierdzeniem
            </p>
          </CardContent>
        </Card>

        {createJobMutation.isError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {(createJobMutation.error as Error).message || 'Nie udało się utworzyć zlecenia.'}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/operations')}>
            Anuluj
          </Button>
          <Button type="submit" disabled={createJobMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createJobMutation.isPending ? 'Zapisywanie...' : 'Utwórz zlecenie'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default JobNewPageEnhanced;
