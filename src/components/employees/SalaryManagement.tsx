
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Calendar, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  getUnpaidLabourHours, 
  createSalaryPayment, 
  markLabourHoursAsPaid,
  getSalaryPayments 
} from '@/integrations/supabase/repositories/employeeRepository';
import { Employee, CreateSalaryPaymentData } from '@/types/employee';
import { formatCurrency } from '@/lib/invoice-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SalaryManagementProps {
  employee: Employee;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({ employee }) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unpaidHours = [] } = useQuery({
    queryKey: ['unpaid_hours', employee.id],
    queryFn: () => getUnpaidLabourHours(employee.id),
  });

  const { data: salaryPayments = [] } = useQuery({
    queryKey: ['salary_payments', employee.id],
    queryFn: () => getSalaryPayments(employee.id),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: CreateSalaryPaymentData) => {
      const payment = await createSalaryPayment(paymentData);
      if (paymentData.labour_hours_ids && paymentData.labour_hours_ids.length > 0) {
        await markLabourHoursAsPaid(paymentData.labour_hours_ids, paymentData.payment_date);
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpaid_hours'] });
      queryClient.invalidateQueries({ queryKey: ['salary_payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary_stats'] });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      toast({
        title: 'Sukces',
        description: 'Wypłata została zarejestrowana pomyślnie.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zarejestrować wypłaty.',
        variant: 'destructive',
      });
      console.error('Error creating payment:', error);
    },
  });

  const hourlyRate = employee.salary / 160; // Assuming 160 hours per month
  const totalUnpaidAmount = unpaidHours.reduce((sum, hours) => {
    const rate = hours.hourly_rate || hourlyRate;
    return sum + (hours.hours_worked * rate) + (hours.overtime_hours * rate * 1.5);
  }, 0);

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Błąd',
        description: 'Wprowadź prawidłową kwotę wypłaty.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const paymentData: CreateSalaryPaymentData = {
      employee_id: employee.id,
      payment_date: today,
      amount: amount,
      period_start: startOfMonth,
      period_end: today,
      payment_type: 'hourly',
      labour_hours_ids: unpaidHours.map(h => h.id),
      notes: paymentNotes || undefined,
    };

    createPaymentMutation.mutate(paymentData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Zarządzanie wynagrodzeniem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Miesięczne wynagrodzenie</Label>
              <p className="text-2xl font-bold">{formatCurrency(employee.salary)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Stawka godzinowa</Label>
              <p className="text-2xl font-bold">{formatCurrency(hourlyRate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {unpaidHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Nieopłacone godziny ({unpaidHours.length})</span>
              <Button onClick={() => {
                setPaymentAmount(totalUnpaidAmount.toFixed(2));
                setIsPaymentDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Wypłać {formatCurrency(totalUnpaidAmount)}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidHours.map((hours) => (
                <div key={hours.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{new Date(hours.work_date).toLocaleDateString('pl-PL')}</p>
                    <p className="text-sm text-muted-foreground">
                      {hours.hours_worked}h
                      {hours.overtime_hours > 0 && ` + ${hours.overtime_hours}h nadl.`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency((hours.hours_worked * hourlyRate) + (hours.overtime_hours * hourlyRate * 1.5))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historia wypłat</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryPayments.length === 0 ? (
            <p className="text-muted-foreground">Brak zarejestrowanych wypłat.</p>
          ) : (
            <div className="space-y-2">
              {salaryPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString('pl-PL')}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.period_start} - {payment.period_end}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <Badge variant="outline">{payment.payment_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zarejestruj wypłatę</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Kwota wypłaty</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notatki (opcjonalne)</Label>
              <Textarea
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Dodatkowe informacje o wypłacie..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={createPaymentMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                onClick={handlePayment}
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? 'Zapisywanie...' : 'Zarejestruj wypłatę'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryManagement;
