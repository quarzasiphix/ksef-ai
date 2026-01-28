import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { toast } from 'sonner';
import { 
  checkUserSubscriptionStatus, 
  fixUserSubscription, 
  createBusinessSubscription 
} from '../scripts/createBusinessSubscription';
import { Crown, Building, User, CheckCircle, XCircle, AlertCircle, Wrench } from 'lucide-react';

export const SubscriptionFix: React.FC = () => {
  const [userId, setUserId] = useState('6992a5f3-d1e7-4caf-ac2d-5ba2301028cc');
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = await checkUserSubscriptionStatus(userId);
      setSubscriptionInfo(status);
      toast.success('Subscription status loaded');
    } catch (error) {
      toast.error('Error checking subscription status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fixSubscription = async () => {
    setLoading(true);
    try {
      await fixUserSubscription(userId);
      toast.success('Subscription fixed successfully');
      // Refresh status
      await checkStatus();
    } catch (error) {
      toast.error('Failed to fix subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createBusinessSub = async (businessId: string, entityType: string) => {
    setLoading(true);
    try {
      const subscriptionType = entityType === 'dzialalnosc' ? 'jdg' : 'spolka';
      await createBusinessSubscription(userId, businessId, subscriptionType);
      toast.success(`Business subscription created for ${entityType}`);
      // Refresh status
      await checkStatus();
    } catch (error) {
      toast.error('Failed to create business subscription');
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
            <Wrench className="h-5 w-5" />
            Subscription Fix Tool
          </CardTitle>
          <CardDescription>
            Fix business premium subscriptions for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="userId" className="text-sm font-medium">
              User ID
            </label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={checkStatus} disabled={loading} variant="outline">
              {loading ? 'Checking...' : 'Check Status'}
            </Button>
            <Button onClick={fixSubscription} disabled={loading}>
              {loading ? 'Fixing...' : 'Auto Fix Subscription'}
            </Button>
          </div>

          {/* Subscription Info */}
          {subscriptionInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Subscription Status</h3>
              
              {/* Enterprise Status */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Enterprise Subscription</h4>
                {subscriptionInfo.enterpriseSub ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={subscriptionInfo.enterpriseSub.is_active} />
                      <span>{subscriptionInfo.enterpriseSub.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p><strong>ID:</strong> {subscriptionInfo.enterpriseSub.id}</p>
                    <p><strong>Level:</strong> {subscriptionInfo.enterpriseSub.subscription_level}</p>
                    <p><strong>Type:</strong> {subscriptionInfo.enterpriseSub.subscription_type?.display_name}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <StatusIcon status={false} />
                    <span className="text-sm">No enterprise subscription</span>
                  </div>
                )}
              </div>

              {/* Businesses */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Businesses & Subscriptions</h4>
                {subscriptionInfo.businesses && subscriptionInfo.businesses.length > 0 ? (
                  <div className="space-y-3">
                    {subscriptionInfo.businesses.map((business: any, index: number) => {
                      const businessSub = subscriptionInfo.businessSubscriptions.find(
                        (bs: any) => bs.business.id === business.id
                      );
                      return (
                        <div key={business.id} className="p-3 bg-muted rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <span className="font-medium">{business.name}</span>
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                {business.entity_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon status={businessSub?.subscription?.is_active} />
                              <span className="text-sm">
                                {businessSub?.subscription?.is_active ? 'Premium' : 'No Premium'}
                              </span>
                            </div>
                          </div>
                          
                          {businessSub?.subscription ? (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Sub ID: {businessSub.subscription.id}</p>
                              <p>Type: {businessSub.subscription.subscription_type?.display_name}</p>
                              <p>Level: {businessSub.subscription.subscription_level}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() => createBusinessSub(business.id, business.entity_type)}
                                disabled={loading}
                              >
                                Create Business Subscription
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No businesses found</p>
                )}
              </div>

              {/* All Subscriptions */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">All User Subscriptions</h4>
                {subscriptionInfo.subscriptions && subscriptionInfo.subscriptions.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {subscriptionInfo.subscriptions.map((sub: any, index: number) => (
                      <div key={sub.id} className="p-2 bg-muted rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon status={sub.is_active} />
                          <span className="font-medium">{sub.subscription_type?.display_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Level: {sub.subscription_level}</p>
                          <p>Business: {sub.business_profile_id || 'User-level'}</p>
                          <p>Active: {sub.is_active ? 'Yes' : 'No'}</p>
                        </div>
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

export default SubscriptionFix;
