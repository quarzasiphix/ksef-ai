import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function VatLedger() {
  const { selectedProfileId } = useBusinessProfile();
  const { period } = useAccountingPeriod();

  // Mock data - replace with actual data fetching
  const [salesVat] = useState([
    {
      id: '1',
      date: new Date('2026-01-15'),
      document_number: 'F/1/2026',
      counterparty: 'ABC Sp. z o.o.',
      net: 10000,
      vat_rate: 23,
      vat_amount: 2300,
      gross: 12300,
    },
    {
      id: '2',
      date: new Date('2026-01-20'),
      document_number: 'F/2/2026',
      counterparty: 'XYZ S.A.',
      net: 5000,
      vat_rate: 23,
      vat_amount: 1150,
      gross: 6150,
    },
  ]);

  const [purchaseVat] = useState([
    {
      id: '1',
      date: new Date('2026-01-10'),
      document_number: 'FZ/123/2026',
      counterparty: 'Dostawca Sp. z o.o.',
      net: 3000,
      vat_rate: 23,
      vat_amount: 690,
      gross: 3690,
    },
  ]);

  const totalSalesVat = salesVat.reduce((sum, item) => sum + item.vat_amount, 0);
  const totalPurchaseVat = purchaseVat.reduce((sum, item) => sum + item.vat_amount, 0);
  const vatToPay = totalSalesVat - totalPurchaseVat;

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
