import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import type { Vehicle, VehicleStatus } from '../types';
import { createVehicle } from '../data/operationsRepository';

interface VehicleFormValues {
  registration_number: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  vehicle_type?: string;
  capacity?: number;
  ownership_type?: 'owned' | 'leased' | 'borrowed';
  insurance_expiry?: string;
  inspection_expiry?: string;
  notes?: string;
}

const VehicleNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();

  const form = useForm<VehicleFormValues>({
    defaultValues: {
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      vehicle_type: 'van',
      capacity: undefined,
      ownership_type: 'owned',
      insurance_expiry: '',
      inspection_expiry: '',
      notes: '',
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      if (!selectedDepartment || !selectedProfileId) {
        throw new Error('Brak wybranego działu lub profilu.');
      }

      const payload: Partial<Vehicle> = {
        registration_number: values.registration_number.trim().toUpperCase(),
        make: values.make?.trim(),
        model: values.model?.trim(),
        year: values.year,
        vin: values.vin?.trim().toUpperCase(),
        vehicle_type: values.vehicle_type,
        capacity: values.capacity,
        ownership_type: values.ownership_type,
        insurance_expiry: values.insurance_expiry ? new Date(values.insurance_expiry).toISOString() : undefined,
        inspection_expiry: values.inspection_expiry ? new Date(values.inspection_expiry).toISOString() : undefined,
        notes: values.notes?.trim(),
        department_id: selectedDepartment.id,
        business_profile_id: selectedProfileId,
        status: 'available' as VehicleStatus,
      };

      const vehicle = await createVehicle(payload);
      return vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] });
      navigate('/operations');
    },
  });

  const onSubmit = (values: VehicleFormValues) => {
    createVehicleMutation.mutate(values);
  };

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold mb-2">Wybierz dział operacyjny</p>
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
          <h1 className="text-2xl font-bold">Nowy pojazd</h1>
          <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Podstawowe informacje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Numer rejestracyjny *</label>
              <Input
                placeholder="ABC12345"
                {...form.register('registration_number', { required: true })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Marka</label>
                <Input placeholder="np. Mercedes" {...form.register('make')} />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input placeholder="np. Sprinter" {...form.register('model')} />
              </div>
              <div>
                <label className="text-sm font-medium">Rok produkcji</label>
                <Input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  {...form.register('year', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">VIN</label>
              <Input placeholder="17-znakowy numer identyfikacyjny" {...form.register('vin')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specyfikacja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Typ pojazdu</label>
                <Select onValueChange={(value) => form.setValue('vehicle_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="van">Furgon</SelectItem>
                    <SelectItem value="truck">Ciężarówka</SelectItem>
                    <SelectItem value="car">Samochód osobowy</SelectItem>
                    <SelectItem value="specialized">Specjalistyczny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ładowność (kg)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="1000"
                  {...form.register('capacity', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Własność</label>
              <Select onValueChange={(value) => form.setValue('ownership_type', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ własności" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Własny</SelectItem>
                  <SelectItem value="leased">Leasing</SelectItem>
                  <SelectItem value="borrowed">Wypożyczony</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dokumenty i przeglądy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data ważności ubezpieczenia</label>
                <Input type="date" {...form.register('insurance_expiry')} />
              </div>
              <div>
                <label className="text-sm font-medium">Data ważności przeglądu</label>
                <Input type="date" {...form.register('inspection_expiry')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dodatkowe informacje</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium">Notatki</label>
              <Textarea
                rows={3}
                placeholder="Dodatkowe informacje o pojeździe"
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {createVehicleMutation.isError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {(createVehicleMutation.error as Error).message || 'Nie udało się utworzyć pojazdu.'}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/operations')}>
            Anuluj
          </Button>
          <Button type="submit" disabled={createVehicleMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createVehicleMutation.isPending ? 'Zapisywanie...' : 'Utwórz pojazd'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VehicleNewPage;
