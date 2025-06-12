import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface OnboardingProfileFormProps {
  onSuccess: () => void;
}

const OnboardingProfileForm: React.FC<OnboardingProfileFormProps> = ({ onSuccess }) => {
  const { user, supabase } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const updates = {
      user_id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      avatar_url: avatarUrl,
    };
    const { error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast.error('Failed to save profile.');
    } else {
      toast.success('Profile saved!');
      onSuccess();
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 max-w-lg mx-auto mt-6 border border-blue-100 dark:border-blue-900">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300">
        Uzupełnij dane profilu użytkownika
      </h2>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="full-name">Imię i nazwisko</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone-number">Telefon</Label>
          <Input
            id="phone-number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="avatar-url">Avatar URL</Label>
          <Input
            id="avatar-url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        Zapisz profil
      </Button>
    </div>
  );
};

export default OnboardingProfileForm; 