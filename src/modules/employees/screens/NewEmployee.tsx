import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import EmployeeForm from "@/modules/employees/components/EmployeeForm";
import { createEmployee } from "@/integrations/supabase/repositories/employeeRepository";
import { useToast } from "@/shared/hooks/use-toast";
import type { CreateEmployeeData } from "@/modules/employees/employee";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { logCreationEvent, shouldLogEvents } from "@/shared/utils/eventLogging";

const NewEmployee: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async (employee) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      
      // Log event for Spółki
      if (shouldLogEvents(selectedProfile?.entityType)) {
        await logCreationEvent({
          businessProfileId: selectedProfileId!,
          eventType: 'employee_hired',
          entityType: 'employee',
          entityId: employee.id,
          entityReference: `${employee.first_name} ${employee.last_name}`,
          actionSummary: `Zatrudniono pracownika: ${employee.first_name} ${employee.last_name}`,
          changes: {
            position: employee.position,
            start_date: employee.start_date,
          },
        });
      }
      
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