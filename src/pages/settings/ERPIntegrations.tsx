import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { toast } from "sonner";
import {
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ArrowRight,
  Shield
} from "lucide-react";
import { ERPProvider, ERPConnectionStatus, ERP_PROVIDERS, ERPConnection } from "@/types/erp";
import { getERPConnections, deleteERPConnection, testERPConnection } from "@/integrations/supabase/repositories/erpRepository";

export default function ERPIntegrations() {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<ERPProvider | null>(null);

  // Fetch ERP connections for current business profile
  const { data: connections = [], isLoading } = useQuery<ERPConnection[]>({
    queryKey: ["erp-connections", selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return await getERPConnections(selectedProfileId);
    },
    enabled: !!selectedProfileId && !!user,
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: deleteERPConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-connections", selectedProfileId] });
      toast.success("Połączenie zostało usunięte");
    },
    onError: (error) => {
      toast.error("Nie udało się usunąć połączenia");
      console.error(error);
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: testERPConnection,
    onSuccess: (success) => {
      if (success) {
        toast.success("Połączenie działa poprawnie");
        queryClient.invalidateQueries({ queryKey: ["erp-connections", selectedProfileId] });
      } else {
        toast.error("Test połączenia nie powiódł się");
      }
    },
    onError: (error) => {
      toast.error("Błąd podczas testowania połączenia");
      console.error(error);
    },
  });

  const getStatusBadge = (status: ERPConnectionStatus) => {
    switch (status) {
      case ERPConnectionStatus.CONNECTED:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Połączono
          </Badge>
        );
      case ERPConnectionStatus.CONNECTING:
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Łączenie...
          </Badge>
        );
      case ERPConnectionStatus.ERROR:
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Błąd
          </Badge>
        );
      case ERPConnectionStatus.SYNCING:
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Synchronizacja
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rozłączono
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Integracje ERP</h1>
        <p className="text-muted-foreground mt-2">
          KsięgaI działa jako warstwa uzgodnień przed KSeF — dokumenty są weryfikowane i zatwierdzane, 
          a następnie automatycznie przekazywane do Twojego systemu ERP.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Jak działa integracja z ERP
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Faktura jest uzgadniana między stronami w KsięgaI</li>
                <li>• Po akceptacji dokument jest automatycznie przekazywany do ERP</li>
                <li>• ERP zwraca status księgowania i płatności</li>
                <li>• Pełny ślad audytu pozostaje w KsięgaI</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Providers */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Dostępne systemy ERP</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(ERP_PROVIDERS).map((provider) => {
            const existingConnection = connections.find(
              (c: any) => c.provider === provider.provider
            );
            const isConnected = existingConnection?.status === ERPConnectionStatus.CONNECTED;

            return (
              <Card
                key={provider.provider}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !provider.is_available ? "opacity-60" : ""
                }`}
                onClick={() => provider.is_available && setSelectedProvider(provider.provider)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      {provider.coming_soon && (
                        <Badge variant="secondary" className="mt-2">
                          Wkrótce
                        </Badge>
                      )}
                    </div>
                    {existingConnection && getStatusBadge(existingConnection.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {provider.description}
                  </p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {provider.supports_push ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span>Wysyłanie do ERP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.supports_pull ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span>Pobieranie statusu</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.supports_webhooks ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span>Webhooks</span>
                    </div>
                  </div>
                  {provider.is_available && (
                    <div className="mt-4">
                      {isConnected ? (
                        <Button variant="outline" size="sm" className="w-full">
                          <Settings className="h-4 w-4 mr-2" />
                          Konfiguruj
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Połącz
                        </Button>
                      )}
                    </div>
                  )}
                  {provider.api_docs_url && (
                    <a
                      href={provider.api_docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Dokumentacja API
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Aktywne połączenia</h2>
          <div className="space-y-4">
            {connections.map((connection) => {
              const provider = ERP_PROVIDERS[connection.provider as ERPProvider];
              return (
                <Card key={connection.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        {getStatusBadge(connection.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Ustawienia
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(connection.id)}
                          disabled={testConnectionMutation.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                          Test połączenia
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Czy na pewno chcesz usunąć to połączenie?')) {
                              deleteConnectionMutation.mutate(connection.id);
                            }
                          }}
                          disabled={deleteConnectionMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Ostatnia synchronizacja</p>
                        <p className="font-medium">
                          {connection.last_sync_at
                            ? new Date(connection.last_sync_at).toLocaleString("pl-PL")
                            : "Nigdy"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Kierunek</p>
                        <p className="font-medium capitalize">{connection.sync_direction}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto-wysyłanie</p>
                        <p className="font-medium">
                          {connection.auto_push_after_agreement ? "Tak" : "Nie"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Błędy</p>
                        <p className="font-medium">{connection.error_count}</p>
                      </div>
                    </div>
                    {connection.last_error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <strong>Ostatni błąd:</strong> {connection.last_error}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Potrzebujesz pomocy z integracją?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Skontaktuj się z naszym zespołem, aby skonfigurować integrację z Twoim systemem ERP.
            Zapewniamy wsparcie techniczne i pomoc w konfiguracji.
          </p>
          <Button variant="outline">
            Skontaktuj się z supportem
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
