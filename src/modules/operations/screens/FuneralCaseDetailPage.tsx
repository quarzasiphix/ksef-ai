import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  ArrowLeft, User, Calendar, MapPin, DollarSign, FileText,
  Clock, CheckCircle, Upload, Edit, Save, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  getFuneralCaseById,
  updateFuneralCase,
  getFuneralStages,
  updateFuneralStage,
  getFuneralDocuments,
  createFuneralDocument,
} from '../data/funeralCaseRepository';
import type {
  FuneralCaseWithRelations,
  FuneralStage,
  FuneralDocument,
  FuneralCaseStatus,
  FuneralStageStatus,
  FuneralDocumentType,
} from '../types/funeralCases';
import {
  FUNERAL_SERVICE_TYPE_LABELS,
  FUNERAL_CASE_STATUS_LABELS,
  FUNERAL_STAGE_TYPE_LABELS,
  FUNERAL_DOCUMENT_TYPE_LABELS,
  ZUS_SETTLEMENT_STATUS_LABELS,
} from '../types/funeralCases';

const FuneralCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [funeralCase, setFuneralCase] = useState<FuneralCaseWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadFuneralCase();
    }
  }, [id]);

  const loadFuneralCase = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getFuneralCaseById(id);
      setFuneralCase(data);
    } catch (error) {
      console.error('Error loading funeral case:', error);
      toast.error('Błąd podczas ładowania sprawy');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: FuneralCaseStatus) => {
    if (!id) return;

    try {
      await updateFuneralCase(id, { status: newStatus });
      toast.success('Status zaktualizowany');
      loadFuneralCase();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Błąd podczas aktualizacji statusu');
    }
  };

  const handleUpdateStage = async (stageId: string, status: FuneralStageStatus) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_date = new Date().toISOString();
      }
      await updateFuneralStage(stageId, updates);
      toast.success('Etap zaktualizowany');
      loadFuneralCase();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Błąd podczas aktualizacji etapu');
    }
  };

  const handleUpdatePayment = async (field: string, value: any) => {
    if (!id || !funeralCase) return;

    try {
      const currentPayment = funeralCase.payment as any;
      const updatedPayment = { ...currentPayment, [field]: value };
      
      await updateFuneralCase(id, { payment: updatedPayment });
      toast.success('Płatność zaktualizowana');
      loadFuneralCase();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Błąd podczas aktualizacji płatności');
    }
  };

  const handleUpdateZUS = async (field: string, value: any) => {
    if (!id || !funeralCase) return;

    try {
      const currentZUS = (funeralCase.zus_settlement as any) || {};
      const updatedZUS = { ...currentZUS, [field]: value };
      
      await updateFuneralCase(id, { zus_settlement: updatedZUS });
      toast.success('Rozliczenie ZUS zaktualizowane');
      loadFuneralCase();
    } catch (error) {
      console.error('Error updating ZUS:', error);
      toast.error('Błąd podczas aktualizacji ZUS');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!funeralCase) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Nie znaleziono sprawy</p>
      </div>
    );
  }

  const payment = funeralCase.payment as any;
  const zusSettlement = funeralCase.zus_settlement as any;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/operations/funeral-cases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{funeralCase.case_number}</h1>
              <Badge className={getStatusColor(funeralCase.status)}>
                {FUNERAL_CASE_STATUS_LABELS[funeralCase.status]}
              </Badge>
              <Badge variant="outline">
                {FUNERAL_SERVICE_TYPE_LABELS[funeralCase.service_type]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {funeralCase.deceased.first_name} {funeralCase.deceased.last_name} • 
              {format(new Date(funeralCase.deceased.date_of_death), ' dd MMMM yyyy', { locale: pl })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={funeralCase.status} onValueChange={(value: FuneralCaseStatus) => handleUpdateStatus(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FUNERAL_CASE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Zleceniodawca</p>
                <p className="font-medium">{funeralCase.client.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ceremonia</p>
                <p className="font-medium">
                  {funeralCase.ceremony_date
                    ? format(new Date(funeralCase.ceremony_date), 'dd.MM.yyyy', { locale: pl })
                    : 'Nie ustalono'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Wartość</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(payment?.total_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Dokumenty</p>
                <p className="font-medium">{funeralCase.documents?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="timeline">Harmonogram</TabsTrigger>
          <TabsTrigger value="documents">Dokumenty</TabsTrigger>
          <TabsTrigger value="payments">Rozliczenia</TabsTrigger>
          <TabsTrigger value="zus">ZUS</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Dane zmarłego</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                  <p className="font-medium">
                    {funeralCase.deceased.first_name} {funeralCase.deceased.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data zgonu</p>
                  <p className="font-medium">
                    {format(new Date(funeralCase.deceased.date_of_death), 'dd MMMM yyyy', { locale: pl })}
                  </p>
                </div>
                {funeralCase.deceased.place_of_death && (
                  <div>
                    <p className="text-sm text-muted-foreground">Miejsce zgonu</p>
                    <p className="font-medium">{funeralCase.deceased.place_of_death}</p>
                  </div>
                )}
                {funeralCase.deceased.pesel && (
                  <div>
                    <p className="text-sm text-muted-foreground">PESEL</p>
                    <p className="font-medium">{funeralCase.deceased.pesel}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zleceniodawca</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                  <p className="font-medium">{funeralCase.client.name}</p>
                </div>
                {funeralCase.client.relationship && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pokrewieństwo</p>
                    <p className="font-medium">{funeralCase.client.relationship}</p>
                  </div>
                )}
                {funeralCase.client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium">{funeralCase.client.phone}</p>
                  </div>
                )}
                {funeralCase.client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{funeralCase.client.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Szczegóły ceremonii</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {funeralCase.ceremony_location && (
                <div>
                  <p className="text-sm text-muted-foreground">Miejsce ceremonii</p>
                  <p className="font-medium">{funeralCase.ceremony_location}</p>
                </div>
              )}
              {funeralCase.burial_location && (
                <div>
                  <p className="text-sm text-muted-foreground">Miejsce pochówku</p>
                  <p className="font-medium">{funeralCase.burial_location}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-3">
          {funeralCase.stages && funeralCase.stages.length > 0 ? (
            funeralCase.stages.map((stage) => (
              <Card key={stage.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {stage.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{FUNERAL_STAGE_TYPE_LABELS[stage.stage_type]}</p>
                        {stage.scheduled_date && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(stage.scheduled_date), 'dd.MM.yyyy', { locale: pl })}
                            {stage.scheduled_time && ` ${stage.scheduled_time}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Select
                      value={stage.status}
                      onValueChange={(value: FuneralStageStatus) => handleUpdateStage(stage.id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Oczekujący</SelectItem>
                        <SelectItem value="scheduled">Zaplanowany</SelectItem>
                        <SelectItem value="in_progress">W trakcie</SelectItem>
                        <SelectItem value="completed">Zakończony</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Brak etapów</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-3">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Dokumenty sprawy</h3>
              <p className="text-muted-foreground mb-4">
                Zarządzaj dokumentami powiązanymi ze sprawą pogrzebową
              </p>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Dodaj dokument
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Płatności od klienta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Zaliczka (PLN)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payment?.advance_amount || 0}
                    onChange={(e) => handleUpdatePayment('advance_amount', parseFloat(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant={payment?.advance_paid ? 'default' : 'outline'}
                    onClick={() => handleUpdatePayment('advance_paid', !payment?.advance_paid)}
                  >
                    {payment?.advance_paid ? 'Wpłacono' : 'Nie wpłacono'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Kwota końcowa (PLN)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={payment?.final_amount || 0}
                    onChange={(e) => handleUpdatePayment('final_amount', parseFloat(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant={payment?.final_paid ? 'default' : 'outline'}
                    onClick={() => handleUpdatePayment('final_paid', !payment?.final_paid)}
                  >
                    {payment?.final_paid ? 'Rozliczono' : 'Do rozliczenia'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZUS Tab */}
        <TabsContent value="zus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rozliczenie ZUS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={zusSettlement?.status || 'not_applicable'}
                  onValueChange={(value) => handleUpdateZUS('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ZUS_SETTLEMENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Numer wniosku</label>
                <Input
                  value={zusSettlement?.application_number || ''}
                  onChange={(e) => handleUpdateZUS('application_number', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Kwota zasiłku (PLN)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={zusSettlement?.amount || 0}
                  onChange={(e) => handleUpdateZUS('amount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data złożenia</label>
                <Input
                  type="date"
                  value={zusSettlement?.submitted_date || ''}
                  onChange={(e) => handleUpdateZUS('submitted_date', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data wypłaty</label>
                <Input
                  type="date"
                  value={zusSettlement?.paid_date || ''}
                  onChange={(e) => handleUpdateZUS('paid_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'scheduled': return 'bg-purple-100 text-purple-800';
    case 'in_progress': return 'bg-orange-100 text-orange-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'settled': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default FuneralCaseDetailPage;
