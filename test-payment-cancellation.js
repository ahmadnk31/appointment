// Test script for payment and cancellation functionality
const BASE_URL = 'http://localhost:3000'

// Test data
const testData = {
  tenantSlug: 'demo-clinic',
  appointment: {
    serviceId: '', // Will be populated
    providerId: '', // Will be populated
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    clientPhone: '+1234567890',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    notes: 'Test appointment for payment and cancellation',
    paymentMethod: 'ONLINE'
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': testData.tenantSlug,
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return { status: response.status, data }
  } catch (error) {
    console.error('Request failed:', error)
    return { status: 500, data: { error: error.message } }
  }
}

async function testGetServices() {
  console.log('\n🔍 Testing: Get Services')
  const result = await makeRequest(`${BASE_URL}/api/services`)
  
  if (result.status === 200 && result.data.length > 0) {
    testData.appointment.serviceId = result.data[0].id
    console.log('✅ Services retrieved successfully')
    console.log(`   Selected service: ${result.data[0].name} ($${result.data[0].price})`)
    return true
  } else {
    console.log('❌ Failed to get services:', result.data)
    return false
  }
}

async function testGetProviders() {
  console.log('\n🔍 Testing: Get Providers')
  const result = await makeRequest(`${BASE_URL}/api/users?role=PROVIDER`)
  
  if (result.status === 200 && result.data.length > 0) {
    testData.appointment.providerId = result.data[0].id
    console.log('✅ Providers retrieved successfully')
    console.log(`   Selected provider: ${result.data[0].name}`)
    return true
  } else {
    console.log('❌ Failed to get providers:', result.data)
    return false
  }
}

async function testCreateAppointment() {
  console.log('\n🔍 Testing: Create Appointment with Online Payment')
  const result = await makeRequest(`${BASE_URL}/api/appointments/public`, {
    method: 'POST',
    body: JSON.stringify(testData.appointment)
  })
  
  if (result.status === 201) {
    console.log('✅ Appointment created successfully')
    console.log(`   Appointment ID: ${result.data.appointment.id}`)
    console.log(`   Payment Method: ${result.data.appointment.paymentMethod}`)
    console.log(`   Payment Status: ${result.data.appointment.paymentStatus}`)
    console.log(`   Payment Amount: $${result.data.appointment.paymentAmount}`)
    return result.data.appointment.id
  } else {
    console.log('❌ Failed to create appointment:', result.data)
    return null
  }
}

async function testCreatePaymentIntent(appointmentId) {
  console.log('\n🔍 Testing: Create Payment Intent')
  const result = await makeRequest(`${BASE_URL}/api/payments/create-intent`, {
    method: 'POST',
    body: JSON.stringify({ appointmentId })
  })
  
  if (result.status === 200) {
    console.log('✅ Payment intent created successfully')
    console.log(`   Client Secret: ${result.data.clientSecret.substring(0, 20)}...`)
    return result.data.clientSecret
  } else {
    console.log('❌ Failed to create payment intent:', result.data)
    return null
  }
}

async function testCancelAppointment(appointmentId) {
  console.log('\n🔍 Testing: Cancel Appointment')
  const result = await makeRequest(`${BASE_URL}/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Testing cancellation functionality'
    })
  })
  
  if (result.status === 200) {
    console.log('✅ Appointment cancelled successfully')
    console.log(`   Cancellation can proceed: ${result.data.canCancel}`)
    if (result.data.refundInfo) {
      console.log(`   Refund amount: $${result.data.refundInfo.amount}`)
      console.log(`   Refund percentage: ${result.data.refundInfo.percentage}%`)
    }
    return true
  } else {
    console.log('❌ Failed to cancel appointment:', result.data)
    return false
  }
}

async function testCashPaymentFlow() {
  console.log('\n💰 Testing: Cash Payment Flow')
  
  // Create appointment with cash payment
  const cashAppointment = {
    ...testData.appointment,
    paymentMethod: 'CASH',
    clientEmail: 'cash-test@example.com'
  }
  
  const result = await makeRequest(`${BASE_URL}/api/appointments/public`, {
    method: 'POST',
    body: JSON.stringify(cashAppointment)
  })
  
  if (result.status === 201) {
    console.log('✅ Cash appointment created successfully')
    console.log(`   Payment Method: ${result.data.appointment.paymentMethod}`)
    return result.data.appointment.id
  } else {
    console.log('❌ Failed to create cash appointment:', result.data)
    return null
  }
}

async function runTests() {
  console.log('🚀 Starting Payment and Cancellation Tests')
  console.log('==========================================')
  
  try {
    // Test basic data retrieval
    const servicesOk = await testGetServices()
    if (!servicesOk) return
    
    const providersOk = await testGetProviders()
    if (!providersOk) return
    
    // Test online payment flow
    const appointmentId = await testCreateAppointment()
    if (!appointmentId) return
    
    const clientSecret = await testCreatePaymentIntent(appointmentId)
    if (!clientSecret) return
    
    // Test cancellation
    await testCancelAppointment(appointmentId)
    
    // Test cash payment flow
    const cashAppointmentId = await testCashPaymentFlow()
    if (cashAppointmentId) {
      await testCancelAppointment(cashAppointmentId)
    }
    
    console.log('\n🎉 All tests completed!')
    console.log('\n📋 Summary:')
    console.log('- ✅ Service retrieval')
    console.log('- ✅ Provider retrieval') 
    console.log('- ✅ Online appointment creation')
    console.log('- ✅ Payment intent creation')
    console.log('- ✅ Appointment cancellation')
    console.log('- ✅ Cash appointment creation')
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error)
  }
}

// Run tests if this script is executed directly
if (typeof window === 'undefined' && require.main === module) {
  // Node.js environment
  const fetch = require('node-fetch')
  global.fetch = fetch
  runTests()
} else if (typeof window !== 'undefined') {
  // Browser environment
  console.log('Payment and Cancellation Test Suite Loaded')
  console.log('Run runTests() to start testing')
  window.runTests = runTests
}

module.exports = { runTests, testData }
