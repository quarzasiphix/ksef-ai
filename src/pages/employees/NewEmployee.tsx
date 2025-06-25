import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { createEmployee } from "@/integrations/supabase/repositories/employeeRepository";
import { useToast } from "@/hooks/use-toast";
import type { CreateEmployeeData } from "@/types/employee";

const NewEmployee: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Sukces", description: "Pracownik został dodany." });
      navigate("/employees");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać pracownika.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateEmployeeData) => {
    mutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dodaj pracownika</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Anuluj
        </Button>
      </div>
      <EmployeeForm
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        isLoading={mutation.isPending}
      />
    </div>
  );
};

export default NewEmployee; 