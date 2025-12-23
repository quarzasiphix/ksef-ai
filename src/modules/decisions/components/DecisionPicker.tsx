import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { AlertCircle, CheckCircle2, Users, Briefcase, Info } from 'lucide-react';
import { getDecisions } from '@/integrations/supabase/repositories/decisionsRepository';
import { DECISION_CATEGORY_LABELS, DECISION_TYPE_LABELS } from '@/shared/types/decisions';
import type { DecisionCategory } from '@/shared/types/decisions';

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

  // Auto-select the only existing decision if there's exactly one and no value is set
  React.useEffect(() => {
    if (!value && decisions.length === 1 && !isLoading) {
      onValueChange(decisions[0].id);
    }
  }, [decisions, value, isLoading, onValueChange]);

  // Find the selected decision for showing default label
  const selectedDecision = decisions.find(d => d.id === value);
  const isAutoSelected = decisions.length === 1 && value === decisions[0]?.id;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="decision-picker">
          Zgoda organizacyjna (wymagana prawnie)
          {required && <span className="text-red-600 ml-1">*</span>}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Każda operacja wymaga zgody organizacyjnej (audyt). System automatycznie wybiera domyślną, jeśli dostępna jest tylko jedna.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {isAutoSelected && selectedDecision && (
        <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Wybrano domyślnie:</span>
          </div>
          <div className="ml-6 text-green-700 dark:text-green-200 mt-1">
            {selectedDecision.decision_number && `${selectedDecision.decision_number} `}
            {selectedDecision.title}
          </div>
        </div>
      )}
      
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
      {required && !isAutoSelected && (
        <p className="text-xs text-muted-foreground">
          Każda operacja musi być powiązana z decyzją autoryzującą
        </p>
      )}
    </div>
  );
};

export default DecisionPicker;
