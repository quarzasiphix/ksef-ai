import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { usePremium } from '@/shared/context/PremiumContext';
import { useEnterpriseStatus } from '../hooks/useEnterpriseStatus';
import { subscriptionService } from '@/shared/services/subscriptionService';
import { toast } from 'sonner';
import { Badge } from '@/shared/ui/badge';
import { Crown, Building, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const PremiumDebug: React.FC = () => {
  const { user } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const { hasPremium, isLoading } = usePremium();
  const { hasEnterprise } = useEnterpriseStatus();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  const runDebug = async () => {
    if (!user || !selectedProfileId) {
      toast.error('No user or selected profile');
      return;
    }

    setLoading(true);
    try {
      const results = {
        userId: user.id,
        selectedProfileId,
        selectedProfile,
        hasPremium,
        hasEnterprise,
        isLoading,
        checks: {}
      };

      // Check company subscription directly
      const companySub = await subscriptionService.getCompanySubscription(selectedProfileId);
      results.checks.companySubscription = companySub;

      // Check enterprise benefits
      const { data: enterpriseBenefits } = await subscriptionService.supabase
        .from('enterprise_benefits')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_profile_id', selectedProfileId)
        .eq('benefit_type', 'premium_access')
        .eq('is_active', true);

      results.checks.enterpriseBenefits = enterpriseBenefits;

      // Check hasPremiumAccess directly
      const hasPremiumAccess = await subscriptionService.hasPremiumAccess(selectedProfileId, user.id);
      results.checks.hasPremiumAccess = hasPremiumAccess;

      // Get all user subscriptions
      const allSubs = await subscriptionService.getUserSubscriptions(user.id);
      results.checks.allSubscriptions = allSubs;

      setDebugInfo(results);
    } catch (error) {
      toast.error('Error running debug');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean | null | undefined }) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Premium Debug Tool
          </CardTitle>
          <CardDescription>
            Debug premium subscription detection logic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDebug} disabled={loading}>
            {loading ? 'Running Debug...' : 'Run Debug'}
          </Button>

          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Premium Status</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={hasPremium} />
                <span>{hasPremium ? 'Has Premium' : 'No Premium'}</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4" />
                <span className="font-medium">Enterprise Status</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={hasEnterprise} />
                <span>{hasEnterprise ? 'Has Enterprise' : 'No Enterprise'}</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4" />
                <span className="font-medium">Selected Profile</span>
              </div>
              <div className="text-sm">
                {selectedProfile ? (
                  <div>
                    <p>{selectedProfile.name}</p>
                    <Badge variant="outline">{selectedProfile.entity_type}</Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No profile selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Debug Results */}
          {debugInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Debug Results</h3>
              
              {/* Company Subscription */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Company Subscription</h4>
                {debugInfo.checks.companySubscription ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>ID:</strong> {debugInfo.checks.companySubscription.id}</p>
                    <p><strong>Level:</strong> {debugInfo.checks.companySubscription.subscription_level}</p>
                    <p><strong>Type:</strong> {debugInfo.checks.companySubscription.subscription_type?.display_name}</p>
                    <p><strong>Active:</strong> {debugInfo.checks.companySubscription.is_active ? 'Yes' : 'No'}</p>
                    <p><strong>Created:</strong> {new Date(debugInfo.checks.companySubscription.created_at).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No company subscription found</p>
                )}
              </div>

              {/* Enterprise Benefits */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Enterprise Benefits</h4>
                {debugInfo.checks.enterpriseBenefits && debugInfo.checks.enterpriseBenefits.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {debugInfo.checks.enterpriseBenefits.map((benefit: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded">
                        <p><strong>Benefit Type:</strong> {benefit.benefit_type}</p>
                        <p><strong>Active:</strong> {benefit.is_active ? 'Yes' : 'No'}</p>
                        <p><strong>Granted:</strong> {new Date(benefit.granted_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No enterprise benefits found</p>
                )}
              </div>

              {/* hasPremiumAccess Result */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">hasPremiumAccess() Result</h4>
                <div className="flex items-center gap-2">
                  <StatusIcon status={debugInfo.checks.hasPremiumAccess} />
                  <span>{debugInfo.checks.hasPremiumAccess ? 'Has Premium Access' : 'No Premium Access'}</span>
                </div>
              </div>

              {/* All Subscriptions */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">All User Subscriptions</h4>
                {debugInfo.checks.allSubscriptions && debugInfo.checks.allSubscriptions.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {debugInfo.checks.allSubscriptions.map((sub: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded">
                        <p><strong>ID:</strong> {sub.id}</p>
                        <p><strong>Level:</strong> {sub.subscription_level}</p>
                        <p><strong>Type:</strong> {sub.subscription_type?.display_name}</p>
                        <p><strong>Business:</strong> {sub.business_profile_id || 'User-level'}</p>
                        <p><strong>Active:</strong> {sub.is_active ? 'Yes' : 'No'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No subscriptions found</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumDebug;
