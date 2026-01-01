/**
 * Document Form Fields - Stage B of document creation
 * 
 * Dynamic form based on blueprint schema
 * Shows only relevant fields, prefills from context
 */

import React from 'react';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/shared/lib/utils';
import type { DocumentBlueprint } from '../types/blueprints';

interface DocumentFormData {
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  valid_from?: Date;
  valid_to?: Date;
  tags: string[];
}

interface DocumentFormFieldsProps {
  blueprint: DocumentBlueprint;
  formData: DocumentFormData;
  onChange: (data: Partial<DocumentFormData>) => void;
  errors?: Record<string, string>;
}

export const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
  blueprint,
  formData,
  onChange,
  errors = {},
}) => {
  const hasError = (field: string) => !!errors[field];

  return (
    <div className="space-y-4">
      {/* Blueprint Info */}
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{blueprint.category}</Badge>
          <Badge variant="outline">{blueprint.default_scope}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{blueprint.description_pl}</p>
      </div>

      {/* Title (always required) */}
      <div>
        <Label htmlFor="title" className="flex items-center gap-2">
          Title *
          {blueprint.generator?.auto_number && (
            <span className="text-xs text-muted-foreground">(Auto-numbered)</span>
          )}
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`e.g., ${blueprint.name_pl} - ${new Date().toLocaleDateString()}`}
          className={cn(hasError('title') && 'border-red-500')}
        />
        {hasError('title') && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Description (if required) */}
      {blueprint.required_fields.description && (
        <div>
          <Label htmlFor="description">
            Description *
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Enter document description"
            rows={3}
            className={cn(hasError('description') && 'border-red-500')}
          />
          {hasError('description') && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
        </div>
      )}

      {/* Financial Fields */}
      {blueprint.financial_impact?.has_impact && (
        <div className="space-y-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default">Financial Impact</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {blueprint.financial_impact.requires_amount && (
              <div>
                <Label htmlFor="amount">
                  Amount {blueprint.required_fields.amount && '*'}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => onChange({ amount: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  className={cn(hasError('amount') && 'border-red-500')}
                />
                {hasError('amount') && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>
            )}

            {blueprint.financial_impact.requires_amount && (
              <div>
                <Label htmlFor="currency">
                  Currency {blueprint.required_fields.currency && '*'}
                </Label>
                <Input
                  id="currency"
                  value={formData.currency || 'PLN'}
                  onChange={(e) => onChange({ currency: e.target.value })}
                  placeholder="PLN"
                  className={cn(hasError('currency') && 'border-red-500')}
                />
              </div>
            )}
          </div>

          {blueprint.financial_impact.auto_create_accounting_entry && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Accounting entry will be created automatically on publish
            </p>
          )}
        </div>
      )}

      {/* Validity Dates */}
      {(blueprint.required_fields.valid_from || blueprint.required_fields.valid_to || blueprint.expires) && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Validity Period</Badge>
            {blueprint.expires && (
              <Badge variant="destructive" className="text-xs">Expires</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(blueprint.required_fields.valid_from || blueprint.expires) && (
              <div>
                <Label>
                  Valid From {blueprint.required_fields.valid_from && '*'}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.valid_from && 'text-muted-foreground',
                        hasError('valid_from') && 'border-red-500'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_from ? format(formData.valid_from, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.valid_from}
                      onSelect={(date) => onChange({ valid_from: date })}
                    />
                  </PopoverContent>
                </Popover>
                {hasError('valid_from') && (
                  <p className="text-xs text-red-500 mt-1">{errors.valid_from}</p>
                )}
              </div>
            )}

            {(blueprint.required_fields.valid_to || blueprint.expires) && (
              <div>
                <Label>
                  Valid To {(blueprint.required_fields.valid_to || blueprint.expires) && '*'}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.valid_to && 'text-muted-foreground',
                        hasError('valid_to') && 'border-red-500'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_to ? format(formData.valid_to, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.valid_to}
                      onSelect={(date) => onChange({ valid_to: date })}
                      disabled={(date) => 
                        formData.valid_from ? date < formData.valid_from : false
                      }
                    />
                  </PopoverContent>
                </Popover>
                {hasError('valid_to') && (
                  <p className="text-xs text-red-500 mt-1">{errors.valid_to}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Flags */}
      {blueprint.audit_flags && (
        <div className="space-y-2 p-4 border rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">Audit Document</Badge>
          </div>

          {blueprint.audit_flags.is_internal_only && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              This document is internal only and will not be visible to external parties
            </p>
          )}

          {blueprint.audit_flags.requires_evidence && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Evidence attachments are required for this document
            </p>
          )}

          {blueprint.audit_flags.risk_level && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Risk Level:</span>
              <Badge
                variant={
                  blueprint.audit_flags.risk_level === 'critical' ? 'destructive' :
                  blueprint.audit_flags.risk_level === 'high' ? 'destructive' :
                  blueprint.audit_flags.risk_level === 'medium' ? 'default' :
                  'secondary'
                }
              >
                {blueprint.audit_flags.risk_level.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Decision Gate Warning */}
      {blueprint.requires_decision?.required && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                Decision Required
              </h4>
              <p className="text-sm text-red-700 dark:text-red-200">
                This document requires a linked decision before it can be activated.
                {blueprint.requires_decision.blocks_activation && (
                  <> Status will remain "Draft" until decision is linked.</>
                )}
              </p>
              {blueprint.requires_decision.decision_types && (
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Required decision types: {blueprint.requires_decision.decision_types.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Warning */}
      {blueprint.requires_signature && (
        <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            This document requires signature before completion
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentFormFields;
