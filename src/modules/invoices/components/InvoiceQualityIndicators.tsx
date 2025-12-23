import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, FileText, Link as LinkIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface QualityCheck {
  status: "ok" | "warning" | "error";
  label: string;
  message: string;
}

interface InvoiceQualityIndicatorsProps {
  dataCompleteness: QualityCheck;
  duplicateCheck: QualityCheck;
  relatedDocuments?: {
    type: "contract" | "order" | "decision";
    id: string;
    number: string;
  }[];
}

export function InvoiceQualityIndicators({
  dataCompleteness,
  duplicateCheck,
  relatedDocuments
}: InvoiceQualityIndicatorsProps) {
  const getStatusIcon = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Uwaga</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Błąd</Badge>;
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Weryfikacja jakości
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Completeness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(dataCompleteness.status)}
              <span className="text-sm font-medium">{dataCompleteness.label}</span>
            </div>
            {getStatusBadge(dataCompleteness.status)}
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {dataCompleteness.message}
          </p>
        </div>

        {/* Duplicate Check */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(duplicateCheck.status)}
              <span className="text-sm font-medium">{duplicateCheck.label}</span>
            </div>
            {getStatusBadge(duplicateCheck.status)}
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {duplicateCheck.message}
          </p>
        </div>

        {/* Related Documents */}
        {relatedDocuments && relatedDocuments.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Powiązane dokumenty</span>
            </div>
            <div className="space-y-1 pl-6">
              {relatedDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {doc.type === "contract" && "Umowa"}
                    {doc.type === "order" && "Zamówienie"}
                    {doc.type === "decision" && "Uchwała"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{doc.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!relatedDocuments || relatedDocuments.length === 0) && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Powiązanie</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Brak powiązanych dokumentów (umowa/zamówienie)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
