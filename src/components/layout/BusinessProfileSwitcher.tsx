import React from 'react';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/utils';

interface BusinessProfileSwitcherProps {
  isCollapsed?: boolean;
}

export const BusinessProfileSwitcher: React.FC<BusinessProfileSwitcherProps> = ({
  isCollapsed = false
}) => {
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const { isPremium, openPremiumDialog } = useAuth();

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  
  // Debug logging
  console.log('BusinessProfileSwitcher:', {
    selectedProfileId,
    profiles: profiles.map(p => ({ id: p.id, name: p.name, is_vat_exempt: p.is_vat_exempt })),
    selectedProfile: selectedProfile ? { id: selectedProfile.id, name: selectedProfile.name, is_vat_exempt: selectedProfile.is_vat_exempt } : null
  });

  const handleAddProfile = () => {
    // Allow all users to add new profiles, premium will be checked during creation
    window.location.href = '/settings/business-profiles/new';
  };

  if (isLoadingProfiles) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {!isCollapsed && <span className="text-sm text-muted-foreground">Ładowanie...</span>}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/settings/business-profiles/new'}
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Dodaj profil'}
        </Button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full text-left font-normal bg-muted border border-muted-foreground/10 hover:bg-muted/80 cursor-pointer shadow-sm",
              isCollapsed ? "px-0 justify-center" : "px-3 justify-between"
            )}
          >
            <div className={cn("flex items-center min-w-0", isCollapsed ? "" : "gap-2")}>
              <Building2 className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && selectedProfile && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-sm">
                    {selectedProfile.name}
                  </span>
                  <span className="bg-slate-200 dark:bg-slate-700 rounded px-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
                    {selectedProfile.entityType === 'sp_zoo' ? 'Sp. z o.o.' : selectedProfile.entityType === 'sa' ? 'S.A.' : 'DG'}
                  </span>
                  {selectedProfile.is_vat_exempt && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded px-1.5 text-[10px] font-semibold flex-shrink-0" title="Zwolniony z VAT">
                      ZW
                    </span>
                  )}
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronDown className="h-4 w-4 flex-shrink-0" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              onClick={() => selectProfile(profile.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                selectedProfileId === profile.id && "bg-accent"
              )}
            >
              <Building2 className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {profile.name}
                  </span>
                  {profile.is_vat_exempt && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded px-1.5 text-[9px] font-semibold flex-shrink-0" title="Zwolniony z VAT">
                      ZW
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  NIP: {profile.taxId}
                  <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-[9px]">
                    {profile.entityType === 'sp_zoo' ? 'Sp. z o.o.' : profile.entityType === 'sa' ? 'S.A.' : 'DG'}
                  </span>
                </div>
              </div>
              {profile.isDefault && (
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Domyślny
                </div>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddProfile} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            <span>Dodaj profil</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.location.href = '/settings/business-profiles'}
            className="cursor-pointer"
          >
            <Building2 className="h-4 w-4 mr-2" />
            <span>Zarządzaj profilami</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
