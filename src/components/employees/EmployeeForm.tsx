
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateEmployeeData, Employee } from '@/types/employee';

const employeeSchema = z.object({
  first_name: z.string().min(1, 'Imię jest wymagane'),
  last_name: z.string().min(1, 'Nazwisko jest wymagane'),
  pesel: z.string().length(11, 'PESEL musi mieć 11 cyfr'),
  nip: z.string().optional(),
  start_date: z.string().min(1, 'Data rozpoczęcia jest wymagana'),
  salary: z.number().min(0, 'Wynagrodzenie musi być większe od 0'),
  position: z.string().min(1, 'Stanowisko jest wymagane'),
  department: z.string().optional(),
  address: z.string().min(1, 'Adres jest wymagany'),
  postal_code: z.string().min(1, 'Kod pocztowy jest wymagany'),
  city: z.string().min(1, 'Miasto jest wymagane'),
  phone: z.string().optional(),
  email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
  bank_account: z.string().optional(),
  contract_type: z.string().min(1, 'Typ umowy jest wymagany'),
});

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: CreateEmployeeData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      first_name: employee.first_name,
      last_name: employee.last_name,
      pesel: employee.pesel,
      nip: employee.nip || '',
      start_date: employee.start_date,
      salary: employee.salary,
      position: employee.position,
      department: employee.department || '',
      address: employee.address,
      postal_code: employee.postal_code,
      city: employee.city,
      phone: employee.phone || '',
      email: employee.email || '',
      bank_account: employee.bank_account || '',
      contract_type: employee.contract_type,
    } : {
      contract_type: 'umowa_o_prace',
    },
  });

  const contractType = watch('contract_type');

  const handleFormSubmit = (data: CreateEmployeeData) => {
    // Convert salary to number
    const formattedData = {
      ...data,
      salary: Number(data.salary),
      email: data.email || undefined,
      phone: data.phone || undefined,
      nip: data.nip || undefined,
      department: data.department || undefined,
      bank_account: data.bank_account || undefined,
    };
    onSubmit(formattedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {employee ? 'Edytuj pracownika' : 'Dodaj nowego pracownika'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Imię *</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Wprowadź imię"
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">Nazwisko *</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Wprowadź nazwisko"
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pesel">PESEL *</Label>
              <Input
                id="pesel"
                {...register('pesel')}
                placeholder="12345678901"
                maxLength={11}
              />
              {errors.pesel && (
                <p className="text-sm text-red-600 mt-1">{errors.pesel.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                {...register('nip')}
                placeholder="1234567890"
              />
              {errors.nip && (
                <p className="text-sm text-red-600 mt-1">{errors.nip.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="start_date">Data rozpoczęcia *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-600 mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="salary">Wynagrodzenie miesięczne (PLN) *</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                {...register('salary', { valueAsNumber: true })}
                placeholder="5000.00"
              />
              {errors.salary && (
                <p className="text-sm text-red-600 mt-1">{errors.salary.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="position">Stanowisko *</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="Specjalista ds. IT"
              />
              {errors.position && (
                <p className="text-sm text-red-600 mt-1">{errors.position.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="department">Dział</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="IT"
              />
              {errors.department && (
                <p className="text-sm text-red-600 mt-1">{errors.department.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contract_type">Typ umowy *</Label>
              <Select
                value={contractType}
                onValueChange={(value) => setValue('contract_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ umowy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umowa_o_prace">Umowa o pracę</SelectItem>
                  <SelectItem value="umowa_zlecenie">Umowa zlecenie</SelectItem>
                  <SelectItem value="umowa_o_dzielo">Umowa o dzieło</SelectItem>
                  <SelectItem value="kontrakt_b2b">Kontrakt B2B</SelectItem>
                </SelectContent>
              </Select>
              {errors.contract_type && (
                <p className="text-sm text-red-600 mt-1">{errors.contract_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+48 123 456 789"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="pracownik@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bank_account">Numer konta bankowego</Label>
              <Input
                id="bank_account"
                {...register('bank_account')}
                placeholder="PL12 3456 7890 1234 5678 9012"
              />
              {errors.bank_account && (
                <p className="text-sm text-red-600 mt-1">{errors.bank_account.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Adres *</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="ul. Przykładowa 123"
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postal_code">Kod pocztowy *</Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                placeholder="00-000"
              />
              {errors.postal_code && (
                <p className="text-sm text-red-600 mt-1">{errors.postal_code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city">Miasto *</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Warszawa"
              />
              {errors.city && (
                <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
              )}
            </div>
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
              {isLoading ? 'Zapisywanie...' : employee ? 'Zaktualizuj' : 'Dodaj pracownika'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
