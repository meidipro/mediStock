# 🔧 API Integration Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue 1: "Failed to fetch medicines" Error

**Symptoms:**
- Medicine screen shows "Failed to fetch medicines" error
- No medicines are displayed
- Loading spinner appears but never stops

**Solutions:**

1. **Check if Admin Portal is Running**
   ```bash
   # Test the API connection
   node scripts/test-api-connection.js
   ```

2. **Verify API Endpoints**
   - Health Check: `http://localhost:3000/pharmacy-api/health`
   - Medicines: `http://localhost:3000/pharmacy-api/medicines`
   - Categories: `http://localhost:3000/pharmacy-api/categories`

3. **Check Network Connectivity**
   - Make sure your admin portal is running on port 3000
   - Verify no firewall is blocking the connection
   - Test in browser: `http://localhost:3000/pharmacy-api/health`

### Issue 2: "API is not healthy" Error

**Symptoms:**
- Health check fails
- "Test API" button shows unhealthy status

**Solutions:**

1. **Start Admin Portal**
   ```bash
   # Navigate to your admin portal directory
   cd /path/to/admin-portal
   npm start
   # or
   yarn start
   ```

2. **Check Admin Portal Logs**
   - Look for any startup errors
   - Verify database connection
   - Check if all required services are running

3. **Verify Port Configuration**
   - Make sure admin portal is running on port 3000
   - Check for port conflicts

### Issue 3: Empty Medicine List

**Symptoms:**
- API connection works
- Health check passes
- But no medicines are displayed

**Solutions:**

1. **Add Medicines to Admin Portal**
   - Log into your admin portal
   - Add some sample medicines
   - Verify medicines are saved in database

2. **Check Database**
   - Verify medicines table has data
   - Check if medicines have `is_active = true`
   - Ensure proper data structure

3. **Test API Response**
   ```bash
   curl http://localhost:3000/pharmacy-api/medicines
   ```

### Issue 4: Network Timeout Errors

**Symptoms:**
- Requests timeout
- "Network request failed" errors

**Solutions:**

1. **Check Network Configuration**
   - Ensure both apps are on same network
   - For mobile testing, use your computer's IP address instead of localhost
   - Update API_BASE_URL in `lib/pharmacy-api-service.ts`

2. **Mobile Development Setup**
   ```typescript
   // For mobile testing, replace localhost with your computer's IP
   const API_BASE_URL = 'http://192.168.1.100:3000/pharmacy-api';
   ```

### Issue 5: CORS Errors

**Symptoms:**
- CORS policy errors in console
- Requests blocked by browser

**Solutions:**

1. **Configure CORS in Admin Portal**
   ```javascript
   // In your admin portal server configuration
   app.use(cors({
     origin: ['http://localhost:8081', 'http://localhost:19006'], // Expo dev server ports
     credentials: true
   }));
   ```

2. **Add CORS Headers**
   ```javascript
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
     next();
   });
   ```

## 🔍 Debugging Steps

### Step 1: Test API Manually
```bash
# Test health endpoint
curl http://localhost:3000/pharmacy-api/health

# Test medicines endpoint
curl http://localhost:3000/pharmacy-api/medicines

# Test with search
curl "http://localhost:3000/pharmacy-api/medicines?search=paracetamol"
```

### Step 2: Check Console Logs
1. Open your pharmacy app
2. Open developer tools/console
3. Look for these log messages:
   - `🌐 Fetching medicines from: ...`
   - `📦 API Response: ...`
   - `✅ Successfully fetched X medicines`
   - `❌ Failed to fetch medicines: ...`

### Step 3: Use Test API Button
1. Open the medicine screen in your app
2. Tap "Test API" button
3. Check the alert message
4. Look at console logs for detailed error information

### Step 4: Verify Data Structure
Make sure your admin portal API returns data in this format:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand_name": "Paracetamol",
      "generic_name": "Acetaminophen",
      "company": "ABC Pharma",
      "therapeutic_class": "Analgesic",
      "dosage_form": "Tablet",
      "strength": "500mg",
      "unit_price": 2.50,
      "status": "active"
    }
  ]
}
```

## 🛠️ Quick Fixes

### Fix 1: Update API Base URL
If you're testing on a mobile device, update the API URL:
```typescript
// In lib/pharmacy-api-service.ts
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000/pharmacy-api';
```

### Fix 2: Add Error Handling
The updated code now includes comprehensive error handling and logging.

### Fix 3: Test Connection Script
Run the test script to verify everything is working:
```bash
node scripts/test-api-connection.js
```

## 📞 Getting Help

If you're still having issues:

1. **Check the console logs** - Look for detailed error messages
2. **Run the test script** - Use `node scripts/test-api-connection.js`
3. **Verify admin portal** - Make sure it's running and has data
4. **Check network** - Ensure both apps can communicate

## 🎯 Success Indicators

You'll know everything is working when:
- ✅ Health check returns "API is healthy and connected!"
- ✅ Medicines load and display in the app
- ✅ Search functionality works
- ✅ No error messages in console
- ✅ Test script passes all tests
