/**
 * Context-Aware Document Dialog - Two-stage creation flow
 * 
 * Stage A: Choose Blueprint (what are you creating?)
 * Stage B: Fill minimal required fields (dynamic based on blueprint)
 * 
 * Context is automatically inherited from section user is in
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createDocument } from '../data/documentsRepository';
import { BlueprintPicker } from './BlueprintPicker';
import { DocumentFormFields } from './DocumentFormFields';
import { getBlueprintsForContext, generateDocumentNumber } from '../types/blueprints';
import type { DocumentBlueprint, DocumentCreationContext, DocumentSection } from '../types/blueprints';

interface ContextAwareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: DocumentCreationContext;
}

interface FormData {
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  valid_from?: Date;
  valid_to?: Date;
  tags: string[];
}

export const ContextAwareDocumentDialog: React.FC<ContextAwareDocumentDialogProps> = ({
  open,
  onOpenChange,
  context,
}) => {
  const queryClient = useQueryClient();

  // Stage state
  const [stage, setStage] = useState<'blueprint' | 'fields'>('blueprint');
  const [selectedBlueprint, setSelectedBlueprint] = useState<DocumentBlueprint | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    currency: 'PLN',
    tags: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get available blueprints for context
  const availableBlueprints = getBlueprintsForContext(context);

  // Get next document number for auto-numbering
  const { data: nextSequence = 1 } = useQuery({
    queryKey: ['document-sequence', context.department_template_id],
    queryFn: async () => {
      // TODO: Fetch from backend
      return 1;
    },
    enabled: !!selectedBlueprint?.generator?.auto_number,
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStage('blueprint');
      setSelectedBlueprint(null);
      setFormData({
        title: '',
        description: '',
        currency: 'PLN',
        tags: [],
      });
      setErrors({});
    }
  }, [open]);

  // Auto-generate title when blueprint selected
  useEffect(() => {
    if (selectedBlueprint && !formData.title) {
      let generatedTitle = selectedBlueprint.name_pl;
      
      if (selectedBlueprint.generator?.auto_number) {
        const docNumber = generateDocumentNumber(selectedBlueprint, nextSequence);
        generatedTitle = `${selectedBlueprint.name_pl} ${docNumber}`;
      } else {
        generatedTitle = `${selectedBlueprint.name_pl} - ${new Date().toLocaleDateString()}`;
      }
      
      setFormData(prev => ({ ...prev, title: generatedTitle }));
    }
  }, [selectedBlueprint, nextSequence]);

  const createDocumentMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      queryClient.invalidateQueries({ queryKey: ['document-sequence'] });
      
      toast.success('Document created successfully', {
        description: `${newDoc.title} has been created`,
      });
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create document', {
        description: error.message,
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (selectedBlueprint?.required_fields.description && !formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (selectedBlueprint?.financial_impact?.requires_amount && !formData.amount) {
      newErrors.amount = 'Amount is required';
    }

    if (selectedBlueprint?.required_fields.valid_from && !formData.valid_from) {
      newErrors.valid_from = 'Valid from date is required';
    }

    if ((selectedBlueprint?.required_fields.valid_to || selectedBlueprint?.expires) && !formData.valid_to) {
      newErrors.valid_to = 'Valid to date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlueprintSelect = (blueprint: DocumentBlueprint) => {
    setSelectedBlueprint(blueprint);
    setStage('fields');
  };

  const handleBack = () => {
    if (stage === 'fields') {
      setStage('blueprint');
      setSelectedBlueprint(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedBlueprint) return;
    if (!validateForm()) return;

    // Build document data
    const documentData: any = {
      title: formData.title,
      description: formData.description,
      type: selectedBlueprint.document_type,
      scope: selectedBlueprint.default_scope,
      status: selectedBlueprint.default_status,
      department_id: context.department_template_id,
      business_profile_id: context.business_profile_id,
      tags: formData.tags,
      
      // Linkage from context
      job_id: context.job_id,
      client_id: context.client_id,
      invoice_id: context.invoice_id,
      contract_id: context.contract_id,
      decision_id: context.decision_id,
      vehicle_id: context.vehicle_id,
      driver_id: context.driver_id,
      
      // Dates
      valid_from: formData.valid_from?.toISOString(),
      valid_to: formData.valid_to?.toISOString(),
      
      // Required level
      required_level: selectedBlueprint.requires_decision?.required ? 'required' : 'optional',
    };

    // Add financial fields if applicable
    if (selectedBlueprint.financial_impact?.has_impact && formData.amount) {
      documentData.metadata = {
        amount: formData.amount,
        currency: formData.currency,
      };
    }

    createDocumentMutation.mutate(documentData);
  };

  const getSectionLabel = (section: DocumentSection): string => {
    const labels: Record<DocumentSection, string> = {
      operations: 'Operations',
      contracts: 'Contracts',
      decisions: 'Decisions',
      financial: 'Financial',
      audit: 'Audit',
    };
    return labels[section];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {stage === 'blueprint' && (
          <>
            <DialogHeader>
              <DialogTitle>New Document</DialogTitle>
              <DialogDescription>
                Creating document in <strong>{getSectionLabel(context.section)}</strong> section
                {context.job_id && ' for current job'}
              </DialogDescription>
            </DialogHeader>

            <BlueprintPicker
              blueprints={availableBlueprints}
              onSelect={handleBlueprintSelect}
              selectedId={selectedBlueprint?.id}
            />
          </>
        )}

        {stage === 'fields' && selectedBlueprint && (
          <>
            <DialogHeader>
              <DialogTitle>{selectedBlueprint.name_pl}</DialogTitle>
              <DialogDescription>
                Fill in the required information for this document
              </DialogDescription>
            </DialogHeader>

            <DocumentFormFields
              blueprint={selectedBlueprint}
              formData={formData}
              onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
              errors={errors}
            />

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createDocumentMutation.isPending}
              >
                {createDocumentMutation.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContextAwareDocumentDialog;
