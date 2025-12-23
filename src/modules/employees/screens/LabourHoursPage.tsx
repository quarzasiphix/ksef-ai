
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, DollarSign, Calendar, User } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { getEmployees, getLabourHours, createLabourHours, getEmployeeSalaryStats } from '@/integrations/supabase/repositories/employeeRepository';
import { Employee, LabourHours, CreateLabourHoursData } from '@/shared/types/employee';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import LabourHoursForm from '@/modules/employees/components/LabourHoursForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const LabourHoursPage = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const { data: labourHours = [], isLoading } = useQuery({
    queryKey: ['labour_hours', selectedEmployee],
    queryFn: () => getLabourHours(selectedEmployee === 'all' ? undefined : selectedEmployee),
  });

  const { data: salaryStats } = useQuery({
    queryKey: ['salary_stats', selectedEmployee],
    queryFn: () => selectedEmployee !== 'all' ? getEmployeeSalaryStats(selectedEmployee) : null,
    enabled: selectedEmployee !== 'all',
  });

  const createLabourHoursMutation = useMutation({
    mutationFn: createLabourHours,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour_hours'] });
      queryClient.invalidateQueries({ queryKey: ['salary_stats'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Sukces',
        description: 'Godziny pracy zostały dodane pomyślnie.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać godzin pracy.',
        variant: 'destructive',
      });
      console.error('Error creating labour hours:', error);
    },
  });

  const handleCreateLabourHours = (data: CreateLabourHoursData) => {
    createLabourHoursMutation.mutate(data);
  };

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ewidencja czasu pracy</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj godziny
        </Button>
      </div>

      <div className="mb-6">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Wybierz pracownika" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy pracownicy</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.first_name} {employee.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEmployee !== 'all' && salaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nieopłacone godziny</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salaryStats.totalUnpaidHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Do wypłaty</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salaryStats.totalUnpaidAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wypłacono w tym miesiącu</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salaryStats.totalPaidThisMonth)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : labourHours.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Brak godzin pracy</h3>
              <p className="text-muted-foreground mb-4">
                Dodaj pierwsze godziny pracy dla pracowników.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj godziny
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historia godzin pracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labourHours.map((hours) => {
                const employee = employees.find(emp => emp.id === hours.employee_id);
                return (
                  <div key={hours.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {employee ? `${employee.first_name} ${employee.last_name}` : 'Nieznany pracownik'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(hours.work_date).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{hours.hours_worked}h</p>
                        {hours.overtime_hours > 0 && (
                          <p className="text-sm text-orange-600">+{hours.overtime_hours}h nadl.</p>
                        )}
                      </div>
                      <Badge variant={hours.is_paid ? 'default' : 'secondary'}>
                        {hours.is_paid ? 'Opłacone' : 'Nieopłacone'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj godziny pracy</DialogTitle>
          </DialogHeader>
          <LabourHoursForm
            employeeId={selectedEmployee !== 'all' ? selectedEmployee : employees[0]?.id || ''}
            onSubmit={handleCreateLabourHours}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createLabourHoursMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabourHoursPage;
