
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
    <div
      className="fixed bottom-0 left-0 w-full z-[100] bg-background border-t p-3 py-4 mb-[13px] flex justify-end space-x-2 pointer-events-auto sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-4 sm:mb-0"
      style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', marginBottom: 0, paddingBottom: 12 }}
    >
      <Button
        variant="outline"
        type="button"
        onClick={() => navigate("/invoices")}
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
