import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Users, Briefcase } from 'lucide-react';
import { getDecisions } from '@/integrations/supabase/repositories/decisionsRepository';
import { DECISION_CATEGORY_LABELS, DECISION_TYPE_LABELS } from '@/types/decisions';
import type { DecisionCategory } from '@/types/decisions';

interface DecisionPickerProps {
  businessProfileId: string;
  value?: string;
  onValueChange: (value: string) => void;
  categoryFilter?: DecisionCategory;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const DecisionPicker: React.FC<DecisionPickerProps> = ({
  businessProfileId,
  value,
  onValueChange,
  categoryFilter,
  label = 'Decyzja autoryzująca',
  required = false,
  disabled = false,
}) => {
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', businessProfileId, 'active'],
    queryFn: async () => {
      const allDecisions = await getDecisions(businessProfileId, 'active');
      if (categoryFilter) {
        return allDecisions.filter(d => d.category === categoryFilter);
      }
      return allDecisions;
    },
    enabled: !!businessProfileId,
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="decision-picker">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="decision-picker">
          <SelectValue placeholder={isLoading ? 'Ładowanie...' : 'Wybierz decyzję'} />
        </SelectTrigger>
        <SelectContent>
          {decisions.length === 0 && !isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mx-auto mb-2" />
              Brak aktywnych decyzji
            </div>
          )}
          {decisions.map(decision => (
            <SelectItem key={decision.id} value={decision.id}>
              <div className="flex items-center gap-2 py-1">
                {decision.decision_type === 'strategic_shareholders' ? (
                  <Users className="h-4 w-4 text-purple-600 shrink-0" />
                ) : (
                  <Briefcase className="h-4 w-4 text-blue-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {decision.decision_number ? `${decision.decision_number} ` : ''}
                    {decision.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {DECISION_CATEGORY_LABELS[decision.category]}
                  </div>
                </div>
                {decision.status === 'active' && (
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {required && (
        <p className="text-xs text-muted-foreground">
          Każda operacja musi być powiązana z decyzją autoryzującą
        </p>
      )}
    </div>
  );
};

export default DecisionPicker;
