# 🏥 **PHARMACY APP API INTEGRATION GUIDE**

## 🎯 **Complete API Reference for Pharmacy App Integration**

This guide contains everything you need to integrate your pharmacy app with the Medicine Knowledge Admin Panel. All medicines added through the admin panel will automatically be available in your pharmacy app via these APIs.

---

## 📋 **QUICK START**

### **1. Base URL**
```
Development: http://localhost:3000/pharmacy-api
Production: https://your-domain.com/pharmacy-api
```

### **2. Test Connection**
```bash
GET /pharmacy-api/health
```
**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## 🔌 **CORE API ENDPOINTS**

### **📚 Get All Medicines**
```http
GET /pharmacy-api/medicines
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `search` (optional): Search term for brand/generic name, company, therapeutic class
- `category` (optional): Category ID filter
- `company` (optional): Company name filter
- `therapeutic_class` (optional): Therapeutic class filter
- `status` (optional): "active", "inactive", or "all" (default: "active")

**Example Request:**
```javascript
// Get first 20 active medicines
const response = await fetch('http://localhost:3000/pharmacy-api/medicines?limit=20');

// Search for paracetamol
const searchResponse = await fetch('http://localhost:3000/pharmacy-api/medicines?search=paracetamol&limit=10');

// Get medicines by category
const categoryResponse = await fetch('http://localhost:3000/pharmacy-api/medicines?category=1&limit=50');
```

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand_name": "Paracetamol 500mg",
      "generic_name": "Acetaminophen",
      "company": "ABC Pharmaceuticals",
      "therapeutic_class": "Analgesic",
      "dosage_form": "Tablet",
      "strength": "500",
      "unit_price": 2.50,
      "description": "Pain reliever and fever reducer",
      "indications": "Headache, fever, mild pain",
      "contraindications": "Liver disease, alcohol use",
      "side_effects": "Nausea, stomach upset",
      "dosage_and_administration": "1-2 tablets every 4-6 hours",
      "storage_conditions": "Store in cool, dry place",
      "expiry_date": "2025-12-31",
      "stock_quantity": 1000,
      "status": "active",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "medicine_categories": [
        {
          "categories": {
            "id": 1,
            "name": "Pain Relief",
            "description": "Medicines for pain management"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### **🔍 Get Medicine by ID**
```http
GET /pharmacy-api/medicines/{id}
```

**Example Request:**
```javascript
const response = await fetch('http://localhost:3000/pharmacy-api/medicines/1');
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "brand_name": "Paracetamol 500mg",
    "generic_name": "Acetaminophen",
    "company": "ABC Pharmaceuticals",
    "therapeutic_class": "Analgesic",
    "dosage_form": "Tablet",
    "strength": "500",
    "unit_price": 2.50,
    "description": "Pain reliever and fever reducer",
    "indications": "Headache, fever, mild pain",
    "contraindications": "Liver disease, alcohol use",
    "side_effects": "Nausea, stomach upset",
    "dosage_and_administration": "1-2 tablets every 4-6 hours",
    "storage_conditions": "Store in cool, dry place",
    "expiry_date": "2025-12-31",
    "stock_quantity": 1000,
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "medicine_categories": [
      {
        "categories": {
          "id": 1,
          "name": "Pain Relief",
          "description": "Medicines for pain management"
        }
      }
    ]
  }
}
```

### **🏷️ Get All Categories**
```http
GET /pharmacy-api/categories
```

**Example Request:**
```javascript
const response = await fetch('http://localhost:3000/pharmacy-api/categories');
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pain Relief",
      "description": "Medicines for pain management",
      "icon": "🩹",
      "color": "#ff6b6b",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Antibiotics",
      "description": "Medicines to treat bacterial infections",
      "icon": "💊",
      "color": "#4ecdc4",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## 🚀 **INTEGRATION EXAMPLES**

