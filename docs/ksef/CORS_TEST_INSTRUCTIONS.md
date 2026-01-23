# KSeF CORS Test Instructions

**Updated**: January 23, 2026  
**Status**: ✅ **CORS Fixed - Ready to Test**

---

## 🌐 **Test the KSeF Connection from Browser**

### **Method 1: Browser Console Test**

Open your browser (on localhost:8080) and run this in the console:

```javascript
// Test KSeF connection with CORS
fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-test-connection', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY3J6eGp5ZmZ4bWZibnhscXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MDI4MDAsImV4cCI6MjA1MDE3ODgwMH0.S7V6Y8hJpD5xYJzXhZm5k2XqQhLzY3mZwKjX9Y8ZjX4'
  }
})
.then(response => response.json())
.then(data => {
  console.log('🎉 KSeF Test Results:', data);
  if (data.success) {
    console.log('✅ All tests passed!');
    console.log('📊 Summary:', data.summary);
  } else {
    console.log('❌ Some tests failed:', data.results);
  }
})
.catch(error => {
  console.error('❌ Test failed:', error);
});
```

### **Method 2: Simple Test Page**

Create a simple HTML file to test:

```html
<!DOCTYPE html>
<html>
<head>
    <title>KSeF Connection Test</title>
</head>
<body>
    <h1>KSeF Connection Test</h1>
    <button onclick="testConnection()">Test Connection</button>
    <div id="results"></div>

    <script>
        async function testConnection() {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<p>Testing...</p>';

            try {
                const response = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-test-connection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY3J6eGp5ZmZ4bWZibnhscXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MDI4MDAsImV4cCI6MjA1MDE3ODgwMH0.S7V6Y8hJpD5xYJzXhZm5k2XqQhLzY3mZwKjX9Y8ZjX4'
                    }
                });

                const data = await response.json();
                
                if (data.success) {
                    resultsDiv.innerHTML = `
                        <h2>✅ Success!</h2>
                        <p>${data.message}</p>
                        <h3>Test Results:</h3>
                        <ul>
                            ${data.results.map(r => `
                                <li>${r.success ? '✅' : '❌'} ${r.message}</li>
                            `).join('')}
                        </ul>
                        <h3>Summary:</h3>
                        <p>${data.summary.passed}/${data.summary.total} tests passed</p>
                    `;
                } else {
                    resultsDiv.innerHTML = `
                        <h2>❌ Failed</h2>
                        <p>${data.message}</p>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;
                }
            } catch (error) {
                resultsDiv.innerHTML = `
                    <h2>❌ Error</h2>
                    <p>${error.message}</p>
                `;
            }
        }
    </script>
</body>
</html>
```

### **Method 3: Using Your App's KSeF Page**

1. Navigate to your KSeF page in the app
2. Open browser console
3. The page should now load without database errors
4. Click "Testuj połączenie" button if available

---

## 🔧 **What Was Fixed**

### **CORS Headers Added**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}
```

### **Database Issues Fixed**
- ✅ `company_id` → `business_profile_id` column mapping
- ✅ `customerName` view created for invoices
- ✅ KSeF status types corrected
- ✅ All queries updated

---

## 🧪 **Expected Results**

You should see something like:

```json
{
  "success": true,
  "message": "All KSeF connection tests passed!",
  "results": [
    {
      "success": true,
      "message": "Database connection working"
    },
    {
      "success": true,
      "message": "KSeF integrations table accessible",
      "details": "Found 0 records"
    },
    {
      "success": true,
      "message": "Invoices with customer names view working",
      "details": "Found 3 records"
    },
    {
      "success": true,
      "message": "Business profiles with KSeF integration working",
      "details": "Found 0 active profiles"
    },
    {
      "success": true,
      "message": "Sample invoice query working",
      "details": {
        "count": 3,
        "sample": {
          "id": "718e5316-f32c-4adc-91ea-946aa68c9290",
          "number": "F/21",
          "customer": "TOP-BUD firma remontowo budowlana PIOTR GAWĘDA",
          "amount": 1234.56,
          "ksefStatus": "none"
        }
      }
    }
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0
  }
}
```

---

## 🚨 **Troubleshooting**

### **Still Getting CORS Errors?**
1. Clear browser cache and reload
2. Try in an incognito window
3. Check if the Edge Function deployed properly:
   ```bash
   supabase functions list
   ```

### **Database Errors?**
If you still see database errors, the migration might not have applied:
1. Check Supabase dashboard > Database > Migrations
2. Look for the "fix_ksef_column_mismatches" migration
3. Run it manually if needed

### **Authorization Errors?**
Make sure you're using the correct anon key from your Supabase project settings.

---

## 🎯 **Next Steps**

Once the test passes:

1. **Test your KSeF page** - should load without errors
2. **Check invoice listing** - should show customer names
3. **Test KSeF integration** - should work properly
4. **Deploy to production** - if everything works

---

**Status**: ✅ **CORS Fixed - Ready for Testing**  
**Next**: Run the test and verify all functionality works

---

*Last Updated: January 23, 2026*
