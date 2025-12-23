
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CreateLabourHoursData, LabourHours } from '@/modules/employees/employee';

const labourHoursSchema = z.object({
  work_date: z.string().min(1, 'Data pracy jest wymagana'),
  hours_worked: z.number().min(0).max(24, 'Liczba godzin musi być między 0 a 24'),
  overtime_hours: z.number().min(0).optional(),
  break_time: z.number().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  description: z.string().optional(),
  hourly_rate: z.number().min(0).optional(),
});

interface LabourHoursFormProps {
  employeeId: string;
  labourHours?: LabourHours;
  onSubmit: (data: CreateLabourHoursData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LabourHoursForm: React.FC<LabourHoursFormProps> = ({
  employeeId,
  labourHours,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLabourHoursData>({
    resolver: zodResolver(labourHoursSchema),
    defaultValues: labourHours ? {
      employee_id: labourHours.employee_id,
      work_date: labourHours.work_date,
      hours_worked: labourHours.hours_worked,
      overtime_hours: labourHours.overtime_hours,
      break_time: labourHours.break_time,
      start_time: labourHours.start_time || '',
      end_time: labourHours.end_time || '',
      description: labourHours.description || '',
      hourly_rate: labourHours.hourly_rate,
    } : {
      employee_id: employeeId,
      overtime_hours: 0,
      break_time: 0,
    },
  });

  const handleFormSubmit = (data: CreateLabourHoursData) => {
    const formattedData = {
      ...data,
      employee_id: employeeId,
      hours_worked: Number(data.hours_worked),
      overtime_hours: Number(data.overtime_hours) || 0,
      break_time: Number(data.break_time) || 0,
      hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : undefined,
      start_time: data.start_time || undefined,
      end_time: data.end_time || undefined,
      description: data.description || undefined,
    };
    onSubmit(formattedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {labourHours ? 'Edytuj godziny pracy' : 'Dodaj godziny pracy'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="work_date">Data pracy *</Label>
              <Input
                id="work_date"
                type="date"
                {...register('work_date')}
              />
              {errors.work_date && (
                <p className="text-sm text-red-600 mt-1">{errors.work_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="hours_worked">Przepracowane godziny *</Label>
              <Input
                id="hours_worked"
                type="number"
                step="0.25"
                {...register('hours_worked', { valueAsNumber: true })}
                placeholder="8.00"
              />
              {errors.hours_worked && (
                <p className="text-sm text-red-600 mt-1">{errors.hours_worked.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="overtime_hours">Godziny nadliczbowe</Label>
              <Input
                id="overtime_hours"
                type="number"
                step="0.25"
                {...register('overtime_hours', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.overtime_hours && (
                <p className="text-sm text-red-600 mt-1">{errors.overtime_hours.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="break_time">Czas przerwy (godz.)</Label>
              <Input
                id="break_time"
                type="number"
                step="0.25"
                {...register('break_time', { valueAsNumber: true })}
                placeholder="0.50"
              />
              {errors.break_time && (
                <p className="text-sm text-red-600 mt-1">{errors.break_time.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="start_time">Godzina rozpoczęcia</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time')}
              />
              {errors.start_time && (
                <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_time">Godzina zakończenia</Label>
              <Input
                id="end_time"
                type="time"
                {...register('end_time')}
              />
              {errors.end_time && (
                <p className="text-sm text-red-600 mt-1">{errors.end_time.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="hourly_rate">Stawka godzinowa (PLN)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                {...register('hourly_rate', { valueAsNumber: true })}
                placeholder="25.00"
              />
              {errors.hourly_rate && (
                <p className="text-sm text-red-600 mt-1">{errors.hourly_rate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Opis pracy</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Opis wykonanych zadań..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : labourHours ? 'Zaktualizuj' : 'Dodaj godziny'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LabourHoursForm;
