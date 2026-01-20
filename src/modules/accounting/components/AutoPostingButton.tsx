import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { autoPostInvoice, autoPostPendingInvoices } from '@/modules/accounting/data/postingRulesRepository';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip';
import { RyczaltAccountAssignmentModal } from './RyczaltAccountAssignmentModal';

interface AutoPostingButtonProps {
  mode: 'single' | 'batch';
  invoiceId?: string;
  businessProfileId?: string;
  onPosted?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  startDate?: Date;
  endDate?: Date;
}

export function AutoPostingButton({
  mode,
  invoiceId,
  businessProfileId,
  onPosted,
  variant = 'default',
  size = 'default',
  startDate,
  endDate,
}: AutoPostingButtonProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [missingAccountInvoiceIds, setMissingAccountInvoiceIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const handleSinglePost = async () => {
    if (!invoiceId) return;

    setIsPosting(true);
    try {
      const result = await autoPostInvoice(invoiceId);
      
      if (result.success) {
        toast.success('Zaksięgowano', {
          description: `Dokument został automatycznie zaksięgowany według reguły: ${result.rule_code}`,
          icon: <CheckCircle2 className="h-4 w-4" />
        });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
        queryClient.invalidateQueries({ queryKey: ['chart-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['unposted-transactions'] });
        
        onPosted?.();
      } else {
        if (result.status === 'needs_review') {
          toast.warning('Wymaga przeglądu', {
            description: 'Nie znaleziono pasującej reguły księgowania. Zaksięguj ręcznie.',
          });
        } else {
          toast.error('Błąd księgowania', { description: result.error });
        }
      }
    } catch (error: any) {
      console.error('Error posting invoice:', error);
      toast.error('Nie udało się zaksięgować', {
        description: error.message
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleBatchPost = async () => {
    if (!businessProfileId) return;

    setIsPosting(true);
    try {
      const result = await autoPostPendingInvoices(businessProfileId, 100, startDate, endDate);
      
      if (result.success) {
        // Check if there are MISSING_ACCOUNT errors
        const missingAccountErrors = result.errors?.filter((err: any) => err.error === 'MISSING_ACCOUNT') || [];
        
        if (missingAccountErrors.length > 0) {
          // Show assignment modal for missing accounts
          const invoiceIds = missingAccountErrors.map((err: any) => err.invoice_id);
          setMissingAccountInvoiceIds(invoiceIds);
          setShowAssignmentModal(true);
          toast.info('Przypisz konta ryczałtowe', {
            description: `${missingAccountErrors.length} faktur wymaga przypisania konta ryczałtowego`,
          });
          return;
        }
        
        const message = `Zaksięgowano: ${result.posted_count} dokumentów`;
        const failedMessage = result.failed_count > 0 
          ? `Niepowodzenia: ${result.failed_count}` 
          : '';
        
        if (result.posted_count > 0) {
          toast.success('Automatyczne księgowanie zakończone', {
            description: `${message}. ${failedMessage}`,
            duration: 5000,
          });
        } else {
          toast.info('Brak dokumentów do zaksięgowania', {
            description: 'Wszystkie zaakceptowane dokumenty są już zaksięgowane.'
          });
        }
        
        if (result.failed_count > 0 && missingAccountErrors.length === 0) {
          console.log('Failed invoices:', result.errors);
        }
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
        queryClient.invalidateQueries({ queryKey: ['chart-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['unposted-transactions'] });
        
        onPosted?.();
      } else {
        toast.error('Błąd', { description: 'Nie udało się zaksięgować dokumentów' });
      }
    } catch (error: any) {
      console.error('Error batch posting:', error);
      toast.error('Nie udało się zaksięgować', {
        description: error.message
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleClick = mode === 'single' ? handleSinglePost : handleBatchPost;

  const buttonContent = (
    <Button
      onClick={handleClick}
      disabled={isPosting}
      variant={variant}
      size={size}
    >
      {isPosting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {size !== 'icon' && (
        <span className="ml-2">
          {mode === 'single' ? 'Auto-księguj' : 'Auto-księguj wszystkie'}
        </span>
      )}
    </Button>
  );

  if (mode === 'single') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Automatyczne księgowanie według reguł</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {buttonContent}
      {businessProfileId && startDate && endDate && (
        <RyczaltAccountAssignmentModal
          open={showAssignmentModal}
          onOpenChange={(open) => {
            setShowAssignmentModal(open);
            if (!open) {
              setMissingAccountInvoiceIds([]); // Reset when closing
            }
          }}
          businessProfileId={businessProfileId}
          periodStart={startDate}
          periodEnd={endDate}
          invoiceIds={missingAccountInvoiceIds}
          onAssignmentsComplete={() => {
            setShowAssignmentModal(false);
            setMissingAccountInvoiceIds([]); // Reset after completion
            // Retry auto-post after assignments
            handleBatchPost();
          }}
        />
      )}
    </>
  );
}
