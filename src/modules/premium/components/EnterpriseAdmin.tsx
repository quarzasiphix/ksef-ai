import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { toast } from 'sonner';
import { disableEnterpriseForUser, checkEnterpriseSubscription } from '../scripts/disableEnterpriseForUser';
import { Crown, Shield, AlertTriangle } from 'lucide-react';

export const EnterpriseAdmin: React.FC = () => {
  const [userId, setUserId] = useState('6992a5f3-d1e7-4caf-ac2d-5ba2301028cc');
  const [loading, setLoading] = useState(false);
  const [enterpriseStatus, setEnterpriseStatus] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = await checkEnterpriseSubscription(userId);
      setEnterpriseStatus(status);
      if (status) {
        toast.success('User has active enterprise subscription');
      } else {
        toast.info('No active enterprise subscription found');
      }
    } catch (error) {
      toast.error('Error checking enterprise status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disableEnterprise = async () => {
    setLoading(true);
    try {
      await disableEnterpriseForUser(userId);
      toast.success('Enterprise subscription disabled successfully');
      // Refresh status
      await checkStatus();
    } catch (error) {
      toast.error('Failed to disable enterprise subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enterprise Admin
          </CardTitle>
          <CardDescription>
            Manage enterprise subscriptions for users
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
            <Button 
              onClick={checkStatus} 
              disabled={loading}
              variant="outline"
            >
              Check Status
            </Button>
            <Button 
              onClick={disableEnterprise} 
              disabled={loading || !enterpriseStatus}
              variant="destructive"
            >
              {loading ? 'Processing...' : 'Disable Enterprise'}
            </Button>
          </div>

          {enterpriseStatus && (
            <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 dark:text-amber-100">
                    Active Enterprise Subscription Found
                  </h4>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>Subscription ID: {enterpriseStatus.id}</p>
                    <p>Created: {new Date(enterpriseStatus.created_at).toLocaleDateString()}</p>
                    <p>Covers all businesses: {enterpriseStatus.metadata?.covers_all_businesses ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!enterpriseStatus && userId && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-900 dark:text-green-100">
                  No active enterprise subscription found
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
