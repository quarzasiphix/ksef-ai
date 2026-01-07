import React from "react";
import { Button } from "@/shared/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { TransactionType } from "@/shared/types/common";

interface InvoiceFormActionsProps {
  isLoading: boolean;
  isEditing: boolean;
  onSubmit?: () => void;
  transactionType?: TransactionType;
}

export const InvoiceFormActions: React.FC<InvoiceFormActionsProps> = ({
  isLoading,
  isEditing,
  onSubmit,
  transactionType = TransactionType.INCOME
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the correct cancel URL based on the current route or transaction type
  const getCancelUrl = () => {
    // If we're in a specific route, use that to determine where to go back to
    if (location.pathname.includes('/expense')) {
      return '/expense';
    } else if (location.pathname.includes('/income')) {
      return '/income';
    }
    // Otherwise use the transaction type
    return transactionType === TransactionType.EXPENSE ? '/expense' : '/income';
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 border-t p-3 flex justify-end space-x-2 pointer-events-auto sm:relative sm:bg-transparent sm:border-t-0 sm:p-0 sm:pt-4 sm:mt-6"
      style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}
    >
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          navigate(getCancelUrl());
        }}
        disabled={isLoading}
      >
        Anuluj
      </Button>
      <Button
        type="button"
        disabled={isLoading}
        onClick={() => {
          if (onSubmit) {
            onSubmit();
          }
        }}
        className="relative overflow-hidden group"
      >
        <span className="absolute inset-0 rounded-md">
          <span className="absolute inset-0 rounded-md border-2 border-primary/50 animate-spin-border" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 2px, 0 2px)' }}></span>
          <span className="absolute inset-0 rounded-md border-2 border-primary/50 animate-spin-border" style={{ clipPath: 'polygon(100% 0, 100% 100%, calc(100% - 2px) 100%, calc(100% - 2px) 0)', animationDelay: '0.5s' }}></span>
          <span className="absolute inset-0 rounded-md border-2 border-primary/50 animate-spin-border" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% calc(100% - 2px), 0 calc(100% - 2px))', animationDelay: '1s' }}></span>
          <span className="absolute inset-0 rounded-md border-2 border-primary/50 animate-spin-border" style={{ clipPath: 'polygon(0 0, 2px 0, 2px 100%, 0 100%)', animationDelay: '1.5s' }}></span>
        </span>
        <span className="relative z-10">
          {isLoading ? "Zapisywanie..." : isEditing ? "Aktualizuj" : "Utwórz"}
        </span>
      </Button>
    </div>
  );
};