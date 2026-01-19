import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { acceptExpense, rejectExpense } from '@/modules/accounting/data/postingRulesRepository';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';

interface ExpenseAcceptanceActionsProps {
  invoiceId: string;
  invoiceNumber?: string;
  onAccepted?: () => void;
  onRejected?: () => void;
}

export function ExpenseAcceptanceActions({
  invoiceId,
  invoiceNumber,
  onAccepted,
  onRejected,
}: ExpenseAcceptanceActionsProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Get current user
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      if (!user) throw new Error('Not authenticated');

      const result = await acceptExpense(invoiceId, user.id);
      
      if (result.success) {
        toast.success('Wydatek zaakceptowany', {
          description: `Faktura ${invoiceNumber || ''} została zaakceptowana i może być zaksięgowana.`
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['pending-expenses'] });
        
        onAccepted?.();
      } else {
        toast.error('Błąd', { description: result.error });
      }
    } catch (error: any) {
      console.error('Error accepting expense:', error);
      toast.error('Nie udało się zaakceptować wydatku', {
        description: error.message
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Podaj powód odrzucenia');
      return;
    }

    setIsRejecting(true);
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      if (!user) throw new Error('Not authenticated');

      const result = await rejectExpense(invoiceId, user.id, rejectReason);
      
      if (result.success) {
        toast.success('Wydatek odrzucony', {
          description: `Faktura ${invoiceNumber || ''} została odrzucona.`
        });
        
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['pending-expenses'] });
        
        setShowRejectDialog(false);
        setRejectReason('');
        onRejected?.();
      } else {
        toast.error('Błąd', { description: result.error });
      }
    } catch (error: any) {
      console.error('Error rejecting expense:', error);
      toast.error('Nie udało się odrzucić wydatku', {
        description: error.message
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          size="sm"
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span className="ml-2">Akceptuj</span>
        </Button>
        
        <Button
          onClick={() => setShowRejectDialog(true)}
          disabled={isRejecting}
          size="sm"
          variant="destructive"
        >
          <X className="h-4 w-4" />
          <span className="ml-2">Odrzuć</span>
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć wydatek</DialogTitle>
            <DialogDescription>
              Podaj powód odrzucenia faktury {invoiceNumber || 'Draft'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Powód odrzucenia</Label>
              <Textarea
                id="reason"
                placeholder="Np. Brak podpisu, nieprawidłowa kwota, duplikat..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Odrzuć wydatek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
