import React from 'react';
import { MultiBusinessCheckout } from '../components/MultiBusinessCheckout';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';

export const PremiumCheckout: React.FC = () => {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/premium">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do planów
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wykup Premium dla swoich firm</h1>
        <p className="text-gray-600">
          Wybierz firmy, dla których chcesz aktywować funkcje Premium i cykl rozliczeniowy
        </p>
      </div>

      <MultiBusinessCheckout />
    </div>
  );
};
