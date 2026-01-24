// Test script for edge functions
const testValidateFunction = async () => {
  try {
    console.log('Testing validate-crm-link function...');
    
    const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/validate-crm-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'test-token-123',
        crm_user_id: '00000000-0000-0000-0000-000000000000'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 404) {
      console.log('✅ Function working correctly - invalid link request properly rejected');
    }
  } catch (error) {
    console.error('Error testing function:', error);
  }
};

const testConfirmFunction = async () => {
  try {
    console.log('Testing confirm-crm-link function...');
    
    const response = await fetch('https://vsbgcalxbexigazzaftm.supabase.co/functions/v1/confirm-crm-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'test-token-123',
        crm_user_id: '00000000-0000-0000-0000-000000000000',
        ksiegai_user_id: '00000000-0000-0000-0000-000000000000'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 404) {
      console.log('✅ Function working correctly - invalid link request properly rejected');
    }
  } catch (error) {
    console.error('Error testing function:', error);
  }
};

// Run tests
testValidateFunction();
testConfirmFunction();
