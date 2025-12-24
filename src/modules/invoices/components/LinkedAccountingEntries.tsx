import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface LinkedAccountingEntriesProps {
  invoiceId: string;
  businessProfileId: string;
}

interface KasaDocument {
  id: string;
  document_number: string;
  type: 'KP' | 'KW';
  amount: number;
  currency: string;
  payment_date: string;
  accounting_origin: string;
  is_approved: boolean;
  created_at: string;
  payment_accounts?: {
    name: string;
  };
}

const LinkedAccountingEntries: React.FC<LinkedAccountingEntriesProps> = ({
  invoiceId,
  businessProfileId,
}) => {
  const navigate = useNavigate();

  const { data: kasaDocuments, isLoading } = useQuery({
    queryKey: ['linked-kasa-documents', invoiceId],
    queryFn: async () => {
      console.log('[LinkedAccountingEntries] Querying for invoice:', invoiceId);
      
      const { data, error } = await supabase
        .from('kasa_documents')
        .select(`
          *,
          payment_accounts(name)
        `)
        .eq('source_invoice_id', invoiceId)
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false });

      console.log('[LinkedAccountingEntries] Query result:', { data, error });
      
      if (error) {
        console.error('[LinkedAccountingEntries] Query error:', error);
        throw error;
      }
      return data as KasaDocument[];
    },
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Powiązane zapisy księgowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (!kasaDocuments || kasaDocuments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-600" />
          Powiązane zapisy księgowe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kasaDocuments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-blue-600"
                  onClick={() => navigate('/accounting/kasa')}
                >
                  {doc.document_number}
                </Button>
                <Badge
                  variant="outline"
                  className={
                    doc.type === 'KP'
                      ? 'text-green-600 border-green-600'
                      : 'text-orange-600 border-orange-600'
                  }
                >
                  {doc.type}
                </Badge>
                {doc.accounting_origin === 'invoice_auto' && (
                  <Badge variant="secondary" className="text-xs">
                    AUTO
                  </Badge>
                )}
                {doc.is_approved && (
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                    Zatwierdzone
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Kasa: {doc.payment_accounts?.name || 'Nieznana'}
              </div>
              <div className="text-xs text-muted-foreground">
                Data księgowania: {format(new Date(doc.payment_date), 'dd.MM.yyyy', { locale: pl })}
                {doc.accounting_origin === 'invoice_auto' && (
                  <span className="ml-2 italic">
                    (Utworzone automatycznie z faktury)
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg">
                {doc.type === 'KP' ? '+' : '-'}
                {formatCurrency(doc.amount, doc.currency)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/accounting/kasa')}
                className="mt-1"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Otwórz
              </Button>
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-100">
            💡 Te zapisy księgowe zostały automatycznie utworzone podczas wystawiania faktury.
            Każdy zapis jest powiązany z kasą i aktualizuje saldo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkedAccountingEntries;
