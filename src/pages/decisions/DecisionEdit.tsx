import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDecision, getDecisions, updateDecision } from '@/integrations/supabase/repositories/decisionsRepository';
import {
  DECISION_CATEGORY_LABELS,
  DECISION_STATUS_LABELS,
  DECISION_TYPE_LABELS,
  type DecisionCategory,
  type DecisionStatus,
  type DecisionType,
} from '@/types/decisions';

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

const DecisionEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: decision, isLoading } = useQuery({
    queryKey: ['decision', id],
    queryFn: async () => {
      if (!id) return null;
      return getDecision(id);
    },
    enabled: !!id,
  });

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
    queryKey: ['decisions', decision?.business_profile_id, 'strategic_shareholders', 'active'],
    queryFn: async () => {
      if (!decision?.business_profile_id) return [];
      const all = await getDecisions(decision.business_profile_id, 'active');
      return all.filter((d) => d.decision_type === 'strategic_shareholders');
    },
    enabled: !!decision?.business_profile_id,
  });

  useEffect(() => {
    if (!decision) return;

    form.reset({
      title: decision.title ?? '',
      description: decision.description ?? '',
      decision_type: decision.decision_type,
      category: decision.category,
      parent_decision_id: decision.parent_decision_id ?? '',
      scope_description: decision.scope_description ?? '',
      amount_limit: typeof decision.amount_limit === 'number' ? decision.amount_limit : undefined,
      currency: decision.currency ?? 'PLN',
      valid_from: decision.valid_from ?? '',
      valid_to: decision.valid_to ?? '',
      status: decision.status,
    });
  }, [decision, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!id) throw new Error('Brak ID decyzji');

      await updateDecision(id, {
        title: values.title,
        description: values.description || undefined,
        decision_type: values.decision_type,
        category: values.category,
        parent_decision_id:
          values.decision_type === 'operational_board'
            ? (values.parent_decision_id ? values.parent_decision_id : null)
            : null,
        scope_description: values.scope_description || undefined,
        amount_limit: typeof values.amount_limit === 'number' && !Number.isNaN(values.amount_limit) ? values.amount_limit : null,
        currency: values.currency || 'PLN',
        valid_from: values.valid_from || null,
        valid_to: values.valid_to || null,
        status: values.status,
      });
    },
    onSuccess: async () => {
      toast.success('Decyzja została zaktualizowana');
      await queryClient.invalidateQueries({ queryKey: ['decisions'] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ['decision', id] });
      }
      navigate('/decisions');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Nie udało się zapisać decyzji');
    },
  });

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Brak ID decyzji</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Nie znaleziono decyzji</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edytuj decyzję</h1>
          {decision.decision_number && (
            <p className="text-sm text-muted-foreground mt-1">{decision.decision_number}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/decisions')}>Anuluj</Button>
          <Button onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
            {mutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane decyzji</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DecisionEdit;
