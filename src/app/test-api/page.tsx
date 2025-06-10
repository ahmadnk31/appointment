'use client'

import { useEffect, useState } from 'react'

export default function TestPage() {
  const [status, setStatus] = useState('Loading...')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function testAPI() {
      try {
        setStatus('Testing tenant resolution...')
        
        // Test tenant resolution
        const tenantResponse = await fetch('/api/tenants/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug: 'demo-clinic' })
        })
        
        if (!tenantResponse.ok) {
          setStatus(`Tenant API failed: ${tenantResponse.status}`)
          return
        }
        
        const tenantData = await tenantResponse.json()
        setStatus('Tenant resolved, testing services...')
        
        // Test services API
        const servicesResponse = await fetch(`/api/services/public?tenant=${tenantData.slug}`)
        
        if (!servicesResponse.ok) {
          setStatus(`Services API failed: ${servicesResponse.status}`)
          const errorText = await servicesResponse.text()
          setData({ error: errorText })
          return
        }
        
        const servicesData = await servicesResponse.json()
        setStatus('Success!')
        setData({ tenant: tenantData, services: servicesData })
        
      } catch (error) {
        setStatus(`Error: ${error}`)
        setData({ error: error })
      }
    }
    
    testAPI()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>API Test Page</h1>
      <p><strong>Status:</strong> {status}</p>
      {data && (
        <div>
          <h2>Data:</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
