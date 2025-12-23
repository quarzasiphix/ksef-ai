
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';

const BusinessProfiles = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/settings')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile biznesowe</h1>
          <p className="text-muted-foreground">Zarządzaj profilami swoich firm</p>
        </div>
      </div>

      {/* Content will be handled by the main settings page now */}
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Ta strona została przeniesiona do głównych ustawień</p>
        <Button onClick={() => navigate('/settings')} className="mt-4">
          Wróć do ustawień
        </Button>
      </div>
    </div>
  );
};

export default BusinessProfiles;
