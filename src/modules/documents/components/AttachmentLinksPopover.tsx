import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link as LinkIcon, ExternalLink } from 'lucide-react';
import { ATTACHMENT_ROLE_LABELS, ENTITY_TYPE_LABELS } from '@/shared/types/attachment';

interface AttachmentLinksPopoverProps {
  fileId: string;
  linkCount: number;
  children: React.ReactNode;
}

/**
 * Popover showing all business entities linked to a file
 * Makes the attachment graph visible in the repository
 */
export const AttachmentLinksPopover: React.FC<AttachmentLinksPopoverProps> = ({
  fileId,
  linkCount,
  children,
}) => {
  const navigate = useNavigate();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['attachment-links', fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachment_links_detailed')
        .select('*')
        .eq('storage_file_id', fileId)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getEntityRoute = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'decision':
        return `/decisions/${entityId}`;
      case 'contract':
        return `/documents/contracts/${entityId}`;
      case 'ledger_event':
        return `/ledger/${entityId}`;
      case 'invoice':
        return `/invoices/${entityId}`;
      case 'operation':
        return `/operations/${entityId}`;
      case 'capital_transaction':
        return `/capital/${entityId}`;
      default:
        return null;
    }
  };

  if (linkCount === 0) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Powiązania ({linkCount})</h4>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Ładowanie...</p>
          ) : links.length === 0 ? (
            <p className="text-xs text-muted-foreground">Brak powiązań</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const route = getEntityRoute(link.entity_type, link.entity_id);
                const entityLabel = ENTITY_TYPE_LABELS[link.entity_type as keyof typeof ENTITY_TYPE_LABELS] || link.entity_type;
                const roleLabel = ATTACHMENT_ROLE_LABELS[link.role as keyof typeof ATTACHMENT_ROLE_LABELS] || link.role;

                return (
                  <div
                    key={link.attachment_id}
                    className="p-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entityLabel}
                          </Badge>
                          {link.entity_status && (
                            <Badge variant="secondary" className="text-xs">
                              {link.entity_status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {link.entity_display_name || link.entity_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {roleLabel}
                        </p>
                        {link.note && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {link.note}
                          </p>
                        )}
                      </div>
                      {route && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(route);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
