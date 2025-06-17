
export interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  pesel: string;
  nip?: string;
  start_date: string;
  end_date?: string;
  salary: number;
  position: string;
  department?: string;
  address: string;
  postal_code: string;
  city: string;
  phone?: string;
  email?: string;
  bank_account?: string;
  contract_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabourHours {
  id: string;
  user_id: string;
  employee_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  break_time: number;
  start_time?: string;
  end_time?: string;
  description?: string;
  hourly_rate?: number;
  is_paid: boolean;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  user_id: string;
  employee_id: string;
  payment_date: string;
  amount: number;
  period_start: string;
  period_end: string;
  payment_type: 'salary' | 'hourly' | 'bonus';
  labour_hours_ids?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  first_name: string;
  last_name: string;
  pesel: string;
  nip?: string;
  start_date: string;
  salary: number;
  position: string;
  department?: string;
  address: string;
  postal_code: string;
  city: string;
  phone?: string;
  email?: string;
  bank_account?: string;
  contract_type: string;
}

export interface CreateLabourHoursData {
  employee_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours?: number;
  break_time?: number;
  start_time?: string;
  end_time?: string;
  description?: string;
  hourly_rate?: number;
  notes?: string;
}

export interface CreateSalaryPaymentData {
  employee_id: string;
  payment_date: string;
  amount: number;
  period_start: string;
  period_end: string;
  payment_type: 'salary' | 'hourly' | 'bonus';
  labour_hours_ids?: string[];
  notes?: string;
}
