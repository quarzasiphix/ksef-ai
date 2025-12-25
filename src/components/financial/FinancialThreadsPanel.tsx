import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpenTab } from '@/shared/hooks/useOpenTab';
import { 
  CreditCard, 
  FileText, 
  Building2, 
  TrendingDown,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { motion } from 'framer-motion';

interface RelatedEntity {
  id: string;
  type: 'expense' | 'bank' | 'contract' | 'customer';
  title: string;
  subtitle?: string;
  amount?: number;
  status?: 'pending' | 'completed' | 'overdue';
  metadata?: Record<string, any>;
}

interface FinancialThreadsPanelProps {
  entityId: string;
  entityType: 'invoice' | 'expense' | 'contract';
  relatedEntities?: RelatedEntity[];
  className?: string;
}

const ENTITY_CONFIG = {
  expense: {
    icon: TrendingDown,
    label: 'Wydatki',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  bank: {
    icon: CreditCard,
    label: 'Transakcje bankowe',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  contract: {
    icon: FileText,
    label: 'Umowy',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  customer: {
    icon: Building2,
    label: 'Klienci',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
  },
};

const RelatedEntityChip: React.FC<{
  entity: RelatedEntity;
  onClick: () => void;
}> = ({ entity, onClick }) => {
  const config = ENTITY_CONFIG[entity.type];
  const Icon = config.icon;

  const statusColors = {
    pending: 'text-yellow-500',
    completed: 'text-green-500',
    overdue: 'text-red-500',
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative w-full flex items-start gap-3 p-3 rounded-lg border transition-all",
        "hover:shadow-md",
        config.bgColor,
        config.borderColor,
        "text-left"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
        config.bgColor,
        "ring-1 ring-white/10"
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entity.title}
            </p>
            {entity.subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {entity.subtitle}
              </p>
            )}
          </div>
          
          {entity.amount && (
            <span className="text-sm font-semibold whitespace-nowrap">
              {new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: 'PLN',
              }).format(entity.amount)}
            </span>
          )}
        </div>

        {/* Status indicator */}
        {entity.status && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              entity.status === 'completed' && "bg-green-500",
              entity.status === 'pending' && "bg-yellow-500",
              entity.status === 'overdue' && "bg-red-500"
            )} />
            <span className={cn(
              "text-xs font-medium",
              statusColors[entity.status]
            )}>
              {entity.status === 'completed' && 'Rozliczone'}
              {entity.status === 'pending' && 'Oczekujące'}
              {entity.status === 'overdue' && 'Zaległe'}
            </span>
          </div>
        )}
      </div>

      {/* Hover arrow */}
      <ChevronRight className={cn(
        "h-4 w-4 text-muted-foreground transition-transform",
        "group-hover:translate-x-0.5"
      )} />
    </motion.button>
  );
};

export const FinancialThreadsPanel: React.FC<FinancialThreadsPanelProps> = ({
  entityId,
  entityType,
  relatedEntities = [],
  className,
}) => {
  const navigate = useNavigate();
  const { openInvoiceTab, openExpenseTab, openContractTab, openCustomerTab } = useOpenTab();

  // Group entities by type
  const groupedEntities = relatedEntities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, RelatedEntity[]>);

  const handleEntityClick = (entity: RelatedEntity) => {
    // Open entity in a new tab based on type
    switch (entity.type) {
      case 'expense':
        openExpenseTab(entity.id, entity.title);
        break;
      case 'contract':
        openContractTab(entity.id, entity.title);
        break;
      case 'customer':
        openCustomerTab(entity.id, entity.title);
        break;
      case 'bank':
        // Navigate to bank transactions with filter
        navigate(`/bank?transaction=${entity.id}`);
        break;
    }
  };

  if (relatedEntities.length === 0) {
    return (
      <div className={cn(
        "rounded-lg border border-dashed border-white/10 p-6 text-center",
        className
      )}>
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Brak powiązanych dokumentów
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Powiązania można dodać ręcznie w ustawieniach dokumentu
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Powiązane dokumenty
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Grouped entities */}
      {Object.entries(groupedEntities).map(([type, entities]) => {
        const config = ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG];
        const Icon = config.icon;

        return (
          <div key={type} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center gap-2 px-1">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="text-xs font-medium text-muted-foreground">
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({entities.length})
              </span>
            </div>

            {/* Entity chips */}
            <div className="space-y-2">
              {entities.map((entity) => (
                <RelatedEntityChip
                  key={entity.id}
                  entity={entity}
                  onClick={() => handleEntityClick(entity)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Summary footer */}
      <div className="pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Łącznie powiązań</span>
          <span className="font-semibold">{relatedEntities.length}</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialThreadsPanel;
