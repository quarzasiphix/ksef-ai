
import { Employee } from "@/shared/types";

export interface SalaryManagementProps {
  employee: Employee;
  refetch?: () => void;
}
