/**
 * Example: Expense Creation Form with Authorization Validation
 * 
 * This example shows how to:
 * 1. Validate in real-time as user types
 * 2. Show blocking alerts before submission
 * 3. Handle soft-blocking (pending authority mode)
 * 4. Record authorization checks
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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
import {
  AuthorizationBlockingAlert,
  useAuthorizationCheck,
  useRecordAuthorizationCheck,
  showAuthorizationError,
  showAuthorizationWarning,
} from '@/modules/authorization';
import { toast } from 'sonner';
import { AlertCircle, Save, Send } from 'lucide-react';

interface ExpenseFormData {
  title: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
}

export function ExpenseWithValidationExample() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: 0,
    currency: 'PLN',
    category: '',
    description: '',
  });

  // Real-time authorization check
  const { data: authCheck, isLoading: checkingAuth } = useAuthorizationCheck({
    actionType: 'expense_create',
    amount: formData.amount,
    currency: formData.currency,
    category: formData.category,
  });

  const recordCheck = useRecordAuthorizationCheck();

  // Create expense mutation
  const createExpense = useMutation({
    mutationFn: async (data: ExpenseFormData & { status: 'draft' | 'pending_approval' }) => {
      // Your expense creation logic
      return { id: 'new-expense-id', ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Wydatek utworzony');
    },
  });

  const handleSaveDraft = async () => {
    // Save as draft - no authorization required
    await createExpense.mutateAsync({
      ...formData,
      status: 'draft',
    });
  };

  const handleSubmitForApproval = async () => {
    if (!authCheck) return;

    // Record authorization check
    const expenseId = 'temp-id'; // Would be generated
    await recordCheck.mutateAsync({
      authorization_id: authCheck.authorization_id || '',
      action_type: 'expense_create',
      entity_type: 'expense',
      entity_id: expenseId,
      result: authCheck.is_authorized ? 'allowed' : 'blocked',
      reason: authCheck.reason,
      checked_amount: formData.amount,
      checked_currency: formData.currency,
      checked_category: formData.category,
    });

    if (!authCheck.is_authorized) {
      showAuthorizationError(authCheck.reason || 'Brak zgody');
      return;
    }

    // Submit for approval
    await createExpense.mutateAsync({
      ...formData,
      status: 'pending_approval',
    });
  };

  const isFormValid = formData.title && formData.amount > 0 && formData.category;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowy wydatek</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form Fields */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Tytuł <span className="text-red-600">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Np. Zakup materiałów biurowych"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Kwota <span className="text-red-600">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Waluta</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLN">PLN</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            Kategoria <span className="text-red-600">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Wybierz kategorię" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operational">Koszty operacyjne</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="office">Biuro</SelectItem>
              <SelectItem value="travel">Podróże służbowe</SelectItem>
              <SelectItem value="other">Inne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Dodatkowe informacje..."
            rows={3}
          />
        </div>

        {/* Authorization Status */}
        {formData.amount > 0 && formData.category && (
          <>
            {checkingAuth && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 animate-pulse" />
                <span>Sprawdzanie uprawnień...</span>
              </div>
            )}

            {authCheck && !authCheck.is_authorized && (
              <AuthorizationBlockingAlert
                reason={authCheck.reason || 'Brak aktywnej zgody'}
                authorizationId={authCheck.authorization_id}
                severity="warning"
              />
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!isFormValid || createExpense.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Zapisz jako szkic
          </Button>

          <Button
            onClick={handleSubmitForApproval}
            disabled={
              !isFormValid ||
              !authCheck?.is_authorized ||
              checkingAuth ||
              createExpense.isPending
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {createExpense.isPending ? 'Wysyłanie...' : 'Wyślij do zatwierdzenia'}
          </Button>
        </div>

        {/* Hint for blocked state */}
        {!authCheck?.is_authorized && formData.amount > 0 && formData.category && (
          <p className="text-xs text-muted-foreground">
            💡 Wskazówka: Możesz zapisać jako szkic i wrócić po uzyskaniu zgody wspólników.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
