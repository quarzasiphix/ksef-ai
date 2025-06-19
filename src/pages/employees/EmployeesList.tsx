import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Clock, Eye, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getEmployees, deleteEmployee, getEmployeeSalaryStats } from '@/integrations/supabase/repositories/employeeRepository';
import { Employee } from '@/types/employee';
import { formatCurrency } from '@/lib/invoice-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmployeeForm from '@/components/employees/EmployeeForm';
import SalaryManagement from '@/components/employees/SalaryManagement';
import { createEmployee, updateEmployee } from '@/integrations/supabase/repositories/employeeRepository';
import { CreateEmployeeData } from '@/types/employee';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const EmployeesList = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Sukces',
        description: 'Pracownik został dodany pomyślnie.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać pracownika.',
        variant: 'destructive',
      });
      console.error('Error creating employee:', error);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEmployeeData> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: 'Sukces',
        description: 'Dane pracownika zostały zaktualizowane.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować danych pracownika.',
        variant: 'destructive',
      });
      console.error('Error updating employee:', error);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Sukces',
        description: 'Pracownik został usunięty.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć pracownika.',
        variant: 'destructive',
      });
      console.error('Error deleting employee:', error);
    },
  });

  const handleCreateEmployee = (data: CreateEmployeeData) => {
    createEmployeeMutation.mutate(data);
  };

  const handleUpdateEmployee = (data: CreateEmployeeData) => {
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data });
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (confirm(`Czy na pewno chcesz usunąć pracownika ${employee.first_name} ${employee.last_name}?`)) {
      deleteEmployeeMutation.mutate(employee.id);
    }
  };

  const getContractTypeBadge = (contractType: string) => {
    const variants = {
      'umowa_o_prace': 'default',
      'umowa_zlecenie': 'secondary',
      'umowa_o_dzielo': 'outline',
      'kontrakt_b2b': 'destructive',
    } as const;

    const labels = {
      'umowa_o_prace': 'Umowa o pracę',
      'umowa_zlecenie': 'Umowa zlecenie',
      'umowa_o_dzielo': 'Umowa o dzieło',
      'kontrakt_b2b': 'Kontrakt B2B',
    };

    return (
      <Badge variant={variants[contractType as keyof typeof variants] || 'default'}>
        {labels[contractType as keyof typeof labels] || contractType}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pracownicy</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/labour-hours')}>
            <Clock className="mr-2 h-4 w-4" />
            Ewidencja czasu pracy
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Button>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Brak pracowników</h3>
              <p className="text-muted-foreground mb-4">
                Dodaj pierwszego pracownika, aby rozpocząć zarządzanie zespołem.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj pracownika
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              isMobile={isMobile}
              onEdit={() => {
                setSelectedEmployee(employee);
                setIsEditDialogOpen(true);
              }}
              onDelete={() => handleDeleteEmployee(employee)}
              onManageSalary={() => {
                setSelectedEmployee(employee);
                setIsSalaryDialogOpen(true);
              }}
              getContractTypeBadge={getContractTypeBadge}
            />
          ))}
        </div>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj nowego pracownika</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleCreateEmployee}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createEmployeeMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj pracownika</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeForm
              employee={selectedEmployee}
              onSubmit={handleUpdateEmployee}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedEmployee(null);
              }}
              isLoading={updateEmployeeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Salary Management Dialog */}
      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Zarządzanie wynagrodzeniem - {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <SalaryManagement
              employee={selectedEmployee}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmployeeCard: React.FC<{
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onManageSalary: () => void;
  getContractTypeBadge: (contractType: string) => React.ReactNode;
  isMobile: boolean;
}> = ({ employee, onEdit, onDelete, onManageSalary, getContractTypeBadge }) => {
  const { data: salaryStats } = useQuery({
    queryKey: ['salary_stats', employee.id],
    queryFn: () => getEmployeeSalaryStats(employee.id),
  });

  return (
    <Card className="hover:shadow-lg transition-shadow p-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base md:text-lg">
              {employee.first_name} {employee.last_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
            {employee.department && (
              <p className="text-xs text-muted-foreground">{employee.department}</p>
            )}
          </div>
          {getContractTypeBadge(employee.contract_type)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-sm font-medium">PESEL:</span>
            <span className="text-sm">{employee.pesel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Wynagrodzenie:</span>
            <span className="text-sm">{formatCurrency(employee.salary)}</span>
          </div>
          {salaryStats && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Do wypłaty:</span>
              <span className="text-sm font-bold text-orange-600">
                {formatCurrency(salaryStats.totalUnpaidAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm font-medium">Data rozpoczęcia:</span>
            <span className="text-sm">
              {new Date(employee.start_date).toLocaleDateString('pl-PL')}
            </span>
          </div>
          {employee.email && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Telefon:</span>
              <span className="text-sm">{employee.phone}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onManageSalary}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeesList;
