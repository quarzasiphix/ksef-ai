/**
 * New Document Dialog - Smart document creation flow
 * 
 * Flow:
 * 1. Choose document type
 * 2. Choose scope (department/job/client/vehicle/driver)
 * 3. Auto-suggest template + default title
 * 4. Create record, then optionally upload files
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { CalendarIcon, Building2, Briefcase, User, Truck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/shared/lib/utils';
import { createDocument } from '../data/documentsRepository';
import type { DocumentType, DocumentScope, DocumentRequiredLevel } from '../types';
import { toast } from 'sonner';

interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  businessProfileId: string;
  defaultScope?: DocumentScope;
  defaultJobId?: string;
  defaultContractId?: string;
  defaultClientId?: string;
  defaultVehicleId?: string;
  defaultDriverId?: string;
}

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string; description: string }> = [
  { value: 'contract', label: 'Contract', description: 'Agreements, terms, and contractual documents' },
  { value: 'execution', label: 'Execution', description: 'Operational and execution documents' },
  { value: 'compliance', label: 'Compliance', description: 'Regulatory and legal compliance documents' },
  { value: 'financial', label: 'Financial', description: 'Invoices, costs, and financial documents' },
  { value: 'correspondence', label: 'Correspondence', description: 'Emails, letters, and communications' },
  { value: 'internal', label: 'Internal', description: 'Internal memos and notes' },
  { value: 'other', label: 'Other', description: 'Miscellaneous documents' },
];

const DOCUMENT_SCOPES: Array<{ value: DocumentScope; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'department', label: 'Department-level', icon: Building2 },
  { value: 'job', label: 'Job/Case', icon: Briefcase },
  { value: 'client', label: 'Client', icon: User },
  { value: 'vehicle', label: 'Vehicle', icon: Truck },
  { value: 'driver', label: 'Driver', icon: Users },
  { value: 'contract', label: 'Contract', icon: Building2 },
  { value: 'decision', label: 'Decision', icon: Building2 },
];

const REQUIRED_LEVELS: Array<{ value: DocumentRequiredLevel; label: string; color: string }> = [
  { value: 'optional', label: 'Optional', color: 'bg-gray-100 text-gray-700' },
  { value: 'required', label: 'Required', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export const NewDocumentDialog: React.FC<NewDocumentDialogProps> = ({
  open,
  onOpenChange,
  departmentId,
  businessProfileId,
  defaultScope = 'department',
  defaultJobId,
  defaultContractId,
  defaultClientId,
  defaultVehicleId,
  defaultDriverId,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [step, setStep] = useState<'type' | 'scope' | 'details'>('type');
  const [formData, setFormData] = useState({
    title: '',
    type: 'other' as DocumentType,
    scope: defaultScope,
    description: '',
    required_level: 'optional' as DocumentRequiredLevel,
    due_date: undefined as Date | undefined,
    valid_from: undefined as Date | undefined,
    valid_to: undefined as Date | undefined,
    tags: [] as string[],
    job_id: defaultJobId,
    contract_id: defaultContractId,
    client_id: defaultClientId,
    vehicle_id: defaultVehicleId,
    driver_id: defaultDriverId,
  });

  const createDocumentMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      toast.success('Document created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create document: ' + error.message);
    },
  });

  const resetForm = () => {
    setStep('type');
    setFormData({
      title: '',
      type: 'other',
      scope: defaultScope,
      description: '',
      required_level: 'optional',
      due_date: undefined,
      valid_from: undefined,
      valid_to: undefined,
      tags: [],
      job_id: defaultJobId,
      contract_id: defaultContractId,
      client_id: defaultClientId,
      vehicle_id: defaultVehicleId,
      driver_id: defaultDriverId,
    });
  };

  const handleSubmit = () => {
    createDocumentMutation.mutate({
      ...formData,
      department_id: departmentId,
      business_profile_id: businessProfileId,
      status: 'draft',
      due_date: formData.due_date?.toISOString(),
      valid_from: formData.valid_from?.toISOString(),
      valid_to: formData.valid_to?.toISOString(),
    });
  };

  const renderTypeStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Choose Document Type</DialogTitle>
        <DialogDescription>
          Select the type of document you want to create
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3">
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setFormData({ ...formData, type: type.value });
              setStep('scope');
            }}
            className={cn(
              'p-4 border rounded-lg text-left hover:bg-muted transition-colors',
              formData.type === type.value && 'border-primary bg-primary/5'
            )}
          >
            <h4 className="font-medium mb-1">{type.label}</h4>
            <p className="text-sm text-muted-foreground">{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderScopeStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Choose Document Scope</DialogTitle>
        <DialogDescription>
          What is this document related to?
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {DOCUMENT_SCOPES.map((scope) => {
          const Icon = scope.icon;
          return (
            <button
              key={scope.value}
              onClick={() => {
                setFormData({ ...formData, scope: scope.value });
                setStep('details');
              }}
              className={cn(
                'p-4 border rounded-lg text-center hover:bg-muted transition-colors',
                formData.scope === scope.value && 'border-primary bg-primary/5'
              )}
            >
              <Icon className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">{scope.label}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep('type')}>
          Back
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Document Details</DialogTitle>
        <DialogDescription>
          Fill in the document information
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter document title"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div>
          <Label>Required Level</Label>
          <Select
            value={formData.required_level}
            onValueChange={(value) => setFormData({ ...formData, required_level: value as DocumentRequiredLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUIRED_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <Badge className={level.color}>{level.label}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valid From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.valid_from ? format(formData.valid_from, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.valid_from}
                  onSelect={(date) => setFormData({ ...formData, valid_from: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Valid To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.valid_to ? format(formData.valid_to, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.valid_to}
                  onSelect={(date) => setFormData({ ...formData, valid_to: date })}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Badge variant="outline">{formData.type}</Badge>
          <Badge variant="outline">{formData.scope}</Badge>
        </div>
      </div>

      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('scope')}>
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.title || createDocumentMutation.isPending}
        >
          {createDocumentMutation.isPending ? 'Creating...' : 'Create Document'}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {step === 'type' && renderTypeStep()}
        {step === 'scope' && renderScopeStep()}
        {step === 'details' && renderDetailsStep()}
      </DialogContent>
    </Dialog>
  );
};

export default NewDocumentDialog;
