import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BusinessProfile } from '@/shared/types';
import { getBusinessProfiles } from '@/modules/settings/data/businessProfileRepository';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { syncManager } from '@/shared/services/syncManager';

const getSelectedProfileStorageKey = (userId: string) => `selected_business_profile_id:${userId}`;

interface BusinessProfileContextType {
  selectedProfileId: string | null;
  selectProfile: (id: string | null) => void;
  profiles: BusinessProfile[];
  isLoadingProfiles: boolean;
}

const BusinessProfileContext = createContext<BusinessProfileContextType | undefined>(undefined);

export const BusinessProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [hasRestoredSelection, setHasRestoredSelection] = useState(false);

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<BusinessProfile[]> ({
    queryKey: ['businessProfiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (user?.id) {
        return getBusinessProfiles(user.id);
      }
      return [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Restore selected profile from localStorage (per-user)
  useEffect(() => {
    if (!user?.id) {
      setSelectedProfileId(null);
      setHasRestoredSelection(false);
      return;
    }

    try {
      const saved = localStorage.getItem(getSelectedProfileStorageKey(user.id));
      if (saved) {
        setSelectedProfileId(saved);
      } else {
        setSelectedProfileId(null);
      }
    } catch {
      setSelectedProfileId(null);
    } finally {
      setHasRestoredSelection(true);
    }
  }, [user?.id]);

  // Set default profile on initial load if available and no profile is selected
  useEffect(() => {
    if (!hasRestoredSelection) return;
    if (isLoadingProfiles || !profiles) return;

    // If a selected profile exists but is not in the loaded list, fall back.
    const selectedExists = selectedProfileId ? profiles.some(p => p.id === selectedProfileId) : false;
    if (selectedProfileId && !selectedExists) {
      setSelectedProfileId(null);
      return;
    }

    // If none selected, choose saved/default/first.
    if (selectedProfileId === null) {
      const defaultProfile = profiles.find(p => p.isDefault);
      const nextId = defaultProfile?.id || profiles[0]?.id || null;
      if (nextId) {
        setSelectedProfileId(nextId);
      }
    }
  }, [isLoadingProfiles, profiles, selectedProfileId]);

  // Persist selection to localStorage
  useEffect(() => {
    if (!user?.id) return;
    if (!hasRestoredSelection) return;
    const key = getSelectedProfileStorageKey(user.id);

    try {
      if (selectedProfileId) {
        localStorage.setItem(key, selectedProfileId);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.id, selectedProfileId, hasRestoredSelection]);

  // Start/stop sync manager when business profile changes
  useEffect(() => {
    if (!selectedProfileId) {
      syncManager.stop();
      return;
    }

    // Start background sync for the selected profile
    syncManager.start(selectedProfileId);

    // Cleanup on unmount or profile change
    return () => {
      syncManager.stop();
    };
  }, [selectedProfileId]);

  const selectProfile = (id: string | null) => {
    setSelectedProfileId(id);
  };

  return (
    <BusinessProfileContext.Provider value={{
      selectedProfileId,
      selectProfile,
      profiles: profiles || [],
      isLoadingProfiles,
    }}>
      {children}
    </BusinessProfileContext.Provider>
  );
};

export const useBusinessProfile = () => {
  const context = useContext(BusinessProfileContext);
  if (context === undefined) {
    throw new Error('useBusinessProfile must be used within a BusinessProfileProvider');
  }
  return context;
};
