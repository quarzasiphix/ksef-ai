import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useAuth } from "@/shared/hooks/useAuth";
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/shared/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
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
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const draftKey = `onboarding:profile:${user.id}`;
      let draft: { fullName?: string; phoneNumber?: string; avatarUrl?: string } | null = null;
      if (typeof window !== 'undefined') {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          try {
            draft = JSON.parse(rawDraft);
          } catch {
            draft = null;
          }
        }
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        setProfile(null);
        toast.error("Nie udało się pobrać danych profilu.");
      } else {
        if (data) {
          setProfile(data);
        } else {
          setProfile(null);
        }
        setFullName(draft?.fullName ?? data?.full_name ?? '');
        setPhoneNumber(draft?.phoneNumber ?? data?.phone_number ?? '');
        setAvatarUrl(draft?.avatarUrl ?? data?.avatar_url ?? '');
      }
      setLoading(false);
      hasLoadedRef.current = true;
    };
    fetchProfile();
  }, [user, supabase]);

  useEffect(() => {
    if (!user?.id) return;
    if (!hasLoadedRef.current) return;
    if (typeof window === 'undefined') return;

    const draftKey = `onboarding:profile:${user.id}`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ fullName, phoneNumber, avatarUrl })
    );
  }, [user?.id, fullName, phoneNumber, avatarUrl]);

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
      toast.error('Nie udało się zapisać profilu.');
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`onboarding:profile:${user.id}`);
      }
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
