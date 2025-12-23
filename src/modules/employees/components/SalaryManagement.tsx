import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/context/AuthContext';
import type { SalaryManagementProps } from './SalaryManagementProps';

const SalaryManagement: React.FC<SalaryManagementProps> = ({ employee, refetch }) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentType, setPaymentType] = useState<string>('salary');
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentDate(new Date(e.target.value));
  };

  const handlePaymentTypeChange = (value: string) => {
    setPaymentType(value);
  };

  const handleCreatePayment = async (paymentData: any) => {
    try {
      const { data, error } = await supabase
        .from('employee_payments')
        .insert([paymentData])
        .select();

      if (error) {
        console.error('Error creating payment:', error);
        toast.error('Wystąpił błąd podczas tworzenia wypłaty');
        return;
      }

      toast.success('Wypłata została dodana pomyślnie');
      setAmount('');
      setPaymentDate(new Date());
      setPaymentType('salary');
      await fetchPayments();
      if (refetch) {
        refetch();
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Wystąpił błąd podczas tworzenia wypłaty');
    }
  };

  const handleAddPayment = async () => {
    if (!amount || !paymentDate) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    const paymentData = {
      employee_id: employee.id,
      user_id: user?.id,
      payment_date: paymentDate.toISOString(),
      amount: amount,
      payment_type: paymentType as 'salary' | 'bonus' | 'advance',
      period_start: paymentDate.toISOString(),
      period_end: paymentDate.toISOString(),
    };

    await handleCreatePayment(paymentData);
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_payments')
        .select('*')
        .eq('employee_id', employee.id)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        toast.error('Wystąpił błąd podczas pobierania historii wypłat');
        setIsLoading(false);
        return;
      }

      setPayments(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Wystąpił błąd podczas pobierania historii wypłat');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [employee.id]);

  return (
    <div className="space-y-6">
      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dodaj wypłatę</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Kwota</Label>
              <Input
                type="number"
                id="amount"
                placeholder="Wprowadź kwotę"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>
            <div>
              <Label htmlFor="paymentDate">Data wypłaty</Label>
              <Input
                type="date"
                id="paymentDate"
                value={paymentDate ? paymentDate.toISOString().split('T')[0] : ''}
                onChange={handleDateChange}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="paymentType">Typ wypłaty</Label>
            <Select onValueChange={handlePaymentTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wybierz typ wypłaty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Wynagrodzenie</SelectItem>
                <SelectItem value="bonus">Premia</SelectItem>
                <SelectItem value="advance">Zaliczka</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddPayment}>Dodaj wypłatę</Button>
        </CardContent>
      </Card>
      
      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia wypłat</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Ładowanie...</p>
          ) : payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableCaption>Historia wypłat dla {employee.first_name} {employee.last_name}.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Kwota</TableHead>
                    <TableHead>Typ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: pl })}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Brak historii wypłat</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagement;
