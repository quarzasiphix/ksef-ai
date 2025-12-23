import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { 
  ArrowUpCircle, ArrowDownCircle, Search, Plus, Eye, Edit,
  DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { getContractsByBusinessProfile } from '@/integrations/supabase/repositories/contractRepository';
import type { Contract } from '@/shared/types';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const TransactionalContracts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const payinSectionRef = useRef<HTMLDivElement | null>(null);
  const payoutSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadContracts = async () => {
      if (!selectedProfileId) return;
      
      setLoading(true);
      try {
        const allContracts = await getContractsByBusinessProfile(selectedProfileId);
        // Filter to only transactional contracts (money in/out)
        const transactional = allContracts.filter(c => 
          c.document_category === 'transactional_payout' || 
          c.document_category === 'transactional_payin'
        );
        setContracts(transactional);
      } catch (error) {
        console.error('Error loading contracts:', error);
        toast.error('Błąd wczytywania umów');
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, [selectedProfileId]);

  const payoutContracts = contracts.filter(c => c.document_category === 'transactional_payout');
  const payinContracts = contracts.filter(c => c.document_category === 'transactional_payin');

  const sumExpectedPln = (items: Contract[]) =>
    items.reduce((acc, c) => {
      const amount = (c as any).expected_amount ?? 0;
      const currency = (c as any).currency ?? 'PLN';
      if (currency !== 'PLN') return acc;
      return acc + (typeof amount === 'number' ? amount : 0);
    }, 0);

  const payinTotalPln = sumExpectedPln(payinContracts);
  const payoutTotalPln = sumExpectedPln(payoutContracts);

  const analyticsData = [
    { name: 'Przychody', count: payinContracts.length, amount: payinTotalPln },
    { name: 'Wydatki', count: payoutContracts.length, amount: payoutTotalPln },
  ];

  useEffect(() => {
    if (loading) return;
    const focus = searchParams.get('focus');
    if (focus === 'payin') {
      payinSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (focus === 'payout') {
      payoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, searchParams]);

  const filterBySearch = (items: Contract[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(c => 
      c.number?.toLowerCase().includes(query) ||
      c.subject?.toLowerCase().includes(query) ||
      c.content?.toLowerCase().includes(query)
    );
  };

  if (!selectedProfile) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Umowy transakcyjne</h1>
          <p className="text-muted-foreground">
            Umowy związane z przychodami i wydatkami
          </p>
        </div>
        <Button onClick={() => navigate('/contracts')}>
          <Plus className="h-4 w-4 mr-2" />
          Wszystkie dokumenty
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analizy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suma (PLN)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(payinTotalPln - payoutTotalPln).toLocaleString('pl-PL')} PLN
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                  Przychody (PLN)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{payinTotalPln.toLocaleString('pl-PL')} PLN</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-red-600" />
                  Wydatki (PLN)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{payoutTotalPln.toLocaleString('pl-PL')} PLN</div>
              </CardContent>
            </Card>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#2563eb" name="Kwota (PLN)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            W analizach uwzględniane są tylko kwoty z dokumentów z walutą PLN.
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj umów..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wszystkie umowy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-green-600" />
              Przychody
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{payinContracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-red-600" />
              Wydatki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{payoutContracts.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Payin Contracts */}
          {payinContracts.length > 0 && (
            <div ref={payinSectionRef}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                  Umowy - Przychody
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filterBySearch(payinContracts).map(contract => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{contract.subject || contract.number}</p>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Przychód
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {contract.issueDate}
                          </span>
                          {contract.expected_amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {contract.expected_amount.toLocaleString('pl-PL')} {contract.currency || 'PLN'}
                            </span>
                          )}
                          {contract.payment_frequency && (
                            <Badge variant="secondary" className="text-xs">
                              {contract.payment_frequency === 'monthly' && 'Miesięcznie'}
                              {contract.payment_frequency === 'quarterly' && 'Kwartalnie'}
                              {contract.payment_frequency === 'annual' && 'Rocznie'}
                              {contract.payment_frequency === 'one_time' && 'Jednorazowo'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/contracts/${contract.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Payout Contracts */}
          {payoutContracts.length > 0 && (
            <div ref={payoutSectionRef}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-red-600" />
                  Umowy - Wydatki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filterBySearch(payoutContracts).map(contract => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{contract.subject || contract.number}</p>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Wydatek
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {contract.issueDate}
                          </span>
                          {contract.expected_amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {contract.expected_amount.toLocaleString('pl-PL')} {contract.currency || 'PLN'}
                            </span>
                          )}
                          {contract.payment_frequency && (
                            <Badge variant="secondary" className="text-xs">
                              {contract.payment_frequency === 'monthly' && 'Miesięcznie'}
                              {contract.payment_frequency === 'quarterly' && 'Kwartalnie'}
                              {contract.payment_frequency === 'annual' && 'Rocznie'}
                              {contract.payment_frequency === 'one_time' && 'Jednorazowo'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/contracts/${contract.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Empty state */}
          {contracts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Brak umów transakcyjnych</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Umowy transakcyjne to umowy związane z przychodami lub wydatkami firmy
                </p>
                <Button onClick={() => navigate('/contracts')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj pierwszą umowę
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionalContracts;
