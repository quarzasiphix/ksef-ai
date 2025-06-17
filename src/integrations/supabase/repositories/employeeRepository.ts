
import { supabase } from '../client';
import { Employee, LabourHours, CreateEmployeeData, CreateLabourHoursData } from '@/types/employee';

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
