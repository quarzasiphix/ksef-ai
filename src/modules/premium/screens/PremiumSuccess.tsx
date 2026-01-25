import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { CheckCircle2, ArrowRight, Home, FileText } from 'lucide-react';

export const PremiumSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Płatność zakończona sukcesem!</h1>
        <p className="text-gray-600">
          Gratulacje! Twoja subskrypcja Premium została aktywowana.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Co dalej?</CardTitle>
          <CardDescription>
            Twoje funkcje Premium są już dostępne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Nieograniczona liczba faktur</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Zaawansowane raporty finansowe</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Integracja z KSeF</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Eksport JPK</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Automatyczne obliczenia podatkowe</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Button asChild className="w-full">
          <Link to="/dashboard">
            <Home className="h-4 w-4 mr-2" />
            Przejdź do dashboardu
          </Link>
        </Button>
        
        <Button variant="outline" asChild className="w-full">
          <Link to="/income">
            <FileText className="h-4 w-4 mr-2" />
            Stwórz fakturę
          </Link>
        </Button>
      </div>

      {sessionId && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ID transakcji: {sessionId}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Potwierdzenie zostało wysłane na Twój adres e-mail
          </p>
        </div>
      )}
    </div>
  );
};
