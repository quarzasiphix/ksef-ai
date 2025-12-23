
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ProfileSettings = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone_number || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        setProfile(null);
        setFullName('');
        setPhoneNumber('');
        setAvatarUrl('');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user || !supabase) return;
    setSaving(true);
    
    const updates = {
      user_id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      avatar_url: avatarUrl,
    };
    
    const { error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'user_id' });
    
    setSaving(false);
    
    if (error) {
      console.error('Error saving profile:', error);
      toast.error('Nie udało się zapisać profilu');
    } else {
      toast.success('Profil został zapisany');
    }
  };

  if (loading) {
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
        <div>
          <h1 className="text-2xl font-bold">Profil użytkownika</h1>
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
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
