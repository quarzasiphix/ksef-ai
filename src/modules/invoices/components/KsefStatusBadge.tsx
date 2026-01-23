import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { CheckCircle, XCircle, Clock, MinusCircle, AlertCircle } from 'lucide-react';
import { KsefStatus } from '@/shared/services/ksef';

interface KsefStatusBadgeProps {
  status: KsefStatus;
  referenceNumber?: string | null;
  errorMessage?: string | null;
  submittedAt?: string | null;
}

export function KsefStatusBadge({ 
  status, 
  referenceNumber, 
  errorMessage,
  submittedAt 
}: KsefStatusBadgeProps) {
  const variants = {
    none: {
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: MinusCircle,
      text: 'Nie wysłano',
      description: 'Faktura nie została wysłana do KSeF',
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: Clock,
      text: 'Oczekuje',
      description: 'Faktura oczekuje na wysłanie do KSeF',
    },
    submitted: {
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle,
      text: 'Wysłano',
      description: 'Faktura została pomyślnie wysłana do KSeF',
    },
    error: {
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: XCircle,
      text: 'Błąd',
      description: 'Wystąpił błąd podczas wysyłania do KSeF',
    },
  };

  const variant = variants[status] || variants.none;
  const Icon = variant.icon;

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-semibold">{variant.description}</div>
      {referenceNumber && (
        <div className="text-xs">
          <span className="font-medium">Numer referencyjny:</span>
          <div className="mt-1 font-mono text-xs break-all">{referenceNumber}</div>
        </div>
      )}
      {submittedAt && (
        <div className="text-xs">
          <span className="font-medium">Data wysłania:</span>
          <div className="mt-1">{new Date(submittedAt).toLocaleString('pl-PL')}</div>
        </div>
      )}
      {errorMessage && (
        <div className="text-xs">
          <span className="font-medium">Błąd:</span>
          <div className="mt-1 text-red-200">{errorMessage}</div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${variant.color} flex items-center gap-1.5 cursor-help`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">KSeF: {variant.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
