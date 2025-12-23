import React, { useEffect, useState } from 'react';
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
import { createDecision, getDecisions } from '@/integrations/supabase/repositories/decisionsRepository';
import { DecisionTemplateSelector } from '@/modules/decisions/components/DecisionTemplateSelector';
import { createDecisionFromTemplate } from '@/integrations/supabase/repositories/decisionTemplatesRepository';
import type { DecisionTemplate } from '@/integrations/supabase/repositories/decisionTemplatesRepository';
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
    defaultValues: {
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
    },
  });

  const decisionType = form.watch('decision_type');

  useEffect(() => {
    if (decisionType !== 'operational_board') {
      form.setValue('parent_decision_id', '');
    }
  }, [decisionType, form]);

  const { data: strategicDecisions = [] } = useQuery({
    queryKey: ['decisions', selectedProfileId, 'strategic_shareholders', 'active'],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const all = await getDecisions(selectedProfileId, 'active');
      return all.filter((d) => d.decision_type === 'strategic_shareholders');
    },
    enabled: !!selectedProfileId && isSpoolka,
  });

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
    
    try {
      const result = await createDecisionFromTemplate(template.id, selectedProfileId);
      toast.success('Decyzja utworzona z szablonu');
      queryClient.invalidateQueries({ queryKey: ['decisions', selectedProfileId] });
      navigate(`/decisions/${result.id}`);
    } catch (error) {
      console.error('Error creating decision from template:', error);
      toast.error('Nie udało się utworzyć decyzji z szablonu');
    }
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
                Wybierz gotowy szablon decyzji dopasowany do Twojej działalności
              </p>
            </CardHeader>
            <CardContent>
              <DecisionTemplateSelector
                entityType={selectedProfile.entityType}
                onSelectTemplate={handleTemplateSelect}
                onCreateCustom={() => setCreationMode('custom')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Niestandardowa decyzja</CardTitle>
              <p className="text-sm text-muted-foreground">
                Utwórz decyzję z własnymi parametrami
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Textarea id="description" rows={3} {...form.register('description')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ decyzji</Label>
              <Select value={form.watch('decision_type')} onValueChange={(v) => form.setValue('decision_type', v as DecisionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DECISION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v as DecisionCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DECISION_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
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
                      {d.decision_number ? `${d.decision_number} ` : ''}{d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scope">Zakres (opcjonalnie)</Label>
            <Textarea id="scope" rows={2} {...form.register('scope_description')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_limit">Limit kwoty (opcjonalnie)</Label>
              <Input
                id="amount_limit"
                type="number"
                step="0.01"
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
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Obowiązuje od (opcjonalnie)</Label>
              <Input id="valid_from" type="date" value={form.watch('valid_from') ?? ''} onChange={(e) => form.setValue('valid_from', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_to">Obowiązuje do (opcjonalnie)</Label>
              <Input id="valid_to" type="date" value={form.watch('valid_to') ?? ''} onChange={(e) => form.setValue('valid_to', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate('/decisions')}>
              Anuluj
            </Button>
            <Button onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
              {mutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DecisionNew;
