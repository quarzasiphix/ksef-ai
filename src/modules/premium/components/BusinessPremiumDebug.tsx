import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { usePremium } from '@/modules/premium/context/PremiumContext';
import type { PremiumContextType } from '@/modules/premium/context/PremiumContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { Badge } from '@/shared/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { Crown, Building, User, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const BusinessPremiumDebug: React.FC = () => {
  const { user } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const { hasPremium, level, subscriptionType, features, expiresAt, source, isLoading, hasUserLevelPremium } = usePremium();
  const queryClient = useQueryClient();

  // TEMPORARY DEBUG: Check if force override is active
  const forceBusinessChecks = true; // Should match PremiumContext

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  const refreshPremiumStatus = () => {
    console.log('[BusinessPremiumDebug] Manually refreshing premium status');
    // Invalidate all premium-related queries aggressively
    queryClient.invalidateQueries({ queryKey: ['user-level-premium'] });
    queryClient.invalidateQueries({ queryKey: ['business-premium'] });
    queryClient.removeQueries({ queryKey: ['user-level-premium'] });
    queryClient.removeQueries({ queryKey: ['business-premium'] });
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'enterprise': return 'bg-purple-500';
      case 'user': return 'bg-blue-500';
      case 'business': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'enterprise_subscription': return 'bg-purple-100 text-purple-800';
      case 'user_subscription': return 'bg-blue-100 text-blue-800';
      case 'business_subscription': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Business Premium Debug
          </CardTitle>
          <CardDescription>
            Debug premium status based on selected business profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button onClick={refreshPremiumStatus} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Premium Status
            </Button>
          </div>

          {/* User Info */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">User Info</h4>
            <div className="space-y-1 text-sm">
              <p><strong>ID:</strong> {user?.id}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>
          </div>

          {/* Hierarchical Premium Check Status */}
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4 text-blue-500" />
              Hierarchical Premium Check
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon status={hasUserLevelPremium} />
                <span className="font-medium">User-Level Premium:</span>
                <Badge className={hasUserLevelPremium ? 'bg-green-500' : 'bg-gray-500'}>
                  {hasUserLevelPremium ? 'YES - Covers All Businesses' : 'NO - Check Per Business'}
                </Badge>
              </div>
              {hasUserLevelPremium ? (
                <div className="ml-6 p-2 bg-green-100 dark:bg-green-900 rounded text-xs">
                  ✓ User has enterprise or user-level premium. Business-level checks are skipped for performance.
                </div>
              ) : (
                <div className="ml-6 p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs">
                  → User is on free tier. Premium is checked per business when switching profiles.
                </div>
              )}
              {forceBusinessChecks && (
                <div className="ml-6 p-2 bg-red-100 dark:bg-red-900 rounded text-xs">
                  🚨 DEBUG OVERRIDE: Business checks are FORCED regardless of user-level premium
                </div>
              )}
            </div>
          </div>

          {/* Business Profile Info */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Selected Business Profile</h4>
            {selectedProfile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">{selectedProfile.name}</span>
                  <Badge variant="outline">{selectedProfile.entityType}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>ID: {selectedProfile.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No business profile selected</p>
            )}
          </div>

          {/* Query Debug Info */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Query Debug Info</h4>
            <div className="space-y-2 text-sm font-mono">
              <p><strong>Query Key:</strong> ['premium-access', '{selectedProfileId}', '{user?.id}']</p>
              <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Cache Status:</strong> Always stale (staleTime: 0)</p>
              <div className="mt-2">
                <Button 
                  onClick={() => {
                    console.log('[BusinessPremiumDebug] Query cache state:', queryClient.getQueryData(['premium-access', selectedProfileId, user?.id]));
                    console.log('[BusinessPremiumDebug] All query cache:', queryClient.getQueryCache().getAll());
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  Log Query Cache
                </Button>
              </div>
            </div>
          </div>

          {/* Premium Status */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Premium Status</h4>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Loading premium status...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={hasPremium} />
                  <span className="font-medium">Has Premium: {hasPremium ? 'Yes' : 'No'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Level:</span>
                  <Badge className={getLevelColor(level)}>
                    {level.toUpperCase()}
                  </Badge>
                </div>

                {subscriptionType && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <Badge variant="outline">{subscriptionType}</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Source:</span>
                  <Badge className={getSourceColor(source)}>
                    {source.replace('_', ' ')}
                  </Badge>
                </div>

                {expiresAt && (
                  <div className="text-sm">
                    <span className="font-medium">Expires:</span>{' '}
                    {new Date(expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Available Features */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Available Features</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <StatusIcon status={enabled === true} />
                  <span className="capitalize">{feature.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All Business Profiles */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">All Business Profiles</h4>
            {profiles && profiles.length > 0 ? (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div 
                    key={profile.id} 
                    className={`p-2 border rounded ${
                      profile.id === selectedProfileId ? 'bg-blue-50 border-blue-200' : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{profile.name}</span>
                        <Badge variant="outline">{profile.entityType}</Badge>
                      </div>
                      {profile.id === selectedProfileId && (
                        <Badge className="bg-blue-500">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No business profiles found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessPremiumDebug;
