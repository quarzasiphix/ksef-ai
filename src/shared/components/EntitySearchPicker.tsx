/**
 * EntitySearchPicker - Universal entity search and selection component
 * 
 * Replaces the need for 10+ different entity pickers by providing a unified
 * search interface for all linkable entities (operations, invoices, contracts, etc.)
 * 
 * Features:
 * - Department-filtered search
 * - Type filtering (operations, invoices, contracts, decisions, vehicles, drivers)
 * - Real-time search with debouncing
 * - Recent items shown by default
 * - Visual department indicators
 * - Keyboard navigation
 * 
 * Usage:
 * <EntitySearchPicker
 *   businessProfileId={profileId}
 *   departmentId={deptId}
 *   entityTypes={['operation', 'invoice']}
 *   value={selectedEntityId}
 *   onSelect={(entity) => handleSelect(entity)}
 *   placeholder="Szukaj operacji, faktury..."
 * />
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, FileText, Truck, FileCheck, Building2, User, Car, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/lib/utils';
import { useDebounce } from '@/shared/hooks/useDebounce';

export type EntityType = 'operation' | 'invoice' | 'contract' | 'decision' | 'vehicle' | 'driver';

export interface LinkableEntity {
  entity_type: EntityType;
  entity_id: string;
  title: string;
  subtitle: string;
  department_id: string | null;
  department_name: string | null;
  department_color: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

interface EntitySearchPickerProps {
  businessProfileId: string;
  departmentId?: string;
  entityTypes?: EntityType[];
  value?: string;
  onSelect: (entity: LinkableEntity | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  operation: 'Operacja',
  invoice: 'Faktura',
  contract: 'Umowa',
  decision: 'Decyzja',
  vehicle: 'Pojazd',
  driver: 'Kierowca',
};

const ENTITY_TYPE_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  operation: Truck,
  invoice: FileText,
  contract: FileCheck,
  decision: Building2,
  vehicle: Car,
  driver: User,
};

export const EntitySearchPicker: React.FC<EntitySearchPickerProps> = ({
  businessProfileId,
  departmentId,
  entityTypes,
  value,
  onSelect,
  placeholder = 'Szukaj...',
  disabled = false,
  className,
  allowClear = true,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['linkable-entities', businessProfileId, departmentId, debouncedQuery, entityTypes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_linkable_entities', {
        p_business_profile_id: businessProfileId,
        p_department_id: departmentId || null,
        p_query: debouncedQuery || null,
        p_entity_types: entityTypes || null,
        p_limit: 20,
      });

      if (error) throw error;
      return data as LinkableEntity[];
    },
    enabled: !!businessProfileId && isOpen,
  });

  // Fetch selected entity display info
  const { data: selectedEntity } = useQuery({
    queryKey: ['entity-display', value],
    queryFn: async () => {
      if (!value) return null;
      
      // Try to find in current results first
      const found = entities.find(e => e.entity_id === value);
      if (found) return found;

      // Otherwise fetch from server
      // We need to know the entity type - for now, search all types
      const { data, error } = await supabase.rpc('search_linkable_entities', {
        p_business_profile_id: businessProfileId,
        p_department_id: null,
        p_query: null,
        p_entity_types: entityTypes || null,
        p_limit: 100,
      });

      if (error) throw error;
      return (data as LinkableEntity[]).find(e => e.entity_id === value) || null;
    },
    enabled: !!value && !!businessProfileId,
  });

  const handleSelect = (entity: LinkableEntity) => {
    onSelect(entity);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  const getEntityIcon = (type: EntityType) => {
    const Icon = ENTITY_TYPE_ICONS[type];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Selected entity display or search input */}
      {selectedEntity && !isOpen ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getEntityIcon(selectedEntity.entity_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedEntity.title}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedEntity.subtitle}</p>
            </div>
            {selectedEntity.department_color && (
              <Badge
                variant="outline"
                style={{
                  backgroundColor: `${selectedEntity.department_color}15`,
                  borderColor: selectedEntity.department_color,
                  color: selectedEntity.department_color,
                }}
              >
                {selectedEntity.department_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {allowClear && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              disabled={disabled}
            >
              Zmień
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Results */}
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border rounded-md shadow-lg">
            <ScrollArea className="max-h-[300px]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Wyszukiwanie...</p>
                </div>
              ) : entities.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {query ? 'Nie znaleziono wyników' : 'Zacznij wpisywać aby wyszukać'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {entities.map((entity) => (
                    <button
                      key={`${entity.entity_type}-${entity.entity_id}`}
                      type="button"
                      onClick={() => handleSelect(entity)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors focus:bg-muted/50 focus:outline-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getEntityIcon(entity.entity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{entity.title}</p>
                            <Badge variant="secondary" className="text-xs">
                              {ENTITY_TYPE_LABELS[entity.entity_type]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {entity.subtitle}
                          </p>
                        </div>
                        {entity.department_color && (
                          <Badge
                            variant="outline"
                            className="flex-shrink-0"
                            style={{
                              backgroundColor: `${entity.department_color}15`,
                              borderColor: entity.department_color,
                              color: entity.department_color,
                            }}
                          >
                            {entity.department_name}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
};
