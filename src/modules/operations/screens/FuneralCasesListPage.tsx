import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useAuth } from '@/shared/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  Plus, Search, Calendar, User, DollarSign, FileText,
  Clock, CheckCircle, Archive, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  getFuneralCases,
  getActiveFuneralCases,
  getFuneralCasesByStatus,
  getFuneralCaseStats,
} from '../data/funeralCaseRepository';
import type { FuneralCase, FuneralCaseStats } from '../types/funeralCases';
import {
  FUNERAL_SERVICE_TYPE_LABELS,
  FUNERAL_CASE_STATUS_LABELS,
} from '../types/funeralCases';

const FuneralCasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProjectId } = useProjectScope();
  const { user } = useAuth();
  const [cases, setCases] = useState<FuneralCase[]>([]);
  const [stats, setStats] = useState<FuneralCaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('active');

  useEffect(() => {
    if (selectedProfileId) {
      loadData();
    }
  }, [selectedProfileId, selectedProjectId, activeTab]);

  const loadData = async () => {
    if (!selectedProfileId) return;

    try {
      setLoading(true);
      
      const [casesData, statsData] = await Promise.all([
        loadCasesByTab(activeTab),
        getFuneralCaseStats(selectedProfileId, selectedProjectId),
      ]);

      setCases(casesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading funeral cases:', error);
      toast.error('Błąd podczas ładowania spraw pogrzebowych');
    } finally {
      setLoading(false);
    }
  };

  const loadCasesByTab = async (tab: string): Promise<FuneralCase[]> => {
    if (!selectedProfileId) return [];

    switch (tab) {
      case 'active':
        return getActiveFuneralCases(selectedProfileId, selectedProjectId);
      case 'scheduled':
        return getFuneralCasesByStatus(selectedProfileId, 'scheduled', selectedProjectId);
      case 'in_progress':
        return getFuneralCasesByStatus(selectedProfileId, 'in_progress', selectedProjectId);
      case 'completed':
        return getFuneralCasesByStatus(selectedProfileId, 'completed', selectedProjectId);
      case 'settled':
        return getFuneralCasesByStatus(selectedProfileId, 'settled', selectedProjectId);
      case 'all':
      default:
        return getFuneralCases(selectedProfileId, selectedProjectId);
    }
  };

  const handleCreateCase = () => {
    navigate('/operations/funeral-cases/new');
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/operations/funeral-cases/${caseId}`);
  };

  const filteredCases = cases.filter((case_) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      case_.case_number.toLowerCase().includes(query) ||
      case_.deceased.first_name?.toLowerCase().includes(query) ||
      case_.deceased.last_name?.toLowerCase().includes(query) ||
      case_.client.name?.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'settled': return 'bg-emerald-100 text-emerald-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sprawy pogrzebowe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj sprawami pogrzebowymi od zgłoszenia do rozliczenia
          </p>
        </div>
        <Button onClick={handleCreateCase}>
          <Plus className="mr-2 h-4 w-4" />
          Nowa sprawa
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktywne sprawy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_cases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                W trakcie realizacji
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zaplanowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled_cases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Z ustalonym terminem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zakończone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_cases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Do rozliczenia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Przychód
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pl-PL', {
                  style: 'currency',
                  currency: 'PLN',
                  minimumFractionDigits: 0,
                }).format(stats.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Łączna wartość spraw
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po numerze sprawy, nazwisku zmarłego lub zleceniodawcy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Aktywne</TabsTrigger>
          <TabsTrigger value="scheduled">Zaplanowane</TabsTrigger>
          <TabsTrigger value="in_progress">W trakcie</TabsTrigger>
          <TabsTrigger value="completed">Zakończone</TabsTrigger>
          <TabsTrigger value="settled">Rozliczone</TabsTrigger>
          <TabsTrigger value="all">Wszystkie</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Ładowanie...</p>
              </CardContent>
            </Card>
          ) : filteredCases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Brak spraw</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Nie znaleziono spraw pasujących do wyszukiwania'
                    : 'Nie ma jeszcze żadnych spraw pogrzebowych'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateCase}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pierwszą sprawę
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCases.map((case_) => (
                <Card
                  key={case_.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewCase(case_.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-lg">
                            {case_.case_number}
                          </span>
                          <Badge className={getStatusColor(case_.status)}>
                            {FUNERAL_CASE_STATUS_LABELS[case_.status]}
                          </Badge>
                          <Badge variant="outline">
                            {FUNERAL_SERVICE_TYPE_LABELS[case_.service_type]}
                          </Badge>
                        </div>

                        {/* Deceased Info */}
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {case_.deceased.first_name} {case_.deceased.last_name}
                          </span>
                          <span className="text-muted-foreground">
                            • {format(new Date(case_.deceased.date_of_death), 'dd.MM.yyyy', { locale: pl })}
                          </span>
                        </div>

                        {/* Client Info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <span>Zleceniodawca: {case_.client.name}</span>
                          {case_.client.phone && (
                            <span>• {case_.client.phone}</span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {case_.ceremony_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Ceremonia</p>
                                <p className="font-medium">
                                  {format(new Date(case_.ceremony_date), 'dd.MM.yyyy', { locale: pl })}
                                  {case_.ceremony_time && ` ${case_.ceremony_time}`}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Wartość</p>
                              <p className="font-medium">
                                {new Intl.NumberFormat('pl-PL', {
                                  style: 'currency',
                                  currency: 'PLN',
                                }).format((case_.payment as any)?.total_amount || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Utworzono</p>
                              <p className="font-medium">
                                {format(new Date(case_.created_at), 'dd.MM.yyyy', { locale: pl })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FuneralCasesListPage;
