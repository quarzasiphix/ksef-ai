
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
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Dane kontrahentów</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Sprzedawca</p>
          <div>
            <p className="font-bold">{businessName || "Brak nazwy"}</p>
            <p>Brak dostępnych szczegółowych danych</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Nabywca</p>
          <div>
            <p className="font-bold">{customerName || "Brak nazwy"}</p>
            <p>Brak dostępnych szczegółowych danych</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
