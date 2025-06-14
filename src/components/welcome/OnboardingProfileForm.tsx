
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface OnboardingProfileFormProps {
  onSuccess: () => void;
}

export interface OnboardingProfileFormHandle {
  submit: () => void;
}

const OnboardingProfileForm = forwardRef<OnboardingProfileFormHandle, OnboardingProfileFormProps>(({ onSuccess }, ref) => {
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast.error('Nie udało się zapisać profilu.');
    } else {
      toast.success('Profil został zapisany!');
      onSuccess();
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSave,
  }));

  if (loading) return <div className="text-center p-8">Ładowanie profilu...</div>;

  return (
    <Card className="w-full max-w-lg mx-auto bg-transparent border-none shadow-none">
      <CardContent className="p-0 pt-4">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-2 w-full">
                <Label htmlFor="avatar-url">Avatar URL (opcjonalnie)</Label>
                <Input
                  id="avatar-url"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="full-name">Imię i nazwisko</Label>
            <Input
              id="full-name"
              placeholder="Jan Kowalski"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone-number">Telefon (opcjonalnie)</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+48 123 456 789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default OnboardingProfileForm;
