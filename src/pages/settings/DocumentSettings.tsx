import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Settings, Share2 } from 'lucide-react';

const DocumentSettings = () => {
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
          <h1 className="text-2xl font-bold">Ustawienia dokumentów</h1>
          <p className="text-muted-foreground">Konfiguruj szablony faktur i numerację</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Numeracja dokumentów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Funkcja konfiguracji numeracji dokumentów będzie dostępna wkrótce.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Planowane funkcje</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Konfiguracja formatów numerów faktur</li>
                    <li>• Ustawienia szablonów dokumentów</li>
                    <li>• Automatyczna numeracja</li>
                    <li>• Resetowanie numeracji co rok</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shared Links management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Udostępnione linki
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Przeglądaj i usuwaj aktywne linki publiczne do Twoich dokumentów.</p>
          <Button onClick={() => navigate('/shares')}>Zarządzaj linkami</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentSettings;
