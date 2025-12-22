import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, MessageSquare, CheckCircle2, AlertCircle, XCircle, Lock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AgreementStatus } from "./AgreementStatusBadge";

interface InvoiceStateBannerProps {
  status: AgreementStatus;
  senderName: string;
  receivedDate: string;
  lastMessageDate?: string;
  discussionCount?: number;
}

const statusMessages: Record<AgreementStatus, {
  title: string;
  description: (props: InvoiceStateBannerProps) => string;
  nextStep: string;
  variant: "default" | "destructive" | "warning" | "success";
  icon: React.ComponentType<{ className?: string }>;
}> = {
  received: {
    title: "Otrzymano — oczekuje na weryfikację",
    description: (props) => `Wystawca: ${props.senderName} • Otrzymano: ${format(new Date(props.receivedDate), "dd.MM.yyyy", { locale: pl })}`,
    nextStep: "Zweryfikuj dokument i uzgodnij lub poproś o korektę",
    variant: "warning",
    icon: Clock
  },
  under_discussion: {
    title: "W dyskusji — czekasz na odpowiedź wystawcy",
    description: (props) => {
      const lastMsg = props.lastMessageDate 
        ? `Ostatnia wiadomość: ${formatDistanceToNow(new Date(props.lastMessageDate), { locale: pl, addSuffix: true })}`
        : `${props.discussionCount || 0} wiadomości w wątku`;
      return `${lastMsg} • SLA: 48h`;
    },
    nextStep: "Oczekiwanie na odpowiedź kontrahenta",
    variant: "default",
    icon: MessageSquare
  },
  correction_needed: {
    title: "Wymaga korekty — wysłano prośbę o poprawki",
    description: (props) => `Wystawca: ${props.senderName} • Oczekiwanie na poprawiony dokument`,
    nextStep: "Kontrahent wprowadzi zmiany i prześle poprawioną wersję",
    variant: "warning",
    icon: AlertCircle
  },
  approved: {
    title: "Uzgodnione — dokument zablokowany (audyt)",
    description: () => "Dokument został zatwierdzony i zablokowany do edycji",
    nextStep: "Gotowe do księgowania / przekazania do ERP",
    variant: "success",
    icon: CheckCircle2
  },
  ready_for_ksef: {
    title: "Uzgodnione — dokument zablokowany (audyt)",
    description: () => "Dokument został zatwierdzony i zablokowany do edycji",
    nextStep: "Gotowe do księgowania / przekazania do ERP",
    variant: "success",
    icon: Lock
  },
  rejected: {
    title: "Odrzucono — dokument nie został zaakceptowany",
    description: (props) => `Wystawca: ${props.senderName} • Odrzucono: ${format(new Date(props.receivedDate), "dd.MM.yyyy", { locale: pl })}`,
    nextStep: "Dokument został odrzucony i nie będzie przetwarzany",
    variant: "destructive",
    icon: XCircle
  },
  sent: {
    title: "Wysłano — oczekuje na odbiór",
    description: (props) => `Odbiorca: ${props.senderName} • Wysłano: ${format(new Date(props.receivedDate), "dd.MM.yyyy", { locale: pl })}`,
    nextStep: "Oczekiwanie na potwierdzenie odbioru",
    variant: "default",
    icon: Clock
  },
  draft: {
    title: "Wersja robocza",
    description: () => "Dokument w przygotowaniu",
    nextStep: "Dokument nie został jeszcze wysłany",
    variant: "default",
    icon: Clock
  },
  cancelled: {
    title: "Anulowano",
    description: () => "Dokument został anulowany",
    nextStep: "Dokument nie będzie przetwarzany",
    variant: "destructive",
    icon: XCircle
  }
};

export function InvoiceStateBanner(props: InvoiceStateBannerProps) {
  const config = statusMessages[props.status];
  const Icon = config.icon;

  const variantClasses = {
    default: "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800",
    warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800",
    success: "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800",
    destructive: "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
  };

  return (
    <Alert className={cn("border-2", variantClasses[config.variant])}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-2 rounded-lg mt-0.5",
          config.variant === "warning" && "bg-amber-100 dark:bg-amber-900/30",
          config.variant === "success" && "bg-green-100 dark:bg-green-900/30",
          config.variant === "destructive" && "bg-red-100 dark:bg-red-900/30",
          config.variant === "default" && "bg-blue-100 dark:bg-blue-900/30"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            config.variant === "warning" && "text-amber-700 dark:text-amber-300",
            config.variant === "success" && "text-green-700 dark:text-green-300",
            config.variant === "destructive" && "text-red-700 dark:text-red-300",
            config.variant === "default" && "text-blue-700 dark:text-blue-300"
          )} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-base">{config.title}</h3>
          </div>
          <AlertDescription className="text-sm text-muted-foreground">
            {config.description(props)}
          </AlertDescription>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Następny krok:</span>
            <span className="text-muted-foreground">{config.nextStep}</span>
          </div>
        </div>
      </div>
    </Alert>
  );
}
