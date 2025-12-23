import { supabase } from '../../../integrations/supabase/client';
import { Employee, LabourHours, SalaryPayment, CreateEmployeeData, CreateLabourHoursData, CreateSalaryPaymentData } from '@/modules/employees/employee';

export const getEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getEmployee = async (id: string): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createEmployee = async (employeeData: CreateEmployeeData): Promise<Employee> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('employees')
    .insert([{ ...employeeData, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEmployee = async (id: string, employeeData: Partial<CreateEmployeeData>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .update({ ...employeeData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const getLabourHours = async (employeeId?: string): Promise<LabourHours[]> => {
  let query = supabase
    .from('labour_hours')
    .select(`
      *,
      employees (
        first_name,
        last_name
      )
    `)
    .order('work_date', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createLabourHours = async (labourData: CreateLabourHoursData): Promise<LabourHours> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('labour_hours')
    .insert([{ ...labourData, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLabourHours = async (id: string, labourData: Partial<CreateLabourHoursData>): Promise<LabourHours> => {
  const { data, error } = await supabase
    .from('labour_hours')
    .update({ ...labourData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLabourHours = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('labour_hours')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const markLabourHoursAsPaid = async (ids: string[], paymentDate: string): Promise<void> => {
  const { error } = await supabase
    .from('labour_hours')
    .update({ 
      is_paid: true, 
      payment_date: paymentDate,
      updated_at: new Date().toISOString() 
    })
    .in('id', ids);

  if (error) throw error;
};

export async function getSalaryPayments(userId: string): Promise<SalaryPayment[]> {
  try {
    const { data, error } = await supabase
      .from('salary_payments')
      .select(`
        *,
        employees (
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error("Error fetching salary payments:", error);
      throw error;
    }

    return (data || []).map(payment => ({
      ...payment,
      payment_type: payment.payment_type as "salary" | "hourly" | "bonus"
    })) as SalaryPayment[];
  } catch (error) {
    console.error('Error in getSalaryPayments:', error);
    throw error;
  }
}

export async function createSalaryPayment(payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryPayment> {
  try {
    const { data, error } = await supabase
      .from('salary_payments')
      .insert(payment)
      .select()
      .single();

    if (error) {
      console.error("Error creating salary payment:", error);
      throw error;
    }

    return {
      ...data,
      payment_type: data.payment_type as "salary" | "hourly" | "bonus"
    } as SalaryPayment;
  } catch (error) {
    console.error('Error in createSalaryPayment:', error);
    throw error;
  }
}

export const getUnpaidLabourHours = async (employeeId: string): Promise<LabourHours[]> => {
  const { data, error } = await supabase
    .from('labour_hours')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_paid', false)
    .order('work_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getEmployeeSalaryStats = async (employeeId: string): Promise<{
  totalUnpaidHours: number;
  totalUnpaidAmount: number;
  totalPaidThisMonth: number;
}> => {
  const employee = await getEmployee(employeeId);
  if (!employee) throw new Error('Employee not found');

  const unpaidHours = await getUnpaidLabourHours(employeeId);
  
  const totalUnpaidHours = unpaidHours.reduce((sum, hours) => 
    sum + hours.hours_worked + (hours.overtime_hours * 1.5), 0
  );
  
  const hourlyRate = employee.salary / 160; // Assuming 160 hours per month
  const totalUnpaidAmount = unpaidHours.reduce((sum, hours) => {
    const rate = hours.hourly_rate || hourlyRate;
    return sum + (hours.hours_worked * rate) + (hours.overtime_hours * rate * 1.5);
  }, 0);

  // Get payments for current month
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: monthlyPayments, error } = await supabase
    .from('salary_payments')
    .select('amount')
    .eq('employee_id', employeeId)
    .gte('payment_date', `${currentMonth}-01`)
    .lt('payment_date', `${currentMonth}-32`);

  if (error) throw error;

  const totalPaidThisMonth = monthlyPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

  return {
    totalUnpaidHours,
    totalUnpaidAmount,
    totalPaidThisMonth
  };
};
