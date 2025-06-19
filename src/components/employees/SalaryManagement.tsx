
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Employee, SalaryPayment, CreateSalaryPaymentData } from '@/types/employee';
import { getSalaryPayments, createSalaryPayment } from '@/integrations/supabase/repositories/employeeRepository';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SalaryManagementProps {
  employee: Employee;
  refetch: () => void;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({ employee, refetch }) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'salary' | 'hourly' | 'bonus'>('salary');

  useEffect(() => {
    const loadPayments = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const data = await getSalaryPayments(user.id);
        // Filter payments for the current employee
        const employeePayments = data.filter(payment => payment.employee_id === employee.id);
        setPayments(employeePayments);
      } catch (error) {
        console.error('Error loading salary payments:', error);
        toast.error('Nie udało się załadować historii wypłat');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [user?.id, employee.id]);

  const handleCreatePayment = async (paymentData: CreateSalaryPaymentData) => {
  if (!user?.id) return;
  
  try {
    // Add user_id to the payment data
    const paymentWithUserId = {
      ...paymentData,
      user_id: user.id
    };
    
    await createSalaryPayment(paymentWithUserId);
    toast.success('Wypłata została zarejestrowana');
    await refetch();
    setShowPaymentForm(false);
  } catch (error) {
    console.error('Error creating salary payment:', error);
    toast.error('Nie udało się zarejestrować wypłaty');
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentDate || !paymentAmount) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Wprowadź poprawną kwotę');
      return;
    }

    const paymentData: CreateSalaryPaymentData = {
      employee_id: employee.id,
      payment_date: paymentDate.toISOString(),
      amount: amount,
      payment_type: paymentType,
      period_start: paymentDate.toISOString(),
      period_end: paymentDate.toISOString(),
    };

    await handleCreatePayment(paymentData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Historia wypłat</h2>
        <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
          <DialogTrigger asChild>
            <Button variant="outline">Dodaj wypłatę</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nowa wypłata</DialogTitle>
              <DialogDescription>
                Zarejestruj nową wypłatę dla pracownika.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Data wypłaty
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "yyyy-MM-dd") : <span>Wybierz datę</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center" side="bottom">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={setPaymentDate}
                      disabled={(date) =>
                        date > new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Kwota
                </Label>
                <Input
                  type="number"
                  id="amount"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Typ wypłaty
                </Label>
                <select
                  id="type"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as 'salary' | 'hourly' | 'bonus')}
                  className="col-span-3 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                >
                  <option value="salary">Pensja</option>
                  <option value="hourly">Godzinowa</option>
                  <option value="bonus">Premia</option>
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Zapisz</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Ładowanie historii wypłat...</p>
      ) : payments.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableCaption>Historia wypłat dla {employee.first_name} {employee.last_name}.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Kwota</TableHead>
                <TableHead>Typ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{format(new Date(payment.payment_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{payment.payment_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p>Brak zarejestrowanych wypłat.</p>
      )}
    </div>
  );
};

export default SalaryManagement;
