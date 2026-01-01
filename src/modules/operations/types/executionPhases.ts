/**
 * Execution Phase Grouping for Operational Documents
 * 
 * Philosophy: Operational documents are execution artefacts, not central documents.
 * They answer: What was required? What was used? What happened? What was proven? What was produced?
 */

import type { LucideIcon } from 'lucide-react';
import { 
  ClipboardCheck, 
  Wrench, 
  Camera, 
  Scale, 
  FileOutput 
} from 'lucide-react';

/**
 * Execution Phase - Semantic grouping by job lifecycle stage
 */
export type ExecutionPhase = 'required' | 'resources' | 'proof' | 'legal' | 'output';

/**
 * Phase Status - Visual indicator for each phase
 */
export type PhaseStatus = 'complete' | 'pending' | 'missing' | 'attention';

/**
 * Execution Phase Metadata
 */
export interface ExecutionPhaseMeta {
  id: ExecutionPhase;
  label: string;
  emoji: string;
  description: string;
  question: string; // What this phase answers
  icon: LucideIcon;
  color: string;
  statusLabels: Record<PhaseStatus, string>;
}

export const EXECUTION_PHASES: Record<ExecutionPhase, ExecutionPhaseMeta> = {
  required: {
    id: 'required',
    label: 'Required documents',
    emoji: '🟡',
    description: 'What must exist before this job can run?',
    question: 'What was required?',
    icon: ClipboardCheck,
    color: '#f59e0b',
    statusLabels: {
      complete: 'Complete',
      pending: 'Pending',
      missing: 'Missing',
      attention: 'Expired',
    },
  },
  resources: {
    id: 'resources',
    label: 'Execution resources',
    emoji: '🔧',
    description: 'Who and what executed this job?',
    question: 'What was used?',
    icon: Wrench,
    color: '#3b82f6',
    statusLabels: {
      complete: 'Linked',
      pending: 'Pending',
      missing: 'Unverified',
      attention: 'Expired',
    },
  },
  proof: {
    id: 'proof',
    label: 'Proof of execution',
    emoji: '📸',
    description: 'Prove that the job actually happened',
    question: 'What happened?',
    icon: Camera,
    color: '#10b981',
    statusLabels: {
      complete: 'Verified',
      pending: 'Pending',
      missing: 'Missing',
      attention: 'Incomplete',
    },
  },
  legal: {
    id: 'legal',
    label: 'Legal & compliance',
    emoji: '⚖',
    description: 'What protects us legally?',
    question: 'What was proven?',
    icon: Scale,
    color: '#8b5cf6',
    statusLabels: {
      complete: 'Clear',
      pending: 'Under review',
      missing: 'Missing',
      attention: 'Attention required',
    },
  },
  output: {
    id: 'output',
    label: 'Generated outputs',
    emoji: '📄',
    description: 'What did this job generate?',
    question: 'What was produced?',
    icon: FileOutput,
    color: '#6b7280',
    statusLabels: {
      complete: 'Final',
      pending: 'Draft',
      missing: 'Not generated',
      attention: 'Needs update',
    },
  },
};

/**
 * Phase Readiness - Status per phase
 */
export interface PhaseReadiness {
  phase: ExecutionPhase;
  status: PhaseStatus;
  count: number; // Number of documents in this phase
  missing: string[]; // Missing required items
  expired: string[]; // Expired items
  message?: string; // Human-readable status message
}

/**
 * Overall Operational Readiness
 */
export interface OperationalReadiness {
  overall: 'ready' | 'pending' | 'blocked';
  phases: PhaseReadiness[];
  blockers: string[]; // Critical issues blocking execution
}

/**
 * Map document category to execution phase
 */
export function mapCategoryToPhase(category: string): ExecutionPhase {
  switch (category) {
    case 'contractual':
      return 'required';
    case 'compliance':
      return 'legal';
    case 'operational':
      // Operational docs can be proof or resources depending on template
      return 'proof';
    case 'financial':
      return 'output';
    case 'history':
      return 'output';
    default:
      return 'proof';
  }
}

/**
 * Map template ID to execution phase (more granular)
 */
export function mapTemplateToPhase(templateId: string): ExecutionPhase {
  // Required (before execution)
  if (templateId.includes('agreement') || 
      templateId.includes('order') || 
      templateId.includes('terms') ||
      templateId.includes('permit') ||
      templateId.includes('authorization')) {
    return 'required';
  }
  
  // Resources (what was used)
  if (templateId.includes('driver') || 
      templateId.includes('vehicle') || 
      templateId.includes('assignment') ||
      templateId.includes('equipment') ||
      templateId.includes('insurance')) {
    return 'resources';
  }
  
  // Proof (what happened)
  if (templateId.includes('protocol') || 
      templateId.includes('photo') || 
      templateId.includes('signature') ||
      templateId.includes('confirmation') ||
      templateId.includes('gps') ||
      templateId.includes('pod')) {
    return 'proof';
  }
  
  // Legal (compliance)
  if (templateId.includes('license') || 
      templateId.includes('waiver') || 
      templateId.includes('incident') ||
      templateId.includes('complaint') ||
      templateId.includes('certificate')) {
    return 'legal';
  }
  
  // Output (generated)
  if (templateId.includes('report') || 
      templateId.includes('settlement') || 
      templateId.includes('breakdown') ||
      templateId.includes('invoice') ||
      templateId.includes('summary')) {
    return 'output';
  }
  
  // Default to proof
  return 'proof';
}
