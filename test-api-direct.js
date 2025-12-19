// Test API endpoints directly
const axios = require('axios');

const API_BASE = 'https://edutrack-vercel.app/api';

async function testAPI() {
  console.log('Testing API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health:', healthResponse.data);
    console.log('');
    
    // Test departments endpoint
    console.log('2. Testing departments endpoint...');
    const deptResponse = await axios.get(`${API_BASE}/staff/departments`);
    console.log('✅ Departments:', deptResponse.data);
    console.log('');
    
    // Test root endpoint
    console.log('3. Testing root endpoint...');
    const rootResponse = await axios.get(`${API_BASE}/`);
    console.log('✅ Root:', rootResponse.data);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testAPI();