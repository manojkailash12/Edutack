// Simple test to check departments API
const axios = require('axios');

async function testDepartmentsAPI() {
  try {
    console.log('Testing /staff/departments endpoint...');
    const response = await axios.get('http://localhost:3500/staff/departments');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.departments) {
      console.log('✅ Departments found:', response.data.departments.length);
      console.log('✅ Departments list:', response.data.departments);
    } else {
      console.log('❌ No departments property found in response');
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDepartmentsAPI();