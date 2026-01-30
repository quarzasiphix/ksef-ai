import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { DiscussionContent } from './DiscussionContent';
import { ConnectedClient } from '@/shared/lib/client-connection-matcher';
import { Building2 } from 'lucide-react';

interface DiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  connectedClient: ConnectedClient;
}

export const DiscussionDialog: React.FC<DiscussionDialogProps> = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  connectedClient,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[700px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            Dyskusja - Faktura {invoiceNumber}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" />
            Rozmowa z <span className="font-medium">{connectedClient.customer_name}</span>
            <span className="text-xs text-muted-foreground">
              (NIP: {connectedClient.customer_tax_id})
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <DiscussionContent
          invoiceId={invoiceId}
          connectedClient={connectedClient}
          className="flex-1 overflow-hidden"
        />
      </DialogContent>
    </Dialog>
  );
};
