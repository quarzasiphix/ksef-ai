import React, { useEffect, useState } from "react";
import { Department } from "@/shared/types";
import { createDepartment, getActiveDepartments } from "../data/projectRepository";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FormControl } from "@/shared/ui/form";
import { DepartmentDialog } from "./DepartmentDialog";
import { useAuth } from "@/shared/context/AuthContext";
import { toast } from "sonner";

interface DepartmentSelectorProps {
  businessProfileId: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  businessProfileId,
  value,
  onChange,
  disabled = false,
  placeholder = "Wybierz dział",
  allowEmpty = true,
}) => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const EMPTY_VALUE = "__none";
  const CREATE_VALUE = "__create";

  useEffect(() => {
    if (businessProfileId) {
      loadDepartments();
    }
  }, [businessProfileId]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await getActiveDepartments(businessProfileId);
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Ładowanie..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <>
      <Select
        value={value ?? EMPTY_VALUE}
        onValueChange={(val) => {
          if (val === CREATE_VALUE) {
            setDialogOpen(true);
            return;
          }
          onChange(val === EMPTY_VALUE ? undefined : val);
        }}
        disabled={disabled}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value={EMPTY_VALUE}>
              <span className="text-muted-foreground">Brak działu</span>
            </SelectItem>
          )}
          {departments.map((department) => (
            <SelectItem key={department.id} value={department.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: department.color }}
                />
                <span>{department.name}</span>
                {department.code && (
                  <span className="text-xs text-muted-foreground">
                    ({department.code})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          <SelectItem value={CREATE_VALUE} className="text-primary">
            + Dodaj dział
          </SelectItem>
        </SelectContent>
      </Select>

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={null}
        businessProfileId={businessProfileId}
        onSave={async (data) => {
          if (!user) {
            toast.error("Musisz być zalogowany, aby tworzyć dział");
            return;
          }
          try {
            const created = await createDepartment({
              ...data,
              business_profile_id: businessProfileId,
              created_by: user.id,
              status: "active",
            });
            toast.success("Dział utworzony");
            setDialogOpen(false);
            await loadDepartments();
            onChange(created.id);
          } catch (error) {
            console.error("Error creating department:", error);
            toast.error("Nie udało się utworzyć działu");
          }
        }}
      />
    </>
  );
};
