import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BusinessProfile } from '@/types';
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

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

  // Set default profile on initial load if available and no profile is selected
  useEffect(() => {
    if (!isLoadingProfiles && profiles && selectedProfileId === null) {
      const defaultProfile = profiles.find(p => p.isDefault);
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
      } else if (profiles.length > 0) {
        // If no default, select the first one
        setSelectedProfileId(profiles[0].id);
      }
    }
  }, [isLoadingProfiles, profiles, selectedProfileId]);

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
