import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Database, Building, Crown, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';

export const DatabaseInvestigation: React.FC = () => {
  const { user } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const [investigationData, setInvestigationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  const runInvestigation = async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('[DatabaseInvestigation] Starting investigation for user:', user.id);
    
    try {
      const results: any = {
        userId: user.id,
        userEmail: user.email,
        selectedBusinessId: selectedProfileId,
        selectedBusinessName: selectedProfile?.name,
        timestamp: new Date().toISOString(),
      };

      // 1. Check premium_status view for user (no business)
      console.log('[DatabaseInvestigation] Checking user-level premium status...');
      const { data: userPremiumStatus, error: userPremiumError } = await supabase
        .from('premium_status')
        .select('*')
        .eq('user_id', user.id)
        .is('business_profile_id', null)
        .single();

      results.userPremiumStatus = userPremiumStatus;
      results.userPremiumError = userPremiumError;
      console.log('[DatabaseInvestigation] User premium status:', userPremiumStatus, 'Error:', userPremiumError);

      // 2. Check premium_status view for selected business
      if (selectedProfileId) {
        console.log('[DatabaseInvestigation] Checking business premium status for:', selectedProfileId);
        const { data: businessPremiumStatus, error: businessPremiumError } = await supabase
          .from('premium_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('business_profile_id', selectedProfileId)
          .single();

        results.businessPremiumStatus = businessPremiumStatus;
        results.businessPremiumError = businessPremiumError;
        console.log('[DatabaseInvestigation] Business premium status:', businessPremiumStatus, 'Error:', businessPremiumError);
      }

      // 3. Check all premium_status entries for this user
      console.log('[DatabaseInvestigation] Checking all premium status entries...');
      const { data: allPremiumStatus, error: allPremiumError } = await supabase
        .from('premium_status')
        .select('*')
        .eq('user_id', user.id);

      results.allPremiumStatus = allPremiumStatus;
      results.allPremiumError = allPremiumError;
      console.log('[DatabaseInvestigation] All premium status:', allPremiumStatus, 'Error:', allPremiumError);

      // 4. Check enhanced_subscriptions table directly
      console.log('[DatabaseInvestigation] Checking enhanced_subscriptions...');
      const { data: enhancedSubscriptions, error: enhancedError } = await supabase
        .from('enhanced_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      results.enhancedSubscriptions = enhancedSubscriptions;
      results.enhancedError = enhancedError;
      console.log('[DatabaseInvestigation] Enhanced subscriptions:', enhancedSubscriptions, 'Error:', enhancedError);

      // 5. Check enterprise_benefits table
      console.log('[DatabaseInvestigation] Checking enterprise_benefits...');
      const { data: enterpriseBenefits, error: enterpriseError } = await supabase
        .from('enterprise_benefits')
        .select('*')
        .eq('user_id', user.id);

      results.enterpriseBenefits = enterpriseBenefits;
      results.enterpriseError = enterpriseError;
      console.log('[DatabaseInvestigation] Enterprise benefits:', enterpriseBenefits, 'Error:', enterpriseError);

      // 6. Check business_profiles for this user
      console.log('[DatabaseInvestigation] Checking business_profiles...');
      const { data: businessProfiles, error: businessError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id);

      results.businessProfiles = businessProfiles;
      results.businessError = businessError;
      console.log('[DatabaseInvestigation] Business profiles:', businessProfiles, 'Error:', businessError);

      // 7. Check subscription_types
      console.log('[DatabaseInvestigation] Checking subscription_types...');
      const { data: subscriptionTypes, error: typesError } = await supabase
        .from('subscription_types')
        .select('*');

      results.subscriptionTypes = subscriptionTypes;
      results.typesError = typesError;
      console.log('[DatabaseInvestigation] Subscription types:', subscriptionTypes, 'Error:', typesError);

      setInvestigationData(results);
      console.log('[DatabaseInvestigation] Investigation complete:', results);

    } catch (error) {
      console.error('[DatabaseInvestigation] Investigation error:', error);
      setInvestigationData({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const renderData = (data: any, title: string) => {
    if (!data) return <p className="text-sm text-muted-foreground">No data</p>;
    
    return (
      <div className="space-y-2">
        <h5 className="font-medium text-sm">{title}</h5>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Investigation Tool
          </CardTitle>
          <CardDescription>
            Direct database investigation of premium status for user {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runInvestigation} disabled={isLoading}>
              {isLoading ? 'Investigating...' : 'Run Investigation'}
            </Button>
            <div className="text-sm text-muted-foreground">
              Selected Business: {selectedProfile?.name || 'None'}
            </div>
          </div>

          {investigationData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <h4 className="font-medium mb-2">Investigation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>User: {investigationData.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>Selected Business: {investigationData.selectedBusinessName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span>User Premium: {investigationData.userPremiumStatus?.has_premium === 'true' ? 'YES' : 'NO'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span>Business Premium: {investigationData.businessPremiumStatus?.has_premium === 'true' ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              </div>

              {/* User Premium Status */}
              {renderData(investigationData.userPremiumStatus, 'User Premium Status')}
              {investigationData.userPremiumError && (
                <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                  <p className="text-sm text-red-600">User Premium Error: {investigationData.userPremiumError.message}</p>
                </div>
              )}

              {/* Business Premium Status */}
              {renderData(investigationData.businessPremiumStatus, 'Business Premium Status')}
              {investigationData.businessPremiumError && (
                <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                  <p className="text-sm text-red-600">Business Premium Error: {investigationData.businessPremiumError.message}</p>
                </div>
              )}

              {/* All Premium Status */}
              {renderData(investigationData.allPremiumStatus, 'All Premium Status Entries')}

              {/* Enhanced Subscriptions */}
              {renderData(investigationData.enhancedSubscriptions, 'Enhanced Subscriptions')}

              {/* Enterprise Benefits */}
              {renderData(investigationData.enterpriseBenefits, 'Enterprise Benefits')}

              {/* Business Profiles */}
              {renderData(investigationData.businessProfiles, 'Business Profiles')}

              {/* Subscription Types */}
              {renderData(investigationData.subscriptionTypes, 'Subscription Types')}

              {/* Errors */}
              {investigationData.error && (
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <h4 className="font-medium text-red-600">Investigation Error</h4>
                  <pre className="text-sm text-red-600">{investigationData.error}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseInvestigation;
