
import React, { useEffect, useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessProfile } from "@/types";
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";

interface BusinessProfileSelectorProps {
  value?: string;
  onChange: (value: string, name?: string) => void;
}

export const BusinessProfileSelector: React.FC<BusinessProfileSelectorProps> = ({
  value,
  onChange,
}) => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const data = await getBusinessProfiles();
        setProfiles(data);
        
        // If no value is set and we have profiles, use the default one
        if (!value && data.length > 0) {
          const defaultProfile = data.find(p => p.isDefault) || data[0];
          onChange(defaultProfile.id, defaultProfile.name);
        }
      } catch (err) {
        console.error("Error loading business profiles:", err);
        setError("Nie udało się załadować profili biznesowych");
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [onChange, value]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Ładowanie profili...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
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
            {profile.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
