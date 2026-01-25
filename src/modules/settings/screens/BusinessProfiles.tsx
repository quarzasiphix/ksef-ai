
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Check, Shield, Sparkles, Users, Crown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { Skeleton } from '@/shared/ui/skeleton';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { usePremium } from '@/shared/context/PremiumContext';
import type { BusinessProfile } from '@/shared/types';

const BusinessProfiles = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const { allBusinessesStatus } = usePremium();
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  const handleCreateProfile = () => navigate('/settings/business-profiles/new');
  const handleEditProfile = (profileId: string) => navigate(`/settings/business-profiles/${profileId}/edit`);
  
  const getBusinessPremiumStatus = (businessId: string) => {
    return allBusinessesStatus.find(status => status.business_profile_id === businessId);
  };

  if (isLoadingProfiles) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 px-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const renderProfileCard = (profile: BusinessProfile) => {
    const isActive = profile.id === selectedProfileId;
    const businessPremiumStatus = getBusinessPremiumStatus(profile.id);
    const hasBusinessPremium = businessPremiumStatus?.has_premium;
    const isEnterpriseCovered = businessPremiumStatus?.covers_all_businesses;
    
    return (
      <Card
        key={profile.id}
        className="border border-white/5 bg-card/80 backdrop-blur transition hover:border-primary"
      >
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {profile.name}
              {(hasBusinessPremium || isEnterpriseCovered) && (
                <Badge variant="default" className="ml-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  {isEnterpriseCovered ? 'Enterprise' : 'Premium'}
                </Badge>
              )}
              {profile.isDefault && (
                <Badge variant="secondary" className="ml-1">
                  Domyślna
                </Badge>
              )}
              {isActive && (
                <Badge variant="outline" className="ml-1 text-primary border-primary/40">
                  Aktywna teraz
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {profile.entityType?.toUpperCase() || 'Forma prawna nieznana'}
              {isEnterpriseCovered && (
                <span className="ml-2 text-amber-500">
                  ⭐ Pokryta przez enterprise
                </span>
              )}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectProfile(profile.id)}
            >
              {isActive ? (
                <>
                  <Check className="h-4 w-4 mr-1" /> Aktywna
                </>
              ) : (
                'Ustaw jako aktywną'
              )}
            </Button>
            {!hasBusinessPremium && !isEnterpriseCovered && (
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                onClick={() => navigate(`/premium/checkout?business=${profile.id}`)}
              >
                <Crown className="h-4 w-4 mr-1" />
                Kup Premium
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleEditProfile(profile.id)}>
              Edytuj
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">NIP</p>
              <p className="font-medium">{profile.taxId || 'Nie podano'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Adres</p>
              <p className="font-medium">
                {profile.address || profile.city
                  ? `${profile.address || ''}${profile.address && profile.city ? ', ' : ''}${profile.city || ''}`
                  : 'Nie podano'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">VAT</p>
              <p className="font-medium">
                {profile.is_vat_exempt ? (
                  <span className="inline-flex items-center gap-1 text-yellow-400">
                    <Shield className="h-4 w-4" /> Zwolniony
                  </span>
                ) : (
                  'Czynny podatnik'
                )}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-4 w-4" /> Profil aktywny od {profile.establishment_date || 'brak danych'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-4 w-4" /> {profile.tax_type ? profile.tax_type.toUpperCase() : 'Podatek: domyślny'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 px-4 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profile biznesowe</h1>
            <p className="text-muted-foreground">
              Zarządzaj firmami i decyduj, która jest aktywna w systemie. 
              Każda firma może mieć własną subskrypcję premium.
            </p>
          </div>
        </div>
        <Button onClick={handleCreateProfile}>Dodaj firmę</Button>
      </div>

      {profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-lg font-medium">Nie masz jeszcze żadnej firmy</p>
            <p className="text-muted-foreground">Dodaj nieograniczoną liczbę firm. Każda może mieć własną subskrypcję premium.</p>
            <Button onClick={handleCreateProfile} className="mt-2">
              Utwórz pierwszy profil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {selectedProfile && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Aktywna firma</CardTitle>
                <CardDescription>
                  Wszystkie działania w systemie dotyczą teraz firmy <strong>{selectedProfile.name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-4 w-4" /> {selectedProfile.entityType || 'Forma prawna'}
                </Badge>
                <Badge variant="outline">NIP: {selectedProfile.taxId || '---'}</Badge>
              </CardContent>
            </Card>
          )}

          {profiles.map(renderProfileCard)}
        </div>
      )}
    </div>
  );
};

export default BusinessProfiles;
