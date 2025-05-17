
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface InvoiceFormActionsProps {
  isLoading: boolean;
  isEditing: boolean;
  onSubmit: () => void;
}

export const InvoiceFormActions: React.FC<InvoiceFormActionsProps> = ({
  isLoading,
  isEditing,
  onSubmit
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-end space-x-2 pt-4">
      <Button 
        variant="outline" 
        type="button"
        onClick={() => navigate("/income")}
        disabled={isLoading}
      >
        Anuluj
      </Button>
      <Button 
        type="submit" 
        disabled={isLoading}
        onClick={onSubmit}
      >
        {isLoading ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Utwórz dokument"}
      </Button>
    </div>
  );
};
