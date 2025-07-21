
import React, { useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessProfile } from "@/types";
import { useGlobalData } from "@/hooks/use-global-data";

interface BusinessProfileSelectorProps {
  value?: string;
  onChange: (value: string, name?: string) => void;
}

export const BusinessProfileSelector: React.FC<BusinessProfileSelectorProps> = ({
  value,
  onChange,
}) => {
  const { businessProfiles: { data: profiles, isLoading, error } } = useGlobalData();

  useEffect(() => {
    // If no value is set and we have profiles, use the default one
    if (!value && profiles.length > 0 && !isLoading) {
      const defaultProfile = profiles.find(p => p.isDefault) || profiles[0];
      onChange(defaultProfile.id, defaultProfile.name);
    }
  }, [profiles, isLoading, value, onChange]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Ładowanie profili...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Nie udało się załadować profili biznesowych</div>;
  }

  if (profiles.length === 0) {
    return <div className="text-sm text-amber-500">Brak profili biznesowych. Dodaj profil w ustawieniach.</div>;
  }

  return (
    <Select 
      value={value} 
      onValueChange={(val) => {
        const profile = profiles.find(p => p.id === val);
        onChange(val, profile?.name);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Wybierz profil biznesowy" />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{profile.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
