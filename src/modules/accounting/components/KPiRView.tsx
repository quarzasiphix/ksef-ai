import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface KPiRViewProps {
  businessProfileId: string;
  isRyczalt: boolean;
}

interface RegisterLine {
  id: string;
  occurred_at: string;
  document_number: string;
  counterparty_name: string;
  tax_base_amount: number;
  ryczalt_rate: number;
  ryczalt_tax_amount: number;
  category_name: string;
}

export function KPiRView({ businessProfileId, isRyczalt }: KPiRViewProps) {
  const [lines, setLines] = useState<RegisterLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadRegisterLines();
  }, [businessProfileId, year]);

  const loadRegisterLines = async () => {
    setLoading(true);
    try {
      if (isRyczalt) {
        // Load from JDG revenue register
        const { data, error } = await supabase
          .from('jdg_revenue_register_lines')
          .select('*')
          .eq('business_profile_id', businessProfileId)
          .eq('period_year', year)
          .order('occurred_at', { ascending: true });

        if (error) throw error;
        setLines(data || []);
      } else {
        // For skala/liniowy: load from invoices (simplified)
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('business_profile_id', businessProfileId)
          .eq('transaction_type', 'income')
          .gte('issue_date', `${year}-01-01`)
          .lte('issue_date', `${year}-12-31`)
          .order('issue_date', { ascending: true });

        if (error) throw error;
        
        // Transform to register line format
        const transformed = (data || []).map(inv => ({
          id: inv.id,
          occurred_at: inv.issue_date,
          document_number: inv.invoice_number || 'Draft',
          counterparty_name: (inv as any).customers?.[0]?.name || 'Nieznany',
          tax_base_amount: inv.total_gross_value || 0,
          ryczalt_rate: 0,
          ryczalt_tax_amount: 0,
          category_name: 'Przychód'
        }));
        setLines(transformed);
      }
    } catch (error) {
      console.error('Error loading register lines:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by ryczałt rate for proper separation
  const linesByRate = isRyczalt ? lines.reduce((acc, line) => {
    const rate = line.ryczalt_rate || 0;
    if (!acc[rate]) {
      acc[rate] = [];
    }
    acc[rate].push(line);
    return acc;
  }, {} as Record<number, RegisterLine[]>) : {};

  const totalRevenue = lines.reduce((sum, line) => sum + line.tax_base_amount, 0);
  const totalTax = lines.reduce((sum, line) => sum + line.ryczalt_tax_amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isRyczalt ? 'Ewidencja przychodów' : 'Księga Przychodów i Rozchodów'}
            </CardTitle>
            <CardDescription>
              Rok {year} • {lines.length} wpisów
              {isRyczalt && Object.keys(linesByRate).length > 0 && ` • ${Object.keys(linesByRate).length} stawek ryczałtu`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtruj
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Eksport
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary - Overall */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Przychód ogółem</p>
            <p className="text-2xl font-bold">{totalRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</p>
          </div>
          {isRyczalt && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Podatek ryczałt</p>
                <p className="text-2xl font-bold">{totalTax.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Do wypłaty</p>
                <p className="text-2xl font-bold">{(totalRevenue - totalTax).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</p>
              </div>
            </>
          )}
        </div>

        {/* Ryczałt: Summary by Rate */}
        {isRyczalt && Object.keys(linesByRate).length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Podział według stawek ryczałtu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(linesByRate).map(([rate, rateLines]) => {
                const rateRevenue = rateLines.reduce((sum, line) => sum + line.tax_base_amount, 0);
                const rateTax = rateLines.reduce((sum, line) => sum + line.ryczalt_tax_amount, 0);
                return (
                  <div key={rate} className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Stawka {rate}%</span>
                      <span className="text-xs text-muted-foreground">{rateLines.length} wpis(ów)</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Przychód:</span>
                        <span className="font-medium">{rateRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Podatek:</span>
                        <span className="font-medium text-red-600">{rateTax.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table - Grouped by Rate for Ryczałt */}
        {isRyczalt && Object.keys(linesByRate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(linesByRate).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([rate, rateLines]) => (
              <div key={rate} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-semibold text-sm flex items-center justify-between">
                  <span>Stawka ryczałtu: {rate}%</span>
                  <span className="text-xs text-muted-foreground">{rateLines.length} dokumentów</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 text-xs font-medium">LP</th>
                        <th className="text-left p-2 text-xs font-medium">Data</th>
                        <th className="text-left p-2 text-xs font-medium">Dokument</th>
                        <th className="text-left p-2 text-xs font-medium">Kontrahent</th>
                        <th className="text-left p-2 text-xs font-medium">Kategoria</th>
                        <th className="text-right p-2 text-xs font-medium">Przychód</th>
                        <th className="text-right p-2 text-xs font-medium">Podatek ({rate}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateLines.map((line, index) => (
                        <tr key={line.id} className="border-b hover:bg-muted/30">
                          <td className="p-2 text-sm">{index + 1}</td>
                          <td className="p-2 text-sm">
                            {format(new Date(line.occurred_at), 'dd.MM.yyyy', { locale: pl })}
                          </td>
                          <td className="p-2 text-sm">{line.document_number}</td>
                          <td className="p-2 text-sm">{line.counterparty_name}</td>
                          <td className="p-2 text-sm">{line.category_name || '-'}</td>
                          <td className="p-2 text-sm text-right font-medium">
                            {line.tax_base_amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-sm text-right text-red-600 font-medium">
                            {line.ryczalt_tax_amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td colSpan={5} className="p-2 text-sm text-right">Suma dla stawki {rate}%:</td>
                        <td className="p-2 text-sm text-right">
                          {rateLines.reduce((sum, line) => sum + line.tax_base_amount, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-sm text-right text-red-600">
                          {rateLines.reduce((sum, line) => sum + line.ryczalt_tax_amount, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard table for non-ryczałt or empty */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">LP</th>
                  <th className="text-left p-2 text-sm font-medium">Data</th>
                  <th className="text-left p-2 text-sm font-medium">Dokument</th>
                  <th className="text-left p-2 text-sm font-medium">Kontrahent</th>
                  <th className="text-right p-2 text-sm font-medium">Przychód</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      Ładowanie...
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      Brak wpisów w ewidencji za {year} rok
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr key={line.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">{index + 1}</td>
                      <td className="p-2 text-sm">
                        {format(new Date(line.occurred_at), 'dd.MM.yyyy', { locale: pl })}
                      </td>
                      <td className="p-2 text-sm">{line.document_number}</td>
                      <td className="p-2 text-sm">{line.counterparty_name}</td>
                      <td className="p-2 text-sm text-right font-medium">
                        {line.tax_base_amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
