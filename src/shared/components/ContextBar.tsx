/**
 * ContextBar - Universal context display for creation flows
 * 
 * Shows the user's current working scope at the top of create pages/dialogs:
 * - Department (locked if entered from department context)
 * - Primary link (Operation/Job, Vehicle, Driver, etc.)
 * - Target folder (for file uploads)
 * 
 * This solves 70% of UX complexity by making creation feel "personalized
 * based on where I am."
 * 
 * Usage:
 * <ContextBar
 *   department={department}
 *   departmentLocked={true}
 *   primaryLink={{ type: 'operation', id: jobId, title: 'TR/01/26' }}
 *   targetFolder={{ path: 'globalpet / test', id: folderId }}
 *   onChangeDepartment={() => ...}
 *   onChangePrimaryLink={() => ...}
 *   onChangeFolder={() => ...}
 * />
 */

import React from 'react';
import { Building2, Link as LinkIcon, Folder, ChevronRight, Lock, ExternalLink } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export interface ContextBarDepartment {
  id: string;
  name: string;
  color?: string;
  code?: string;
}

export interface ContextBarLink {
  type: 'operation' | 'vehicle' | 'driver' | 'contract' | 'decision' | 'invoice';
  id: string;
  title: string;
  subtitle?: string;
}

export interface ContextBarFolder {
  id: string;
  path: string;
  departmentName?: string;
}

interface ContextBarProps {
  department?: ContextBarDepartment | null;
  departmentLocked?: boolean;
  primaryLink?: ContextBarLink | null;
  targetFolder?: ContextBarFolder | null;
  onChangeDepartment?: () => void;
  onChangePrimaryLink?: () => void;
  onChangeFolder?: () => void;
  onClearPrimaryLink?: () => void;
  onOpenPrimaryLink?: () => void;
  className?: string;
  compact?: boolean;
}

const LINK_TYPE_LABELS: Record<ContextBarLink['type'], string> = {
  operation: 'Operacja',
  vehicle: 'Pojazd',
  driver: 'Kierowca',
  contract: 'Umowa',
  decision: 'Decyzja',
  invoice: 'Faktura',
};

export const ContextBar: React.FC<ContextBarProps> = ({
  department,
  departmentLocked = false,
  primaryLink,
  targetFolder,
  onChangeDepartment,
  onChangePrimaryLink,
  onChangeFolder,
  onClearPrimaryLink,
  onOpenPrimaryLink,
  className,
  compact = false,
}) => {
  const hasAnyContext = department || primaryLink || targetFolder;

  if (!hasAnyContext) {
    return null;
  }

  return (
    <div className={cn(
      'border rounded-lg bg-muted/30',
      compact ? 'p-3' : 'p-4',
      className
    )}>
      <div className={cn(
        'flex flex-wrap gap-3',
        compact ? 'gap-2' : 'gap-3'
      )}>
        {/* Department */}
        {department && (
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground flex-shrink-0">Dział:</span>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: department.color ? `${department.color}15` : undefined,
                  borderColor: department.color,
                  color: department.color,
                }}
                className="flex-shrink-0"
              >
                {department.name}
                {department.code && ` (${department.code})`}
              </Badge>
              {departmentLocked ? (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : onChangeDepartment ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={onChangeDepartment}
                >
                  Zmień
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {/* Primary Link */}
        {primaryLink && (
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                Powiązanie:
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <Badge variant="secondary" className="flex-shrink-0">
                  {LINK_TYPE_LABELS[primaryLink.type]}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {primaryLink.title}
                </span>
                {primaryLink.subtitle && (
                  <span className="text-xs text-muted-foreground truncate">
                    • {primaryLink.subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {onOpenPrimaryLink && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onOpenPrimaryLink}
                    title="Otwórz obiekt"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {onChangePrimaryLink && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={onChangePrimaryLink}
                  >
                    Zmień
                  </Button>
                )}
                {onClearPrimaryLink && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={onClearPrimaryLink}
                  >
                    Wyczyść
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Target Folder */}
        {targetFolder && (
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                Folder:
              </span>
              <div className="flex items-center gap-1 text-sm font-medium min-w-0">
                {targetFolder.departmentName && (
                  <>
                    <span className="flex-shrink-0">{targetFolder.departmentName}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </>
                )}
                <span className="truncate">{targetFolder.path}</span>
              </div>
              {onChangeFolder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs flex-shrink-0"
                  onClick={onChangeFolder}
                >
                  Zmień
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
