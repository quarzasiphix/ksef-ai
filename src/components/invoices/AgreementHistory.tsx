import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare, Edit, Send } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface AgreementHistoryEntry {
  id: string;
  invoice_id: string;
  user_id: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

interface AgreementHistoryProps {
  invoiceId: string;
}

const statusLabels: Record<string, string> = {
  draft: "Wersja robocza",
  sent: "Wysłano",
  received: "Otrzymano",
  under_discussion: "W trakcie uzgodnień",
  correction_needed: "Wymaga korekty",
  approved: "Uzgodniono",
  ready_for_ksef: "Gotowe do księgowania",
  rejected: "Odrzucono",
  cancelled: "Anulowano"
};

const actionLabels: Record<string, string> = {
  sent: "Wysłano dokument",
  received: "Otrzymano dokument",
  discussed: "Rozpoczęto uzgodnienia",
  approved: "Uzgodniono i zablokowano",
  rejected: "Odrzucono",
  corrected: "Zgłoszono potrzebę korekty",
  cancelled: "Anulowano"
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft':
      return <FileText className="h-4 w-4 text-gray-500" />;
    case 'sent':
      return <Send className="h-4 w-4 text-blue-500" />;
    case 'received':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'under_discussion':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'correction_needed':
      return <Edit className="h-4 w-4 text-orange-600" />;
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'ready_for_ksef':
      return <CheckCircle2 className="h-4 w-4 text-green-700" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'cancelled':
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
    case 'ready_for_ksef':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'correction_needed':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'under_discussion':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'sent':
    case 'received':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export function AgreementHistory({ invoiceId }: AgreementHistoryProps) {
  const { data: history = [], isLoading } = useQuery<AgreementHistoryEntry[]>({
    queryKey: ['agreement-history', invoiceId],
    queryFn: async () => {
      // TODO: Implement actual API call
      // For now, return empty array
      return [];
    },
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historia uzgodnienia dokumentu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Historia uzgodnienia dokumentu
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pełny ślad audytu wszystkich działań i zmian statusu dokumentu
        </p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak historii uzgodnień</p>
            <p className="text-sm">Historia pojawi się po pierwszej zmianie statusu</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative pl-8 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -translate-x-[9px] bg-white dark:bg-gray-950 p-1">
                    {getStatusIcon(entry.new_status)}
                  </div>

                  {/* Entry content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(entry.new_status)}>
                            {statusLabels[entry.new_status] || entry.new_status}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Aktualny
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {actionLabels[entry.action] || entry.action}
                        </p>
                        {entry.previous_status && (
                          <p className="text-xs text-muted-foreground">
                            z: {statusLabels[entry.previous_status] || entry.previous_status}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "d MMM yyyy", { locale: pl })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>

                    {entry.comment && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
                        <p className="text-muted-foreground mb-1 text-xs font-medium">
                          Komentarz:
                        </p>
                        <p className="text-gray-900 dark:text-gray-100">{entry.comment}</p>
                      </div>
                    )}

                    {entry.user_name && (
                      <p className="text-xs text-muted-foreground">
                        przez: {entry.user_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Legal notice */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>Wartość prawna:</strong> Historia uzgodnień stanowi niezmienialny ślad audytu
              wszystkich działań związanych z dokumentem. Wszystkie wpisy są trwale zapisywane
              i nie mogą być usunięte ani zmodyfikowane.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
