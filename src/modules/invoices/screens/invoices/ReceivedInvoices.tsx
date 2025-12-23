
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { FileText } from "lucide-react";
import ReceivedInvoicesTab from "@/modules/invoices/components/ReceivedInvoicesTab";

const ReceivedInvoices: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Otrzymane faktury
          </h1>
          <p className="text-muted-foreground">
            Faktury udostępnione przez innych użytkowników aplikacji
          </p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          System współpracy
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faktury udostępnione dla Ciebie</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceivedInvoicesTab />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceivedInvoices;
