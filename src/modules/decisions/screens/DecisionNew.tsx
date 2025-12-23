import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Shield, Sparkles, FileText } from 'lucide-react';
import { createDecision, getDecisions } from '@/modules/spolka/data/decisionsRepository';
import { DecisionTemplateSelector } from '@/modules/decisions/components/DecisionTemplateSelector';
import type { DecisionTemplate } from '@/modules/spolka/data/decisionTemplatesRepository';
import {
  DECISION_CATEGORY_LABELS,
  DECISION_STATUS_LABELS,
  DECISION_TYPE_LABELS,
  type DecisionCategory,
  type DecisionStatus,
  type DecisionType,
} from '@/modules/decisions/decisions';

const formSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  description: z.string().optional(),
  decision_type: z.custom<DecisionType>(),
  category: z.custom<DecisionCategory>(),
  parent_decision_id: z.string().optional(),
  scope_description: z.string().optional(),
  amount_limit: z.union([z.number(), z.nan()]).optional(),
  currency: z.string().min(1).default('PLN'),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  status: z.custom<DecisionStatus>(),
});

type FormValues = z.infer<typeof formSchema>;

const INITIAL_VALUES: FormValues = {
  title: '',
  description: '',
  decision_type: 'operational_board',
  category: 'other',
  parent_decision_id: '',
  scope_description: '',
  amount_limit: undefined,
  currency: 'PLN',
  valid_from: '',
  valid_to: '',
  status: 'active',
};

const DecisionNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [creationMode, setCreationMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<DecisionTemplate | null>(null);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: INITIAL_VALUES,
  });

  const decisionType = form.watch('decision_type');

  useEffect(() => {
    if (decisionType !== 'operational_board') {
      form.setValue('parent_decision_id', '');
    }
  }, [decisionType, form]);

  const { data: existingDecisions = [] } = useQuery({
    queryKey: ['decisions', selectedProfileId, 'all'],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return getDecisions(selectedProfileId);
    },
    enabled: !!selectedProfileId,
  });

  const { data: strategicDecisions = [] } = useQuery({
    queryKey: ['decisions', selectedProfileId, 'strategic_shareholders', 'active'],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const all = await getDecisions(selectedProfileId, 'active');
      return all.filter((d) => d.decision_type === 'strategic_shareholders');
    },
    enabled: !!selectedProfileId && isSpoolka,
  });

  const usedTemplateIds = useMemo(() => {
    return existingDecisions
      .map((d: any) => d.template_id)
      .filter((id: string | null): id is string => !!id);
  }, [existingDecisions]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedProfileId) throw new Error('Brak profilu biznesowego');

      await createDecision({
        business_profile_id: selectedProfileId,
        title: values.title,
        description: values.description || undefined,
        decision_type: values.decision_type,
        category: values.category,
        parent_decision_id:
          values.decision_type === 'operational_board'
            ? (values.parent_decision_id ? values.parent_decision_id : null)
            : null,
        scope_description: values.scope_description || undefined,
        amount_limit: typeof values.amount_limit === 'number' && !Number.isNaN(values.amount_limit)
          ? values.amount_limit
          : undefined,
        currency: values.currency || 'PLN',
        valid_from: values.valid_from || undefined,
        valid_to: values.valid_to || undefined,
        status: values.status,
      });
    },
    onSuccess: async () => {
      toast.success('Decyzja została utworzona');
      await queryClient.invalidateQueries({ queryKey: ['decisions'] });
      navigate('/decisions');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Nie udało się utworzyć decyzji');
    },
  });

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  if (!isSpoolka) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Decyzje dostępne tylko dla Spółek</h2>
          <p className="text-muted-foreground mb-6">
            Ta sekcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
          <Button variant="outline" onClick={() => navigate('/accounting')}>
            Przejdź do księgowości
          </Button>
        </div>
      </div>
    );
  }

  const handleTemplateSelect = async (template: DecisionTemplate) => {
    if (!selectedProfileId) return;

    if (usedTemplateIds.includes(template.id)) {
      toast.info('Ten szablon został już wykorzystany dla wybranego profilu.');
      return;
    }

    setCreationMode('custom');
    setSelectedTemplate(template);
    form.reset({
      ...INITIAL_VALUES,
      title: template.title || INITIAL_VALUES.title,
      description: template.description || INITIAL_VALUES.description,
      decision_type: template.decision_type,
      category: template.category,
      scope_description: template.scope_description || INITIAL_VALUES.scope_description,
    });

    setTimeout(() => {
      document.getElementById('decision-form-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    toast.success('Szablon został wczytany. Uzupełnij szczegóły i zapisz decyzję.');
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Nowa decyzja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wybierz szablon lub utwórz niestandardową decyzję
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/decisions')}>
          Anuluj
        </Button>
      </div>

      <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'template' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="template">
            <FileText className="h-4 w-4 mr-2" />
            Wybierz szablon
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Sparkles className="h-4 w-4 mr-2" />
            Niestandardowa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>Szablony decyzji</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wybierz gotowy szablon decyzji dopasowany do Twojej działalności.
                Po kliknięciu uzupełnimy formularz i przeprowadzimy Cię przez resztę kroków.
              </p>
            </CardHeader>
            <CardContent>
              <DecisionTemplateSelector
                entityType={selectedProfile.entityType}
                onSelectTemplate={handleTemplateSelect}
                onCreateCustom={() => setCreationMode('custom')}
                excludeTemplateIds={usedTemplateIds}
                selectedTemplateIds={selectedTemplate ? [selectedTemplate.id] : []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <div
            id="decision-form-start"
            className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900"
          >
            <p className="font-semibold">Jak to działa?</p>
            <p>
              Wypełnij kolejne kroki, aby przygotować decyzję zgodną z wymaganiami prawnymi.
              Podpowiadamy prostym językiem, a wszystkie pola możesz później edytować.
            </p>
          </div>

          {selectedTemplate && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Korzystasz z szablonu: {selectedTemplate.title}
              </p>
              {selectedTemplate.description && (
                <p className="text-sm text-emerald-800 mt-1">{selectedTemplate.description}</p>
              )}
              <p className="text-xs text-emerald-700 mt-2">
                Sprawdź dane i uzupełnij ewentualne szczegóły. Po zapisaniu szablon pojawi się w Twoich decyzjach.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Niestandardowa decyzja</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zbuduj decyzję krok po kroku. Jeśli coś jest niejasne – zostaw pola puste, a wrócisz do nich później.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Krok 1</p>
                  <h3 className="text-lg font-semibold">Jak nazywamy tę decyzję?</h3>
                  <p className="text-sm text-muted-foreground">
                    Prosty tytuł pomoże każdemu w firmie szybko zrozumieć, czego dotyczy zgoda.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Tytuł</Label>
                  <Input id="title" {...form.register('title')} placeholder="Np. Zgoda na sprzedaż usług IT" />
                  {form.formState.errors.title && (
                    <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Opis (opcjonalnie)</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Możesz dopisać prostym językiem, dlaczego ta decyzja jest potrzebna."
                    {...form.register('description')}
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-muted p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Krok 2</p>
                  <h3 className="text-lg font-semibold">Jakiego rodzaju zgoda?</h3>
                  <p className="text-sm text-muted-foreground">
                    Powiedz nam, kto podpisuje i czego dotyczy decyzja. Resztę dopracujemy razem.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Typ decyzji</Label>
                    <Select
                      value={form.watch('decision_type')}
                      onValueChange={(v) => form.setValue('decision_type', v as DecisionType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz typ" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DECISION_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kategoria</Label>
                    <Select
                      value={form.watch('category')}
                      onValueChange={(v) => form.setValue('category', v as DecisionCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DECISION_CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {decisionType === 'operational_board' && (
                  <div className="space-y-2">
                    <Label>Uchwała strategiczna (opcjonalnie)</Label>
                    <Select
                      value={form.watch('parent_decision_id') || '__none__'}
                      onValueChange={(v) => form.setValue('parent_decision_id', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz uchwałę strategiczną" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Brak</SelectItem>
                        {strategicDecisions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.decision_number ? `${d.decision_number} ` : ''}
                            {d.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="scope">Zakres (opcjonalnie)</Label>
                  <Textarea
                    id="scope"
                    rows={2}
                    placeholder="Napisz, co dokładnie wolno robić w ramach tej decyzji."
                    {...form.register('scope_description')}
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-muted p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Krok 3</p>
                  <h3 className="text-lg font-semibold">Limity i pieniądze</h3>
                  <p className="text-sm text-muted-foreground">
                    Jeśli chcesz ustawić górną kwotę lub walutę – wpisz je tutaj. Możesz też zostawić puste.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount_limit">Limit kwoty (opcjonalnie)</Label>
                    <Input
                      id="amount_limit"
                      type="number"
                      step="0.01"
                      placeholder="Np. 150000"
                      value={form.watch('amount_limit') ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        form.setValue('amount_limit', v === '' ? undefined : Number(v));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Waluta</Label>
                    <Input id="currency" {...form.register('currency')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as DecisionStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DECISION_STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-muted p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Krok 4</p>
                  <h3 className="text-lg font-semibold">Od kiedy obowiązuje?</h3>
                  <p className="text-sm text-muted-foreground">
                    Możesz wskazać daty obowiązywania. Jeśli nie masz pewności – zostaw puste.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Obowiązuje od (opcjonalnie)</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={form.watch('valid_from') ?? ''}
                      onChange={(e) => form.setValue('valid_from', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_to">Obowiązuje do (opcjonalnie)</Label>
                    <Input
                      id="valid_to"
                      type="date"
                      value={form.watch('valid_to') ?? ''}
                      onChange={(e) => form.setValue('valid_to', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Gotowe?</p>
                <p>
                  Kliknij “Zapisz”, a system doda decyzję do Twojego rejestru. Zawsze możesz wrócić i coś poprawić.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate('/decisions')}>
                    Anuluj
                  </Button>
                  <Button onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
                    {mutation.isPending ? 'Zapisywanie...' : 'Zapisz decyzję'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DecisionNew;
