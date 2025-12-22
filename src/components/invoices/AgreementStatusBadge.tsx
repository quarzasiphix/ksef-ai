import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, MessageSquare, AlertCircle, XCircle, FileText, Send, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgreementStatus = 
  | 'draft' 
  | 'sent' 
  | 'received' 
  | 'under_discussion' 
  | 'correction_needed' 
  | 'approved' 
  | 'ready_for_ksef' 
  | 'rejected' 
  | 'cancelled';

interface AgreementStatusBadgeProps {
  status: AgreementStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<AgreementStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  draft: {
    label: "Wersja robocza",
    icon: FileText,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  },
  sent: {
    label: "Wysłano",
    icon: Send,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
  },
  received: {
    label: "Otrzymano",
    icon: Clock,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  },
  under_discussion: {
    label: "W trakcie uzgodnień",
    icon: MessageSquare,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
  },
  correction_needed: {
    label: "Wymaga korekty",
    icon: AlertCircle,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  },
  approved: {
    label: "Uzgodniono",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
  },
  ready_for_ksef: {
    label: "Zablokowano do księgowania",
    icon: Lock,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 font-semibold"
  },
  rejected: {
    label: "Odrzucono",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
  },
  cancelled: {
    label: "Anulowano",
    icon: XCircle,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }
};

export function AgreementStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true 
}: AgreementStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      className={cn(
        config.className,
        sizeClasses[size],
        "flex items-center gap-1.5 w-fit"
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}
