import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle, Clock, Menu, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getResolutions, saveResolution, updateResolution } from '@/integrations/supabase/repositories/spolkaRepository';
import type { Resolution, ResolutionType, ResolutionStatus } from '@/types/spolka';
import { getResolutionTypeLabel } from '@/types/spolka';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

const Resolutions = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingNavigationTo, setPendingNavigationTo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    resolution_number: '',
    resolution_type: 'other' as ResolutionType,
    resolution_date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    fiscal_year: new Date().getFullYear(),
    amount: '',
    status: 'draft' as ResolutionStatus,
  });

  const loadResolutions = async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      const data = await getResolutions(selectedProfileId);
      setResolutions(data);
    } catch (error) {
      console.error('Error loading resolutions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResolutions();
  }, [selectedProfileId]);

  const safeNavigate = (to: string) => {
    const hadOverlaysOpen = mobileSidebarOpen || dialogOpen;

    flushSync(() => {
      setMobileSidebarOpen(false);
      setDialogOpen(false);
    });

    if (!hadOverlaysOpen) {
      navigate(to);
      return;
    }

    setPendingNavigationTo(to);
  };

  useEffect(() => {
    if (!pendingNavigationTo) return;

    const to = pendingNavigationTo;
    setPendingNavigationTo(null);

    const t = window.setTimeout(() => {
      navigate(to);
    }, 900);

    return () => window.clearTimeout(t);
  }, [navigate, pendingNavigationTo]);

  const handleSave = async () => {
    if (!selectedProfileId || !formData.resolution_number || !formData.title) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    setSaving(true);
    try {
      await saveResolution({
        business_profile_id: selectedProfileId,
        resolution_number: formData.resolution_number,
        resolution_type: formData.resolution_type,
        resolution_date: formData.resolution_date,
        title: formData.title,
        content: formData.content || undefined,
        fiscal_year: formData.fiscal_year,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        status: formData.status,
      });

      toast.success('Uchwała zapisana');
      loadResolutions();
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        resolution_number: '',
        resolution_type: 'other',
        resolution_date: new Date().toISOString().split('T')[0],
        title: '',
        content: '',
        fiscal_year: new Date().getFullYear(),
        amount: '',
        status: 'draft',
      });
    } catch (error) {
      console.error('Error saving resolution:', error);
      toast.error('Błąd zapisu uchwały');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ResolutionStatus) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'adopted') {
        updates.adopted_at = new Date().toISOString();
      } else if (newStatus === 'executed') {
        updates.executed_at = new Date().toISOString();
      }

      await updateResolution(id, updates);
      toast.success('Status zaktualizowany');
      loadResolutions();
    } catch (error) {
      console.error('Error updating resolution status:', error);
      toast.error('Błąd aktualizacji statusu');
    }
  };

  const getStatusBadge = (status: ResolutionStatus) => {
    const variants: Record<ResolutionStatus, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Szkic' },
      adopted: { variant: 'default', label: 'Przyjęta' },
      executed: { variant: 'outline', label: 'Wykonana' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="h-full bg-muted/30 p-2 overflow-y-auto">
      <div className="mb-2">
        <h2 className="font-semibold text-base mb-2">Dokumenty</h2>
        <Button
          onClick={() => {
            onNavigate?.();
            safeNavigate('/contracts/new');
          }}
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nowy dokument
        </Button>
      </div>

      <div className="space-y-1 mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.();
            safeNavigate('/contracts');
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          Dokumenty
        </Button>

        <div className="pt-2 pb-1">
          <p className="text-xs font-semibold text-muted-foreground px-2">INFORMACYJNE</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.();
          }}
        >
          <FileCheck className="h-4 w-4 mr-2" />
          Uchwały
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="hidden md:block w-64 border-r">
          <SidebarContent />
        </div>

        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Dokumenty</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 pb-20 px-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="md:hidden">
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Menu dokumentów</span>
                    </Button>
                  </SheetTrigger>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Uchwały</h1>
                  <p className="text-muted-foreground text-sm">
                    Zarządzaj uchwałami wspólników i zarządu
                  </p>
                </div>
              </div>

              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj uchwałę
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista uchwał</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
                ) : resolutions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak uchwał</p>
                    <p className="text-sm mt-2">Dodaj pierwszą uchwałę klikając przycisk powyżej</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resolutions.map((resolution) => (
                      <div
                        key={resolution.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{resolution.resolution_number}</span>
                            {getStatusBadge(resolution.status)}
                            <Badge variant="outline" className="text-xs">
                              {getResolutionTypeLabel(resolution.resolution_type)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold mb-1">{resolution.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Data: {format(new Date(resolution.resolution_date), 'dd MMMM yyyy', { locale: pl })}
                            {resolution.fiscal_year && ` • Rok obrotowy: ${resolution.fiscal_year}`}
                          </p>
                          {resolution.content && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {resolution.content}
                            </p>
                          )}
                          {resolution.amount && (
                            <p className="text-sm font-medium mt-2">
                              Kwota: {resolution.amount.toLocaleString('pl-PL')} PLN
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {resolution.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(resolution.id, 'adopted')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Przyjmij
                            </Button>
                          )}
                          {resolution.status === 'adopted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(resolution.id, 'executed')}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Wykonaj
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Dodaj uchwałę</DialogTitle>
                  <DialogDescription>
                    Zarejestruj uchwałę wspólników lub zarządu
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resolution_number">Numer uchwały *</Label>
                      <Input
                        id="resolution_number"
                        value={formData.resolution_number}
                        onChange={(e) => setFormData({ ...formData, resolution_number: e.target.value })}
                        placeholder="np. 1/2024"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resolution_date">Data podjęcia *</Label>
                      <Input
                        id="resolution_date"
                        type="date"
                        value={formData.resolution_date}
                        onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="resolution_type">Typ uchwały</Label>
                    <Select
                      value={formData.resolution_type}
                      onValueChange={(value) => setFormData({ ...formData, resolution_type: value as ResolutionType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve_financial_statements">Zatwierdzenie sprawozdania finansowego</SelectItem>
                        <SelectItem value="profit_allocation">Podział zysku</SelectItem>
                        <SelectItem value="dividend_payout">Wypłata dywidendy</SelectItem>
                        <SelectItem value="loss_coverage">Pokrycie straty</SelectItem>
                        <SelectItem value="board_appointment">Powołanie zarządu</SelectItem>
                        <SelectItem value="other">Inna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Tytuł uchwały *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="np. w sprawie zatwierdzenia sprawozdania finansowego"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Treść uchwały</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Pełna treść uchwały..."
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fiscal_year">Rok obrotowy</Label>
                      <Input
                        id="fiscal_year"
                        type="number"
                        value={formData.fiscal_year}
                        onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Kwota (PLN)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                    Anuluj
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Sheet>
  );
};

export default Resolutions;
