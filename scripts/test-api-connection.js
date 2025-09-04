#!/usr/bin/env node

/**
 * API Connection Test Script
 * 
 * This script tests the connection to your admin portal API
 * Run this to verify your API is working before testing the app
 * 
 * Usage: node scripts/test-api-connection.js
 */

const API_BASE_URL = 'http://localhost:3000/pharmacy-api';

async function testApiConnection() {
  console.log('🔍 Testing API Connection...\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    if (data.success && data.status === 'healthy') {
      console.log('✅ Health Check: PASSED');
      console.log(`   Status: ${data.status}`);
      console.log(`   Version: ${data.version || 'N/A'}`);
    } else {
      console.log('❌ Health Check: FAILED');
      console.log(`   Response:`, data);
    }
  } catch (error) {
    console.log('❌ Health Check: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure your admin portal is running on http://localhost:3000');
  }
  
  console.log('');
  
  // Test 2: Get Medicines
  console.log('2️⃣ Testing Get Medicines...');
  try {
    const response = await fetch(`${API_BASE_URL}/medicines?limit=5`);
    const data = await response.json();
    
    if (data.success) {
      const medicines = data.data?.medicines || data.data || data.medicines || [];
      console.log('✅ Get Medicines: PASSED');
      console.log(`   Found ${medicines.length} medicines`);
      if (medicines.length > 0) {
        console.log(`   Sample: ${medicines[0].brandName || medicines[0].brand_name} (${medicines[0].genericName || medicines[0].generic_name})`);
      }
    } else {
      console.log('❌ Get Medicines: FAILED');
      console.log(`   Response:`, data);
    }
  } catch (error) {
    console.log('❌ Get Medicines: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Get Categories
  console.log('3️⃣ Testing Get Categories...');
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    const data = await response.json();
    
    if (data.success) {
      const categories = data.data || [];
      console.log('✅ Get Categories: PASSED');
      console.log(`   Found ${categories.length} categories`);
      if (categories.length > 0) {
        console.log(`   Sample: ${categories[0].name}`);
      }
    } else {
      console.log('❌ Get Categories: FAILED');
      console.log(`   Response:`, data);
    }
  } catch (error) {
    console.log('❌ Get Categories: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  console.log('🏁 API Connection Test Complete!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Make sure your admin portal is running');
  console.log('   2. Add some medicines through the admin portal');
  console.log('   3. Test the "Test API" button in your pharmacy app');
  console.log('   4. Check the console logs for detailed error information');
}

// Run the test
testApiConnection().catch(console.error);
