
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InvoicePartiesProps {
  businessName?: string;
  customerName?: string;
}

export const InvoiceParties: React.FC<InvoicePartiesProps> = ({
  businessName,
  customerName,
}) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base md:text-lg">Dane kontrahentów</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3 px-4 py-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Sprzedawca</p>
          <div>
            <p className="font-medium">{businessName || "Brak nazwy"}</p>
            <p className="text-xs text-muted-foreground">Brak dostępnych szczegółowych danych</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Nabywca</p>
          <div>
            <p className="font-medium">{customerName || "Brak nazwy"}</p>
            <p className="text-xs text-muted-foreground">Brak dostępnych szczegółowych danych</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
