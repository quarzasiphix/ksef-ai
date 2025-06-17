
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';

interface RequirePremiumProps {
  children?: React.ReactNode;
  feature?: string;
}

const RequirePremium: React.FC<RequirePremiumProps> = ({ 
  children, 
  feature = "Ta funkcjonalność" 
}) => {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <Crown className="h-6 w-6 text-yellow-600" />
        </div>
        <CardTitle>Funkcja Premium</CardTitle>
        <CardDescription>
          {feature} jest dostępna tylko dla użytkowników Premium
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button className="w-full">
          Przejdź na Premium
        </Button>
      </CardContent>
    </Card>
  );
};

export default RequirePremium;
