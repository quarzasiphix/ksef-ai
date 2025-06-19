
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { getInvoiceSharesReceived, updateInvoiceShareStatus } from "@/integrations/supabase/repositories/invoiceShareRepository";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, Check, X } from "lucide-react";

const ReceivedInvoicesTab: React.FC = () => {
  const { user } = useAuth();
  const [receivedInvoices, setReceivedInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate(share.id, 'viewed')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Oznacz jako wyświetlone
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleStatusUpdate(share.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Akceptuj
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusUpdate(share.id, 'rejected')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Odrzuć
                  </Button>
                </>
              )}
              {share.status === 'viewed' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleStatusUpdate(share.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Akceptuj
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusUpdate(share.id, 'rejected')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Odrzuć
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReceivedInvoicesTab;
