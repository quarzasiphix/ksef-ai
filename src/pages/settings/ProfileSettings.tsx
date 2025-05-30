import React, { useState, useEffect } from 'react';
import { useAuth } from '@/App';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types'; // Import Database type
import { Link } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ProfileSettings: React.FC = () => {
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
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile.');
        setProfile(null);
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone_number || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
         // If no profile exists (e.g., for users signed up before the trigger was added)
         // We might want to create one here or prompt the user.
         // For now, just set loading to false and leave fields empty.
         console.warn('No profile found for user. Fields will be empty.');
         setProfile(null);
         setFullName('');
         setPhoneNumber('');
         setAvatarUrl('');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, supabase]); // Refetch if user or supabase client changes

  const handleSave = async () => {
    if (!user || !supabase) return;

    setLoading(true);

    const updates = {
      user_id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      avatar_url: avatarUrl,
      // Add other fields here
    };

    // Use upsert to either insert a new profile or update the existing one
    const { error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'user_id' }); // Conflicts on user_id (primary key)

    if (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile.');
    } else {
      toast.success('Profile saved!');
      // Optionally re-fetch profile to ensure state is in sync
      // fetchProfile(); // This might cause a loop if not careful, rely on RLS and local state for now
    }

    setLoading(false);
  };

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your personal profile information.</p>
      </div>

      {/* Link to Business Profiles Settings */}
      <div className="mt-6">
        <Link to="/settings/business-profiles" className="text-blue-600 hover:underline">
          Go to Business Profiles Settings
        </Link>
      </div>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone-number">Phone Number</Label>
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
        {/* Add more fields here as needed */}
      </div>

      <Button onClick={handleSave} disabled={loading}>
        Save Profile
      </Button>
    </div>
  );
};

export default ProfileSettings; 