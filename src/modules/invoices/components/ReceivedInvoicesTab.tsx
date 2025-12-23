
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { getInvoiceSharesReceived, updateInvoiceShareStatus } from "@/integrations/supabase/repositories/invoiceShareRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";
import { Eye, Check, X, LayoutGrid, List } from "lucide-react";

const ReceivedInvoicesTab: React.FC = () => {
  const { user } = useAuth();
  const [receivedInvoices, setReceivedInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (user?.id) {
      loadReceivedInvoices();
    }
  }, [user?.id]);

  const loadReceivedInvoices = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const data = await getInvoiceSharesReceived(user.id);
      setReceivedInvoices(data);
    } catch (error) {
      console.error("Error loading received invoices:", error);
      toast.error("Nie udało się załadować otrzymanych faktur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (shareId: string, status: 'viewed' | 'accepted' | 'rejected') => {
    if (!user?.id) return;

    try {
      await updateInvoiceShareStatus(shareId, status, user.id);
      await loadReceivedInvoices(); // Refresh the list
      
      if (status === 'accepted') {
        toast.success("Faktura została zaakceptowana");
      } else if (status === 'rejected') {
        toast.success("Faktura została odrzucona");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Nie udało się zaktualizować statusu");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary">Wysłane</Badge>;
      case 'viewed':
        return <Badge variant="outline">Wyświetlone</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Zaakceptowane</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Odrzucone</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Ładowanie otrzymanych faktur...</div>;
  }

  if (receivedInvoices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Brak otrzymanych faktur</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            className={`px-2 py-1 text-sm flex items-center gap-1 ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setViewMode('grid')}
            aria-label="Widok siatki"
            title="Widok siatki"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Siatka</span>
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm flex items-center gap-1 border-l ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setViewMode('list')}
            aria-label="Widok listy"
            title="Widok listy"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {receivedInvoices.map((share) => (
            <Card key={share.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Faktura {share.invoices?.number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Od: {share.invoices?.business_profiles?.name} (NIP: {share.invoices?.business_profiles?.tax_id})
                    </p>
                  </div>
                  {getStatusBadge(share.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Data wystawienia</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(share.invoices?.issue_date), "dd.MM.yyyy", { locale: pl })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kwota</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(share.invoices?.total_gross_value || 0)}
                    </p>
                  </div>
                </div>
                {share.notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Notatka</p>
                    <p className="text-sm text-muted-foreground">{share.notes}</p>
                  </div>
                )}
                <div className="flex space-x-2">
                  {share.status === 'sent' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(share.id, 'viewed')}>
                        <Eye className="h-4 w-4 mr-2" /> Oznacz jako wyświetlone
                      </Button>
                      <Button size="sm" variant="default" onClick={() => handleStatusUpdate(share.id, 'accepted')}>
                        <Check className="h-4 w-4 mr-2" /> Akceptuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(share.id, 'rejected')}>
                        <X className="h-4 w-4 mr-2" /> Odrzuć
                      </Button>
                    </>
                  )}
                  {share.status === 'viewed' && (
                    <>
                      <Button size="sm" variant="default" onClick={() => handleStatusUpdate(share.id, 'accepted')}>
                        <Check className="h-4 w-4 mr-2" /> Akceptuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(share.id, 'rejected')}>
                        <X className="h-4 w-4 mr-2" /> Odrzuć
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="divide-y">
            {receivedInvoices.map((share) => (
              <div key={share.id} className="px-4 py-3 hover:bg-muted">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">Faktura {share.invoices?.number}</span>
                      {getStatusBadge(share.status)}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground truncate">
                      Od: {share.invoices?.business_profiles?.name} (NIP: {share.invoices?.business_profiles?.tax_id})
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm whitespace-nowrap">
                    <span className="text-muted-foreground">{format(new Date(share.invoices?.issue_date), "dd.MM.yyyy", { locale: pl })}</span>
                    <span className="font-medium">{formatCurrency(share.invoices?.total_gross_value || 0)}</span>
                  </div>
                </div>
                {share.notes && (
                  <div className="mt-2 text-xs text-muted-foreground truncate">{share.notes}</div>
                )}
                <div className="mt-2 flex gap-2">
                  {share.status === 'sent' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(share.id, 'viewed')}>
                        <Eye className="h-4 w-4 mr-2" /> Oznacz jako wyświetlone
                      </Button>
                      <Button size="sm" variant="default" onClick={() => handleStatusUpdate(share.id, 'accepted')}>
                        <Check className="h-4 w-4 mr-2" /> Akceptuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(share.id, 'rejected')}>
                        <X className="h-4 w-4 mr-2" /> Odrzuć
                      </Button>
                    </>
                  )}
                  {share.status === 'viewed' && (
                    <>
                      <Button size="sm" variant="default" onClick={() => handleStatusUpdate(share.id, 'accepted')}>
                        <Check className="h-4 w-4 mr-2" /> Akceptuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(share.id, 'rejected')}>
                        <X className="h-4 w-4 mr-2" /> Odrzuć
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivedInvoicesTab;
