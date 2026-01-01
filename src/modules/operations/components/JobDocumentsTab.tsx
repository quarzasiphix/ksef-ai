import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  Upload, Download, Eye, Lock, AlertCircle, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { 
  JobDocument, 
  DocumentReadiness,
} from '../types';
import type { DocumentTemplate } from '../types/documentCategories';
import { 
  EXECUTION_PHASES, 
  mapTemplateToPhase,
  type ExecutionPhase,
  type PhaseStatus,
  type PhaseReadiness,
} from '../types/executionPhases';

interface JobDocumentsTabProps {
  jobId: string;
  jobStatus: string;
  documents: JobDocument[];
  readiness: DocumentReadiness;
  availableTemplates?: DocumentTemplate[];
  onUpload?: (phase: ExecutionPhase, templateId?: string) => void;
  onView?: (document: JobDocument) => void;
  onDownload?: (document: JobDocument) => void;
}


export const JobDocumentsTab: React.FC<JobDocumentsTabProps> = ({
  jobId,
  jobStatus,
  documents,
  readiness,
  availableTemplates = [],
  onUpload,
  onView,
  onDownload,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<ExecutionPhase>>(
    new Set(['required', 'resources', 'proof', 'legal', 'output'])
  );

  const togglePhase = (phase: ExecutionPhase) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const getDocumentsByPhase = (phase: ExecutionPhase): JobDocument[] => {
    return documents.filter(d => {
      const docPhase = d.template_id ? mapTemplateToPhase(d.template_id) : mapTemplateToPhase(d.category || '');
      return docPhase === phase;
    });
  };

  const getTemplatesByPhase = (phase: ExecutionPhase): DocumentTemplate[] => {
    return availableTemplates.filter(t => mapTemplateToPhase(t.id) === phase);
  };

  const calculatePhaseReadiness = useMemo((): PhaseReadiness[] => {
    const phases: ExecutionPhase[] = ['required', 'resources', 'proof', 'legal', 'output'];
    return phases.map(phase => {
      const phaseDocs = getDocumentsByPhase(phase);
      const phaseTemplates = getTemplatesByPhase(phase);
      const requiredTemplates = phaseTemplates.filter(t => t.required);
      const missing = requiredTemplates
        .filter(t => !phaseDocs.some(d => d.template_id === t.id))
        .map(t => t.name_pl);
      const expired = phaseDocs.filter(d => d.expired).map(d => d.title);

      let status: PhaseStatus = 'complete';
      let message = '';

      if (missing.length > 0) {
        status = 'missing';
        message = `${missing.length} missing`;
      } else if (expired.length > 0) {
        status = 'attention';
        message = `${expired.length} expired`;
      } else if (phaseDocs.length === 0 && requiredTemplates.length === 0) {
        status = 'pending';
        message = 'No documents';
      } else {
        message = 'Complete';
      }

      return {
        phase,
        status,
        count: phaseDocs.length,
        missing,
        expired,
        message,
      };
    });
  }, [documents, availableTemplates]);

  const getPhaseStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'attention':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const renderPhasePanel = (phaseReadiness: PhaseReadiness) => {
    const { phase, status, count, missing, expired, message } = phaseReadiness;
    const meta = EXECUTION_PHASES[phase];
    const Icon = meta.icon;
    const phaseDocs = getDocumentsByPhase(phase);
    const phaseTemplates = getTemplatesByPhase(phase);
    const isExpanded = expandedPhases.has(phase);

    return (
      <Card key={phase} className="border-l-4" style={{ borderLeftColor: meta.color }}>
        <CardHeader className="cursor-pointer" onClick={() => togglePhase(phase)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="p-2 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    {meta.emoji} {meta.label}
                  </CardTitle>
                  {getPhaseStatusIcon(status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status === 'missing' ? 'destructive' : status === 'attention' ? 'default' : 'outline'}>
                {meta.statusLabels[status]}: {message}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
            {phaseDocs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No {meta.label.toLowerCase()} yet</p>
                {missing.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Missing: {missing.join(', ')}
                  </p>
                )}
                {onUpload && phaseTemplates.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {phaseTemplates.slice(0, 3).map(template => (
                      <Button
                        key={template.id}
                        size="sm"
                        variant="outline"
                        onClick={() => onUpload(phase, template.id)}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {template.name_pl}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {phaseDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        {doc.locked && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {doc.template_id && (
                          <Badge variant="secondary" className="text-xs">
                            {availableTemplates.find(t => t.id === doc.template_id)?.name_pl || doc.template_id}
                          </Badge>
                        )}
                        {doc.expired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {doc.valid_to && !doc.expired && (
                          <span className="text-xs text-muted-foreground">
                            Valid until: {new Date(doc.valid_to).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {onView && (
                        <Button size="sm" variant="ghost" onClick={() => onView(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onDownload && doc.file_url && (
                        <Button size="sm" variant="ghost" onClick={() => onDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {missing.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  Missing required:
                </p>
                <ul className="space-y-1">
                  {missing.map((item, idx) => (
                    <li key={idx} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {expired.length > 0 && (
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                  Expired documents:
                </p>
                <ul className="space-y-1">
                  {expired.map((item, idx) => (
                    <li key={idx} className="text-xs text-orange-600 dark:text-orange-400">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Strip - At-a-glance operational readiness */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {calculatePhaseReadiness.map(pr => {
              const meta = EXECUTION_PHASES[pr.phase];
              return (
                <div
                  key={pr.phase}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                    pr.status === 'missing' && 'border-red-200 bg-red-50 dark:bg-red-950/20',
                    pr.status === 'attention' && 'border-orange-200 bg-orange-50 dark:bg-orange-950/20',
                    pr.status === 'pending' && 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20',
                    pr.status === 'complete' && 'border-green-200 bg-green-50 dark:bg-green-950/20'
                  )}
                >
                  <span className="font-medium">{meta.label}:</span>
                  {getPhaseStatusIcon(pr.status)}
                  <span className={cn(
                    'text-xs',
                    pr.status === 'missing' && 'text-red-700 dark:text-red-300',
                    pr.status === 'attention' && 'text-orange-700 dark:text-orange-300',
                    pr.status === 'pending' && 'text-yellow-700 dark:text-yellow-300',
                    pr.status === 'complete' && 'text-green-700 dark:text-green-300'
                  )}>
                    {pr.message}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Execution Phase Panels */}
      <div className="space-y-4">
        {calculatePhaseReadiness.map(pr => renderPhasePanel(pr))}
      </div>
    </div>
  );
};

export default JobDocumentsTab;
