const fetch = require('node-fetch');

async function testTenantAPI() {
  try {
    console.log('Testing tenant resolution API...');
    const response = await fetch('http://localhost:3000/api/tenants/resolve?slug=demo-clinic');
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    console.log('\nTesting services API...');
    const servicesResponse = await fetch('http://localhost:3000/api/services/public?tenant=demo-clinic');
    const servicesData = await servicesResponse.json();
    console.log('Services Status:', servicesResponse.status);
    console.log('Services Response:', JSON.stringify(servicesData, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTenantAPI();
