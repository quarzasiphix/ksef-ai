
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ErrorViewProps {
  error: string | null;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/income">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Błąd</h1>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error || "Nie znaleziono faktury"}</p>
        <Button
          variant="outline"
          className="mt-4"
          asChild
        >
          <Link to="/income">Wróć do listy dokumentów</Link>
        </Button>
      </div>
    </div>
  );
};
