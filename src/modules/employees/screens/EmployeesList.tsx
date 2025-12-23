import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Plus, Search, User, Calendar, DollarSign } from 'lucide-react';
import { Employee } from '@/shared/types';
import { getEmployees } from '@/integrations/supabase/repositories/employeeRepository';
import { useAuth } from '@/shared/context/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import SalaryManagement from '@/modules/employees/components/SalaryManagement';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';

const EmployeeCard = ({ employee, onRefetch }: { employee: Employee; onRefetch: () => void }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {employee.first_name} {employee.last_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>
          <Badge variant={employee.is_active ? 'default' : 'secondary'}>
            {employee.is_active ? 'Aktywny' : 'Nieaktywny'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{employee.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Dołączył {format(new Date(employee.created_at), 'd MMMM yyyy', { locale: pl })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Wynagrodzenie: {formatCurrency(employee.salary)}</span>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to={`/employees/${employee.id}`}>
              <User className="h-4 w-4 mr-2" />
              Szczegóły
            </Link>
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Wypłaty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Zarządzanie wypłatami - {employee.first_name} {employee.last_name}
                </DialogTitle>
              </DialogHeader>
              <SalaryManagement employee={employee} refetch={onRefetch} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

const EmployeesList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (user) {
        const employeesData = await getEmployees(user.id);
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredEmployees = employees.filter((employee) => {
    const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleRefetch = () => {
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pracownicy</h1>
          <p className="text-muted-foreground">Zarządzaj pracownikami firmy</p>
        </div>
        <Button asChild>
          <Link to="/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <CardTitle>Lista pracowników</CardTitle>
            <Input
              type="text"
              placeholder="Szukaj pracownika..."
              className="max-w-sm sm:w-auto"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Ładowanie...</p>
          ) : filteredEmployees.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} onRefetch={handleRefetch} />
              ))}
            </div>
          ) : (
            <p>Brak pracowników do wyświetlenia.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesList;
