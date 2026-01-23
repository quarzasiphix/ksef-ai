import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export default function KsefTestPage() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null);

  const runDatabaseTests = async () => {
    setTesting(true);
    setResults([]);
    setOverallSuccess(null);

    const testResults: TestResult[] = [];

    try {
      // Test 1: Database connection
      console.log('🧪 Test 1: Database connection');
      try {
        const { data, error } = await supabase
          .from('business_profiles')
          .select('count')
          .limit(1);

        if (error) {
          testResults.push({
            success: false,
            message: 'Database connection failed',
            error: error.message
          });
        } else {
          testResults.push({
            success: true,
            message: 'Database connection working'
          });
        }
      } catch (error) {
        testResults.push({
          success: false,
          message: 'Database connection failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 2: KSeF integrations table
      console.log('🧪 Test 2: KSeF integrations table');
      try {
        const { data, error } = await supabase
          .from('ksef_integrations')
          .select('id, business_profile_id, company_id, status')
          .limit(1);

        if (error) {
          testResults.push({
            success: false,
            message: 'KSeF integrations table error',
            error: error.message
          });
        } else {
          testResults.push({
            success: true,
            message: 'KSeF integrations table accessible',
            details: `Found ${data?.length || 0} records`
          });
        }
      } catch (error) {
        testResults.push({
          success: false,
          message: 'KSeF integrations table error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 3: Invoices with customer names view
      console.log('🧪 Test 3: Invoices with customer names view');
      try {
        const { data, error } = await supabase
          .from('invoices_with_customer_name')
          .select('id, number, customername')
          .limit(3);

        if (error) {
          testResults.push({
            success: false,
            message: 'Invoices view error',
            error: error.message
          });
        } else {
          testResults.push({
            success: true,
            message: 'Invoices with customer names view working',
            details: `Found ${data?.length || 0} records`
          });
        }
      } catch (error) {
        testResults.push({
          success: false,
          message: 'Invoices view error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 4: Business profiles with KSeF integration
      console.log('🧪 Test 4: Business profiles with KSeF integration');
      try {
        const { data, error } = await supabase
          .from('business_profiles')
          .select(`
            id,
            name,
            tax_id,
            ksef_integrations!inner(status)
          `)
          .eq('ksef_integrations.status', 'active')
          .limit(1);

        if (error) {
          testResults.push({
            success: false,
            message: 'Business profiles with KSeF integration error',
            error: error.message
          });
        } else {
          testResults.push({
            success: true,
            message: 'Business profiles with KSeF integration working',
            details: `Found ${data?.length || 0} active profiles`
          });
        }
      } catch (error) {
        testResults.push({
          success: false,
          message: 'Business profiles with KSeF integration error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 5: Sample invoice query
      console.log('🧪 Test 5: Sample invoice query');
      try {
        const { data, error } = await supabase
          .from('invoices_with_customer_name')
          .select('id, number, customername, total_gross_value, ksef_status')
          .limit(3);

        if (error) {
          testResults.push({
            success: false,
            message: 'Sample invoice query error',
            error: error.message
          });
        } else {
          testResults.push({
            success: true,
            message: 'Sample invoice query working',
            details: {
              count: data?.length || 0,
              sample: data?.[0] ? {
                id: data[0].id,
                number: data[0].number,
                customer: data[0].customername,
                amount: data[0].total_gross_value,
                ksefStatus: data[0].ksef_status
              } : null
            }
          });
        }
      } catch (error) {
        testResults.push({
          success: false,
          message: 'Sample invoice query error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Calculate overall success
      const successCount = testResults.filter(r => r.success).length;
      const success = successCount === testResults.length;

      setResults(testResults);
      setOverallSuccess(success);

      console.log('📊 Test results:', {
        total: testResults.length,
        passed: successCount,
        failed: testResults.length - successCount
      });

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      setResults([{
        success: false,
        message: 'Test suite failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      setOverallSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KSeF Database Connection Test</h1>
        <p className="text-muted-foreground">
          Test database schema fixes and KSeF integration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Tests</CardTitle>
          <CardDescription>
            This will test the database connection, schema fixes, and KSeF integration setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDatabaseTests} 
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Database Tests'
            )}
          </Button>
        </CardContent>
      </Card>

      {overallSuccess !== null && (
        <Alert variant={overallSuccess ? 'default' : 'destructive'}>
          <AlertDescription>
            {overallSuccess ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold">All tests passed!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Some tests failed</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.success).length} / {results.length} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{result.message}</h4>
                    {result.details && (
                      <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                    {result.error && (
                      <p className="mt-2 text-sm text-red-700">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
