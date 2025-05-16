
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BusinessProfileForm from './BusinessProfileForm';

const NewBusinessProfile = () => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nowy profil firmy</h1>
      </div>

      <BusinessProfileForm />
    </div>
  );
};

export default NewBusinessProfile;
