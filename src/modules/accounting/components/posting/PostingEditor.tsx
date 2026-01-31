import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Plus, Trash2, Save, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { AccountPicker } from '../AccountPicker';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import type { CreateJournalLineInput, JournalLineSide } from '../../types/journal';
import { validateJournalBalance } from '../../types/journal';
import { createJournalEntry, postJournalEntry } from '../../data/journalRepository';

interface PostingEditorProps {
  businessProfileId: string;
  sourceType: 'invoice' | 'payment' | 'manual';
  sourceId?: string;
  initialDate?: string;
  initialDescription?: string;
  initialReference?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface LineState extends CreateJournalLineInput {
  tempId: string;
}

export function PostingEditor({
  businessProfileId,
  sourceType,
  sourceId,
  initialDate = new Date().toISOString().split('T')[0],
  initialDescription = '',
  initialReference = '',
  onSuccess,
  onCancel,
}: PostingEditorProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [entryDate, setEntryDate] = useState(initialDate);
  const [description, setDescription] = useState(initialDescription);
  const [referenceNumber, setReferenceNumber] = useState(initialReference);
  const [notes, setNotes] = useState('');
  
  // Lines state
  const [lines, setLines] = useState<LineState[]>([
    { tempId: '1', account_id: '', side: 'debit', amount: 0, description: '', line_number: 1 },
    { tempId: '2', account_id: '', side: 'credit', amount: 0, description: '', line_number: 2 },
  ]);

  // Validation state
  const [validation, setValidation] = useState(validateJournalBalance([]));

  // Update validation whenever lines change
  useEffect(() => {
    const validLines = lines.filter(l => l.account_id && l.amount > 0);
    setValidation(validateJournalBalance(validLines));
  }, [lines]);

  // Create journal entry mutation
  const createMutation = useMutation({
    mutationFn: async (shouldPost: boolean) => {
      const validLines = lines.filter(l => l.account_id && l.amount > 0);
      
      const entry = await createJournalEntry({
        business_profile_id: businessProfileId,
        source_type: sourceType,
        source_id: sourceId,
        entry_date: entryDate,
        description,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        lines: validLines,
      });

      if (shouldPost) {
        await postJournalEntry(entry.id);
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Journal entry created successfully');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });

  // Add line
  const addLine = (side: JournalLineSide) => {
    const newLineNumber = Math.max(...lines.map(l => l.line_number), 0) + 1;
    setLines([
      ...lines,
      {
        tempId: Date.now().toString(),
        account_id: '',
        side,
        amount: 0,
        description: '',
        line_number: newLineNumber,
      },
    ]);
  };

  // Remove line
  const removeLine = (tempId: string) => {
    if (lines.length <= 2) {
      toast.error('Must have at least 2 lines');
      return;
    }
    setLines(lines.filter(l => l.tempId !== tempId));
  };

  // Update line
  const updateLine = (tempId: string, updates: Partial<LineState>) => {
    setLines(lines.map(l => l.tempId === tempId ? { ...l, ...updates } : l));
  };

  // Quick actions
  const balanceRemainder = () => {
    const totalDebits = lines
      .filter(l => l.side === 'debit' && l.amount > 0)
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalCredits = lines
      .filter(l => l.side === 'credit' && l.amount > 0)
      .reduce((sum, l) => sum + l.amount, 0);
    
    const difference = totalDebits - totalCredits;
    
    if (Math.abs(difference) < 0.01) {
      toast.info('Entry is already balanced');
      return;
    }

    // Find first empty line of the needed side
    const neededSide = difference > 0 ? 'credit' : 'debit';
    const emptyLine = lines.find(l => l.side === neededSide && !l.account_id);
    
    if (emptyLine) {
      updateLine(emptyLine.tempId, { amount: Math.abs(difference) });
      toast.success(`Set ${neededSide} line to ${Math.abs(difference).toFixed(2)} PLN`);
    } else {
      toast.error(`Add an empty ${neededSide} line first`);
    }
  };

  const debitLines = lines.filter(l => l.side === 'debit');
  const creditLines = lines.filter(l => l.side === 'credit');

  const totalDebits = debitLines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredits = creditLines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Create Journal Entry</CardTitle>
          <CardDescription>
            Multi-line posting with Chart of Accounts assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-date">Entry Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Invoice number, etc."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Entry description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Debit Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Debit Lines (Wn)</CardTitle>
              <CardDescription>Total: {totalDebits.toFixed(2)} PLN</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addLine('debit')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Debit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {debitLines.map((line) => (
            <div key={line.tempId} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <AccountPicker
                    value={line.account_id}
                    onChange={(accountId) => updateLine(line.tempId, { account_id: accountId })}
                    placeholder="Select account..."
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={line.amount || ''}
                    onChange={(e) => updateLine(line.tempId, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Line description (optional)"
                    value={line.description || ''}
                    onChange={(e) => updateLine(line.tempId, { description: e.target.value })}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.tempId)}
                disabled={lines.length <= 2}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Credit Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Credit Lines (Ma)</CardTitle>
              <CardDescription>Total: {totalCredits.toFixed(2)} PLN</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addLine('credit')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Credit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {creditLines.map((line) => (
            <div key={line.tempId} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <AccountPicker
                    value={line.account_id}
                    onChange={(accountId) => updateLine(line.tempId, { account_id: accountId })}
                    placeholder="Select account..."
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={line.amount || ''}
                    onChange={(e) => updateLine(line.tempId, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Line description (optional)"
                    value={line.description || ''}
                    onChange={(e) => updateLine(line.tempId, { description: e.target.value })}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.tempId)}
                disabled={lines.length <= 2}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Balance Summary */}
      <Card className={cn(
        'border-2',
        isBalanced ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isBalanced ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <div className="font-semibold">
                  {isBalanced ? 'Entry is balanced' : 'Entry is not balanced'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Debits: {totalDebits.toFixed(2)} PLN | Credits: {totalCredits.toFixed(2)} PLN
                  {!isBalanced && ` | Difference: ${difference.toFixed(2)} PLN`}
                </div>
              </div>
            </div>
            {!isBalanced && (
              <Button
                variant="outline"
                size="sm"
                onClick={balanceRemainder}
              >
                Balance Remainder
              </Button>
            )}
          </div>

          {/* Validation Errors */}
          {validation.errors.length > 0 && (
            <div className="mt-4 space-y-1">
              {validation.errors.map((error, idx) => (
                <div key={idx} className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error.message}
                </div>
              ))}
            </div>
          )}

          {/* Validation Warnings */}
          {validation.warnings && validation.warnings.length > 0 && (
            <div className="mt-4 space-y-1">
              {validation.warnings.map((warning, idx) => (
                <div key={idx} className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => createMutation.mutate(false)}
            disabled={!validation.valid || !description || createMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={() => createMutation.mutate(true)}
            disabled={!validation.valid || !description || createMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Save and Post
          </Button>
        </div>
      </div>
    </div>
  );
}
