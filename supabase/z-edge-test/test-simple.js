const https = require('https');

const testFunction = (url, body) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: 'vsbgcalxbexigazzaftm.supabase.co',
      port: 443,
      path: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

async function runTests() {
  console.log('Testing validate-crm-link function...');
  
  try {
    const result1 = await testFunction('/functions/v1/validate-crm-link', {
      token: 'test-token-123',
      crm_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    console.log('Validate Function Result:');
    console.log('Status:', result1.status);
    console.log('Data:', JSON.stringify(result1.data, null, 2));
    
    if (result1.status === 404) {
      console.log('✅ Validate function working correctly - invalid link request properly rejected');
    }
  } catch (error) {
    console.error('Error testing validate function:', error.message);
  }

  console.log('\nTesting confirm-crm-link function...');
  
  try {
    const result2 = await testFunction('/functions/v1/confirm-crm-link', {
      token: 'test-token-123',
      crm_user_id: '00000000-0000-0000-0000-000000000000',
      ksiegai_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    console.log('Confirm Function Result:');
    console.log('Status:', result2.status);
    console.log('Data:', JSON.stringify(result2.data, null, 2));
    
    if (result2.status === 404) {
      console.log('✅ Confirm function working correctly - invalid link request properly rejected');
    }
  } catch (error) {
    console.error('Error testing confirm function:', error.message);
  }
}

runTests();
