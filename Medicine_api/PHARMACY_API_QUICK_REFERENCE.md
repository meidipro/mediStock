# 🚀 **PHARMACY API QUICK REFERENCE CARD**

## 🔗 **API Base URLs**
```
Development: http://localhost:3000/pharmacy-api
Production: https://your-domain.com/pharmacy-api
```

## 📋 **Essential Endpoints**

### **Health Check**
```bash
GET /pharmacy-api/health
```

### **Get Medicines**
```bash
GET /pharmacy-api/medicines?limit=20&page=1&search=paracetamol
```

### **Get Medicine by ID**
```bash
GET /pharmacy-api/medicines/1
```

### **Get Categories**
```bash
GET /pharmacy-api/categories
```

## ⚡ **Quick Integration (Copy & Paste)**

### **1. Test Connection**
```javascript
// Test if API is working
fetch('http://localhost:3000/pharmacy-api/health')
  .then(response => response.json())
  .then(data => console.log('API Status:', data.status))
  .catch(error => console.error('API Error:', error));
```

### **2. Fetch Medicines**
```javascript
// Get all medicines
const fetchMedicines = async () => {
  try {
    const response = await fetch('http://localhost:3000/pharmacy-api/medicines?limit=50');
    const data = await response.json();
    
    if (data.success) {
      console.log('Medicines:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

fetchMedicines();
```

### **3. Search Medicines**
```javascript
// Search for specific medicine
const searchMedicines = async (searchTerm) => {
  try {
    const response = await fetch(`http://localhost:3000/pharmacy-api/medicines?search=${searchTerm}&limit=20`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error('Search Error:', error);
  }
};

searchMedicines('paracetamol');
```

## 🎯 **Integration Steps**

1. **Copy the fetch code above** into your pharmacy app
2. **Update the base URL** to match your setup
3. **Test the health endpoint** first
4. **Implement the UI** to display medicines
5. **Add search functionality**

## 🚨 **Common Issues & Fixes**

| Issue | Solution |
|-------|----------|
| CORS Error | Ensure backend is running on port 3000 |
| Connection Refused | Check if backend server is started |
| No Data | Verify medicines exist in admin panel |
| Rate Limited | Reduce request frequency |

## 📱 **Framework Examples**

### **React**
```jsx
const [medicines, setMedicines] = useState([]);

useEffect(() => {
  fetch('http://localhost:3000/pharmacy-api/medicines')
    .then(res => res.json())
    .then(data => setMedicines(data.data));
}, []);
```

### **Vue**
```javascript
data() {
  return { medicines: [] }
},
async mounted() {
  const response = await fetch('http://localhost:3000/pharmacy-api/medicines');
  const data = await response.json();
  this.medicines = data.data;
}
```

### **Vanilla JS**
```javascript
fetch('http://localhost:3000/pharmacy-api/medicines')
  .then(response => response.json())
  .then(data => {
    document.getElementById('medicines').innerHTML = 
      data.data.map(m => `<div>${m.brand_name}</div>`).join('');
  });
```

---

**🎉 Ready to integrate! Your pharmacy app will automatically show all medicines from the admin panel!**