### **React/Next.js Integration**
```jsx
import { useState, useEffect } from 'react';

const PharmacyApp = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:3000/pharmacy-api';

  const fetchMedicines = async (searchTerm = '', page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`${API_BASE}/medicines?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMedicines(data.data);
      } else {
        setError('Failed to fetch medicines');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSearch = (searchTerm) => {
    fetchMedicines(searchTerm, 1);
  };

  if (loading) return <div>Loading medicines...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="pharmacy-app">
      <h1>🏥 Pharmacy App</h1>
      
      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search medicines..."
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Medicines Grid */}
      <div className="medicines-grid">
        {medicines.map((medicine) => (
          <div key={medicine.id} className="medicine-card">
            <h3>{medicine.brand_name}</h3>
            <p><strong>Generic:</strong> {medicine.generic_name}</p>
            <p><strong>Company:</strong> {medicine.company}</p>
            <p><strong>Price:</strong> ${medicine.unit_price}</p>
            <p><strong>Stock:</strong> {medicine.stock_quantity}</p>
            <p><strong>Form:</strong> {medicine.dosage_form} {medicine.strength}mg</p>
            <p className="description">{medicine.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyApp;
```

### **Vanilla JavaScript Integration**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pharmacy App</title>
    <style>
        .medicine-card {
            border: 1px solid #ddd;
            margin: 10px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .search-container {
            margin: 20px 0;
        }
        .search-input {
            padding: 10px;
            width: 300px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .loading { color: #666; }
        .error { color: #d32f2f; }
    </style>
</head>
<body>
    <h1>🏥 Pharmacy App</h1>
    
    <div class="search-container">
        <input type="text" id="searchInput" class="search-input" placeholder="Search medicines...">
    </div>
    
    <div id="medicinesContainer"></div>

    <script>
        const API_BASE = 'http://localhost:3000/pharmacy-api';
        let currentPage = 1;
        let searchTimeout;

        // Fetch medicines from API
        async function fetchMedicines(searchTerm = '', page = 1) {
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: '20'
                });
                
                if (searchTerm) {
                    params.append('search', searchTerm);
                }
                
                const response = await fetch(`${API_BASE}/medicines?${params}`);
                const data = await response.json();
                
                if (data.success) {
                    displayMedicines(data.data);
                } else {
                    showError('Failed to fetch medicines');
                }
            } catch (error) {
                showError('Network error: ' + error.message);
            }
        }

        // Display medicines in the UI
        function displayMedicines(medicines) {
            const container = document.getElementById('medicinesContainer');
            
            if (medicines.length === 0) {
                container.innerHTML = '<p>No medicines found</p>';
                return;
            }
            
            const medicinesHTML = medicines.map(medicine => `
                <div class="medicine-card">
                    <h3>${medicine.brand_name}</h3>
                    <p><strong>Generic:</strong> ${medicine.generic_name}</p>
                    <p><strong>Company:</strong> ${medicine.company}</p>
                    <p><strong>Price:</strong> $${medicine.unit_price}</p>
                    <p><strong>Stock:</strong> ${medicine.stock_quantity}</p>
                    <p><strong>Form:</strong> ${medicine.dosage_form} ${medicine.strength}mg</p>
                    <p>${medicine.description}</p>
                </div>
            `).join('');
            
            container.innerHTML = medicinesHTML;
        }

        // Show error message
        function showError(message) {
            const container = document.getElementById('medicinesContainer');
            container.innerHTML = `<p class="error">Error: ${message}</p>`;
        }

        // Handle search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchMedicines(e.target.value, 1);
            }, 500);
        });

        // Initial load
        fetchMedicines();
    </script>
</body>
</html>
```

---

## 🔧 **CONFIGURATION & SETUP**

### **Environment Variables**
```bash
# In your pharmacy app, set these environment variables:
REACT_APP_API_BASE_URL=http://localhost:3000/pharmacy-api
REACT_APP_API_TIMEOUT=10000
REACT_APP_API_RETRY_ATTEMPTS=3
```

### **CORS Configuration**
Your backend is already configured to allow requests from:
- Development: `http://localhost:3000`, `http://localhost:3001`
- Production: Update in `backend/server.js`

### **Rate Limiting**
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

---

## 📊 **TESTING YOUR INTEGRATION**

### **1. Test API Health**
```bash
curl http://localhost:3000/pharmacy-api/health
```

### **2. Test Medicines Endpoint**
```bash
curl "http://localhost:3000/pharmacy-api/medicines?limit=5"
```

### **3. Test Search**
```bash
curl "http://localhost:3000/pharmacy-api/medicines?search=paracetamol"
```

### **4. Test Categories**
```bash
curl http://localhost:3000/pharmacy-api/categories
```

---

## 🎯 **NEXT STEPS**

1. **Close this folder** and open your pharmacy app folder
2. **Choose your integration method** (React, Vue, Vanilla JS, etc.)
3. **Copy the relevant code examples** above
4. **Update the API base URL** to match your setup
5. **Test the connection** using the health endpoint
6. **Implement the UI** to display medicines
7. **Add search functionality** using the search parameters
8. **Test with real data** from your admin panel

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

**1. CORS Error**
- Ensure your backend is running
- Check CORS configuration in `backend/server.js`
- Verify the origin URLs match

**2. Connection Refused**
- Check if backend is running on port 3000
- Verify firewall settings
- Check if port 3000 is available

**3. No Data Returned**
- Check if medicines exist in your database
- Verify the API endpoints are working
- Check browser console for errors

**4. Rate Limiting**
- Reduce request frequency
- Implement proper caching
- Check rate limit configuration

---

## 📞 **SUPPORT**

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your backend server is running
3. Test the API endpoints directly in your browser
4. Check the network tab in browser dev tools
5. Review the error handling examples above

---

**🎉 You're all set! Your pharmacy app will now automatically display all medicines added through the admin panel!**
