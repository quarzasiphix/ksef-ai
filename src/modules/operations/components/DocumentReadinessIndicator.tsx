import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Shield } from 'lucide-react';
import type { DocumentReadiness, DocumentReadinessStatus } from '../types';

interface DocumentReadinessIndicatorProps {
  readiness: DocumentReadiness;
  showDetails?: boolean;
}

const statusConfig: Record<DocumentReadinessStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  ready: {
    icon: CheckCircle2,
    label: 'Gotowe',
    color: '#10b981',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    textColor: 'text-green-700 dark:text-green-300',
  },
  missing_recommended: {
    icon: AlertTriangle,
    label: 'Brakuje zalecanych',
    color: '#f59e0b',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  missing_required: {
    icon: XCircle,
    label: 'Brakuje wymaganych',
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    textColor: 'text-red-700 dark:text-red-300',
  },
};

export const DocumentReadinessIndicator: React.FC<DocumentReadinessIndicatorProps> = ({
  readiness,
  showDetails = false,
}) => {
  const config = statusConfig[readiness.status];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bgColor}`}>
        <Icon className={`h-5 w-5 ${config.textColor}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {config.label}
          </p>
          {readiness.compliance_blocked && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Zablokowane przez zgodność
              </p>
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 text-sm">
          {readiness.missing_required.length > 0 && (
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">
                  Brakuje wymaganych dokumentów ({readiness.missing_required.length}):
                </p>
                <ul className="list-disc list-inside text-red-600 dark:text-red-400 text-xs mt-1">
                  {readiness.missing_required.map((templateId) => (
                    <li key={templateId}>{templateId}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {readiness.missing_recommended.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300">
                  Brakuje zalecanych dokumentów ({readiness.missing_recommended.length}):
                </p>
                <ul className="list-disc list-inside text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  {readiness.missing_recommended.map((templateId) => (
                    <li key={templateId}>{templateId}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {readiness.expired.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-300">
                  Dokumenty przeterminowane ({readiness.expired.length}):
                </p>
                <ul className="list-disc list-inside text-orange-600 dark:text-orange-400 text-xs mt-1">
                  {readiness.expired.map((docId) => (
                    <li key={docId}>{docId}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentReadinessIndicator;
