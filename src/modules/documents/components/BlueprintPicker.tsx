/**
 * Blueprint Picker - Stage A of document creation
 * 
 * Shows available document blueprints for current context
 * User selects what type of document they want to create
 */

import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { 
  Truck, ClipboardCheck, FileText, AlertTriangle, FileSignature,
  Shield, IdCard, FileCheck, DollarSign, Receipt, FileSearch
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { DocumentBlueprint } from '../types/blueprints';

interface BlueprintPickerProps {
  blueprints: DocumentBlueprint[];
  onSelect: (blueprint: DocumentBlueprint) => void;
  selectedId?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  FileSignature,
  Shield,
  IdCard,
  FileCheck,
  DollarSign,
  Receipt,
  FileSearch,
};

const BADGE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  requires_decision: { label: 'Requires Decision', variant: 'destructive' },
  financial: { label: 'Financial Impact', variant: 'default' },
  audit_only: { label: 'Audit Only', variant: 'secondary' },
  expires: { label: 'Expires', variant: 'outline' },
  requires_job: { label: 'Requires Job', variant: 'outline' },
};

export const BlueprintPicker: React.FC<BlueprintPickerProps> = ({
  blueprints,
  onSelect,
  selectedId,
}) => {
  if (blueprints.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No document types available</h3>
        <p className="text-sm text-muted-foreground">
          No document blueprints are configured for this context
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">What are you creating?</h3>
        <p className="text-sm text-muted-foreground">
          Select a document type to continue
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {blueprints.map((blueprint) => {
          const Icon = ICON_MAP[blueprint.icon || 'FileText'] || FileText;
          const isSelected = selectedId === blueprint.id;

          return (
            <Card
              key={blueprint.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected && 'border-primary ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => onSelect(blueprint)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${blueprint.color}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: blueprint.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-1">{blueprint.name_pl}</h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {blueprint.description_pl}
                    </p>
                    
                    {blueprint.badges && blueprint.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {blueprint.badges.map((badge) => {
                          const badgeConfig = BADGE_LABELS[badge];
                          if (!badgeConfig) return null;
                          
                          return (
                            <Badge
                              key={badge}
                              variant={badgeConfig.variant}
                              className="text-xs"
                            >
                              {badgeConfig.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BlueprintPicker;
