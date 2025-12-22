import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, RefreshCw, Send, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type ERPSyncStatus = "pending" | "synced" | "failed" | "not_configured";

interface ERPSyncWidgetProps {
  status: ERPSyncStatus;
  provider?: string;
  syncedAt?: string;
  errorMessage?: string;
  onSync?: () => void;
  onRetry?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export function ERPSyncWidget({
  status,
  provider,
  syncedAt,
  errorMessage,
  onSync,
  onRetry,
  onExport,
  isLoading = false
}: ERPSyncWidgetProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "synced":
        return {
          icon: CheckCircle2,
          iconColor: "text-green-600",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
          title: "Wysłano do ERP",
          message: provider 
            ? `Zsynchronizowano z ${provider} • ${syncedAt ? format(new Date(syncedAt), "dd.MM.yyyy HH:mm", { locale: pl }) : ""}`
            : `Zsynchronizowano • ${syncedAt ? format(new Date(syncedAt), "dd.MM.yyyy HH:mm", { locale: pl }) : ""}`
        };
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-amber-600",
          bgColor: "bg-amber-50 dark:bg-amber-950/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          title: "Oczekuje na synchronizację",
          message: "Dokument zostanie automatycznie wysłany do systemu ERP"
        };
      case "failed":
        return {
          icon: XCircle,
          iconColor: "text-red-600",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800",
          title: "Błąd synchronizacji",
          message: errorMessage || "Nie udało się wysłać dokumentu do ERP"
        };
      case "not_configured":
      default:
        return {
          icon: Send,
          iconColor: "text-blue-600",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          title: "Gotowe do księgowania",
          message: "Dokument zablokowany i gotowy do przekazania"
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className={cn("border-2", config.borderColor)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.iconColor)} />
          Integracja ERP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("rounded-lg p-3", config.bgColor)}>
          <p className="text-sm font-semibold mb-1">{config.title}</p>
          <p className="text-xs text-muted-foreground">{config.message}</p>
        </div>

        {status === "synced" && provider && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Zsynchronizowano
            </Badge>
          </div>
        )}

        {status === "not_configured" && (
          <div className="space-y-2">
            {onSync && (
              <Button
                onClick={onSync}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Wyślij do ERP
                  </>
                )}
              </Button>
            )}
            {onExport && (
              <Button
                onClick={onExport}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Eksportuj
              </Button>
            )}
            {!onSync && !onExport && (
              <div className="text-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Navigate to ERP settings
                    window.location.href = "/settings/integrations";
                  }}
                >
                  Skonfiguruj integrację ERP
                </Button>
              </div>
            )}
          </div>
        )}

        {status === "pending" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Synchronizacja w toku...</span>
          </div>
        )}

        {status === "failed" && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isLoading}
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50"
            size="sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Ponawiam...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Spróbuj ponownie
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            <strong>Uwaga:</strong> KsięgaI nie zastępuje systemu ERP.
            Po zatwierdzeniu dokument jest przekazywany do księgowości.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
