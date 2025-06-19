
import { Employee } from "@/types";

export interface SalaryManagementProps {
  employee: Employee;
  refetch?: () => void;
}
