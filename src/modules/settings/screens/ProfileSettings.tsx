
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/shared/hooks/useAuth";
import { useOptimisticQuery } from '@/shared/hooks/useOptimisticQuery';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ArrowLeft, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ProfileSettings = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Use optimistic query - shows cached data immediately, refetches in background
  const { data: profile, isLoading, isBackgroundRefetching } = useOptimisticQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  // Update form fields when profile data loads
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Use mutation for saving with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !supabase) throw new Error('Not authenticated');
      
      const updates = {
        user_id: user.id,
        full_name: fullName,
        phone_number: phoneNumber,
        avatar_url: avatarUrl,
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'user_id' });
      
      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Profil został zapisany');
    },
    onError: (error) => {
      console.error('Error saving profile:', error);
      toast.error('Nie udało się zapisać profilu');
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  // Only show loading spinner on first load (no cached data)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Profil użytkownika</h1>
            {isBackgroundRefetching && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground">Zarządzaj swoimi danymi osobowymi</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dane osobowe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Email nie może być zmieniony
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Imię i nazwisko</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Wprowadź imię i nazwisko"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Telefon</Label>
            <Input
              id="phone-number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Wprowadź numer telefonu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">URL avatara</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Wprowadź URL do zdjęcia profilowego"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="min-w-[120px]"
            >
              {saveMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
