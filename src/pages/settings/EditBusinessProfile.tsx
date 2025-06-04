import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import BusinessProfileForm from './BusinessProfileForm';
import { getBusinessProfileById } from '@/integrations/supabase/repositories/businessProfileRepository';
import { BusinessProfile } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const EditBusinessProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      if (!id || !user?.id) {
        setLoading(false);
        return;
      }
      try {
        const foundProfile = await getBusinessProfileById(id, user.id);
        if (foundProfile) {
          setProfile(foundProfile);
        }
      } catch (error) {
        console.error("Error loading business profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, user]);

  if (loading) {
    return <div className="text-center p-10">Ładowanie...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center p-10">
        <p>Nie znaleziono profilu firmy.</p>
        <Button asChild className="mt-4">
          <Link to="/settings">Wróć do listy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edytuj profil firmy</h1>
      </div>

      <BusinessProfileForm initialData={profile} />
    </div>
  );
};

export default EditBusinessProfile;
