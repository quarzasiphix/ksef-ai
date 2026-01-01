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
import type { Driver, DriverStatus } from '../types';
import { createDriver } from '../data/operationsRepository';

interface DriverFormValues {
  name: string;
  email?: string;
  phone?: string;
  employment_type?: 'employee' | 'b2b' | 'external';
  license_type?: string;
  license_number?: string;
  license_expiry?: string;
  certifications?: string;
  max_hours_per_day?: number;
  notes?: string;
}

const DriverNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();

  const form = useForm<DriverFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employment_type: 'employee',
      license_type: '',
      license_number: '',
      license_expiry: '',
      certifications: '',
      max_hours_per_day: 8,
      notes: '',
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: async (values: DriverFormValues) => {
      if (!selectedDepartment || !selectedProfileId) {
        throw new Error('Brak wybranego działu lub profilu.');
      }

      const certifications = values.certifications
        ? values.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : [];

      const payload: Partial<Driver> = {
        name: values.name.trim(),
        email: values.email?.trim(),
        phone: values.phone?.trim(),
        employment_type: values.employment_type,
        license_type: values.license_type?.trim(),
        license_number: values.license_number?.trim(),
        license_expiry: values.license_expiry ? new Date(values.license_expiry).toISOString() : undefined,
        certifications,
        max_hours_per_day: values.max_hours_per_day,
        notes: values.notes?.trim(),
        department_id: selectedDepartment.id,
        business_profile_id: selectedProfileId,
        status: 'available' as DriverStatus,
      };

      const driver = await createDriver(payload);
      return driver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] });
      navigate('/operations');
    },
  });

  const onSubmit = (values: DriverFormValues) => {
    createDriverMutation.mutate(values);
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
          <h1 className="text-2xl font-bold">Nowy kierowca</h1>
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
              <label className="text-sm font-medium">Imię i nazwisko *</label>
              <Input
                placeholder="Jan Kowalski"
                {...form.register('name', { required: true })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="jan@example.com" {...form.register('email')} />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input placeholder="+48 123 456 789" {...form.register('phone')} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Typ zatrudnienia</label>
              <Select onValueChange={(value) => form.setValue('employment_type', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Pracownik</SelectItem>
                  <SelectItem value="b2b">B2B</SelectItem>
                  <SelectItem value="external">Zewnętrzny</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uprawnienia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Kategoria prawa jazdy</label>
                <Input placeholder="np. B, C, CE" {...form.register('license_type')} />
              </div>
              <div>
                <label className="text-sm font-medium">Numer prawa jazdy</label>
                <Input placeholder="ABC123456" {...form.register('license_number')} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Data ważności prawa jazdy</label>
              <Input type="date" {...form.register('license_expiry')} />
            </div>
            <div>
              <label className="text-sm font-medium">Certyfikaty (oddzielone przecinkami)</label>
              <Input
                placeholder="np. transport zwierząt, przewóz materiałów niebezpiecznych"
                {...form.register('certifications')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ograniczenia operacyjne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Maksymalna liczba godzin dziennie</label>
              <Input
                type="number"
                min="1"
                max="24"
                {...form.register('max_hours_per_day', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notatki</label>
              <Textarea
                rows={3}
                placeholder="Dodatkowe informacje o kierowcy"
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {createDriverMutation.isError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {(createDriverMutation.error as Error).message || 'Nie udało się utworzyć kierowcy.'}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/operations')}>
            Anuluj
          </Button>
          <Button type="submit" disabled={createDriverMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createDriverMutation.isPending ? 'Zapisywanie...' : 'Utwórz kierowcę'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DriverNewPage;
