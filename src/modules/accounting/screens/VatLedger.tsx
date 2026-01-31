import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export default function VatLedger() {
  const { selectedProfileId } = useBusinessProfile();
  const { period } = useAccountingPeriod();
  const [salesVat, setSalesVat] = useState<any[]>([]);
  const [purchaseVat, setPurchaseVat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!selectedProfileId || !period?.key) return;
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Debounce the request to prevent spam
    debounceTimer.current = setTimeout(async () => {
      await loadVatData();
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [selectedProfileId, period?.key?.year, period?.key?.month]);

  const loadVatData = async () => {
      setLoading(true);
      try {
        // Calculate period boundaries
        const periodKey = period.key;
        const periodStart = new Date(periodKey.year, periodKey.month - 1, 1);
        const periodEnd = new Date(periodKey.year, periodKey.month, 0, 23, 59, 59);

        // Fetch sales invoices (income) with VAT - simplified query
        const { data: salesData, error: salesError } = await supabase
          .from('invoices')
          .select(`
            id,
            number,
            issue_date,
            total_net_value,
            total_vat_value,
            total_gross_value
          `)
          .eq('business_profile_id', selectedProfileId)
          .eq('transaction_type', 'income')
          .eq('accounting_status', 'posted')
          .gte('issue_date', periodStart.toISOString())
          .lte('issue_date', periodEnd.toISOString())
          .not('total_vat_value', 'eq', 0)
          .order('issue_date', { ascending: false });

        if (salesError) throw salesError;

        // Fetch expense invoices with VAT - simplified query
        const { data: expenseData, error: expenseError } = await supabase
          .from('invoices')
          .select(`
            id,
            number,
            issue_date,
            total_net_value,
            total_vat_value,
            total_gross_value
          `)
          .eq('business_profile_id', selectedProfileId)
          .eq('transaction_type', 'expense')
          .eq('accounting_status', 'posted')
          .gte('issue_date', periodStart.toISOString())
          .lte('issue_date', periodEnd.toISOString())
          .not('total_vat_value', 'eq', 0)
          .order('issue_date', { ascending: false });

        if (expenseError) throw expenseError;

        // Transform sales data
        const transformedSales = (salesData || []).map((invoice: any) => ({
          id: invoice.id,
          date: new Date(invoice.issue_date),
          document_number: invoice.number || 'Brak numeru',
          counterparty: 'Klient', // Simplified - no customer join
          net: invoice.total_net_value || 0,
          vat_rate: invoice.total_vat_value && invoice.total_net_value ? 
            Math.round((invoice.total_vat_value / invoice.total_net_value) * 100) : 0,
          vat_amount: invoice.total_vat_value || 0,
          gross: invoice.total_gross_value || 0,
        }));

        // Transform expense data
        const transformedExpenses = (expenseData || []).map((invoice: any) => ({
          id: invoice.id,
          date: new Date(invoice.issue_date),
          document_number: invoice.number || 'Brak numeru',
          counterparty: 'Dostawca', // Simplified - no customer join
          net: invoice.total_net_value || 0,
          vat_rate: invoice.total_vat_value && invoice.total_net_value ? 
            Math.round((invoice.total_vat_value / invoice.total_net_value) * 100) : 0,
          vat_amount: invoice.total_vat_value || 0,
          gross: invoice.total_gross_value || 0,
        }));

        setSalesVat(transformedSales);
        setPurchaseVat(transformedExpenses);
      } catch (error) {
        console.error('Error loading VAT data:', error);
      } finally {
        setLoading(false);
      }
    };

  const totalSalesVat = salesVat.reduce((sum, item) => sum + item.vat_amount, 0);
  const totalPurchaseVat = purchaseVat.reduce((sum, item) => sum + item.vat_amount, 0);
  const vatToPay = totalSalesVat - totalPurchaseVat;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ewidencja VAT</h1>
          <p className="text-muted-foreground">
            {period.label}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ładowanie danych VAT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ewidencja VAT</h1>
        <p className="text-muted-foreground">
          {period.label}
        </p>
      </div>

      {/* VAT Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VAT należny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSalesVat, 'PLN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VAT naliczony</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPurchaseVat, 'PLN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VAT do zapłaty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(vatToPay, 'PLN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT Ledger Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sprzedaż (VAT należny)</TabsTrigger>
          <TabsTrigger value="purchases">Zakupy (VAT naliczony)</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Ewidencja VAT sprzedaży</CardTitle>
              <CardDescription>Faktury sprzedaży z VAT należnym</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Numer dokumentu</TableHead>
                    <TableHead>Kontrahent</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">Stawka VAT</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesVat.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, 'dd MMM yyyy', { locale: pl })}</TableCell>
                      <TableCell className="font-medium">{item.document_number}</TableCell>
                      <TableCell>{item.counterparty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.net, 'PLN')}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.vat_rate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(item.vat_amount, 'PLN')}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.gross, 'PLN')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={5}>Razem</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(totalSalesVat, 'PLN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(salesVat.reduce((sum, item) => sum + item.gross, 0), 'PLN')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Ewidencja VAT zakupów</CardTitle>
              <CardDescription>Faktury zakupu z VAT naliczonym</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Numer dokumentu</TableHead>
                    <TableHead>Kontrahent</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">Stawka VAT</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseVat.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, 'dd MMM yyyy', { locale: pl })}</TableCell>
                      <TableCell className="font-medium">{item.document_number}</TableCell>
                      <TableCell>{item.counterparty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.net, 'PLN')}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.vat_rate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(item.vat_amount, 'PLN')}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.gross, 'PLN')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={5}>Razem</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totalPurchaseVat, 'PLN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchaseVat.reduce((sum, item) => sum + item.gross, 0), 'PLN')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
