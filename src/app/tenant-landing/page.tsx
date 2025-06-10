'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Phone, Mail, Star, CheckCircle } from 'lucide-react'

interface TenantInfo {
  id: string
  name: string
  slug: string
  domain?: string
  settings?: {
    businessName: string
    businessEmail: string
    businessPhone?: string
    businessAddress?: string
    timeZone: string
    workingHours: any
    bookingSettings: any
  }
}

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  isActive: boolean
}

export default function TenantLandingPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchTenantInfo()
  }, [])
  
  const fetchTenantInfo = async () => {
    try {
      // First, try to get tenant info from current domain/slug
      const urlParams = new URLSearchParams(window.location.search)
      const tenantSlug = urlParams.get('tenant')
      const domain = window.location.hostname
      
      const tenantResponse = await fetch('/api/tenants/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          domain: tenantSlug ? null : domain,
          slug: tenantSlug 
        })
      })

      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json()
        console.log('Tenant data received:', tenantData)
        setTenant(tenantData)
        
        // Now fetch services for this tenant
        console.log('Fetching services for tenant:', tenantData.slug)
        const servicesResponse = await fetch(`/api/services/public?tenant=${tenantData.slug}`)
        console.log('Services response status:', servicesResponse.status)
        
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json()
          console.log('Services data received:', servicesData)
          setServices(servicesData)
        } else {
          console.error('Failed to fetch services:', servicesResponse.status)
          const errorText = await servicesResponse.text()
          console.error('Services error details:', errorText)
        }
      } else {
        console.error('Failed to fetch tenant:', tenantResponse.status)
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    return `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ''}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Business Not Found</h3>
            <p className="text-gray-600 mb-4">
              This domain is not associated with any active business.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Main Site
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tenant.settings?.businessName || tenant.name}
              </h1>
              <p className="text-sm text-gray-600">Professional Services</p>
            </div>
            <div className="space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Book Your Appointment
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Schedule your appointment with {tenant.settings?.businessName || tenant.name} quickly and easily. 
            Choose from our range of professional services and find a time that works for you.
          </p>          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book">
              <Button size="lg" className="px-8 py-3">
                Book Now
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-3">
              View Services
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {services.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Services
              </h3>
              <p className="text-xl text-gray-600">
                Choose from our range of professional services
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.slice(0, 6).map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {service.name}
                      <Badge variant="secondary">{formatPrice(service.price)}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDuration(service.duration)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-gray-600 mb-4">{service.description}</p>
                    )}                    <Link href="/book">
                      <Button className="w-full">Book This Service</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Business Info Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose Us?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">Easy Online Booking</h4>
                    <p className="text-gray-600">Book appointments 24/7 through our convenient online system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">Professional Service</h4>
                    <p className="text-gray-600">Experienced professionals committed to excellent service</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">Flexible Scheduling</h4>
                    <p className="text-gray-600">Multiple time slots available to fit your busy schedule</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Contact Information
              </h3>
              <div className="space-y-4">
                {tenant.settings?.businessEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span>{tenant.settings.businessEmail}</span>
                  </div>
                )}
                {tenant.settings?.businessPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span>{tenant.settings.businessPhone}</span>
                  </div>
                )}
                {tenant.settings?.businessAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <span>{tenant.settings.businessAddress}</span>
                  </div>
                )}
              </div>

              {/* Working Hours */}
              {tenant.settings?.workingHours && (
                <div className="mt-8">
                  <h4 className="text-xl font-semibold mb-4">Business Hours</h4>
                  <div className="space-y-2">
                    {Object.entries(tenant.settings.workingHours).map(([day, hours]: [string, any]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize font-medium">{day}</span>
                        <span className="text-gray-600">
                          {hours.enabled ? `${hours.start} - ${hours.end}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Book Your Appointment?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who trust us with their needs. 
            Book your appointment today and experience the difference.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="px-8 py-3">
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h4 className="text-2xl font-bold mb-4">
            {tenant.settings?.businessName || tenant.name}
          </h4>
          <p className="text-gray-400 mb-4">
            Professional appointment booking made simple
          </p>
          <div className="flex justify-center space-x-6">
            {tenant.settings?.businessEmail && (
              <a 
                href={`mailto:${tenant.settings.businessEmail}`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-6 h-6" />
              </a>
            )}
            {tenant.settings?.businessPhone && (
              <a 
                href={`tel:${tenant.settings.businessPhone}`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-6 h-6" />
              </a>
            )}
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-gray-400">
            © 2025 {tenant.settings?.businessName || tenant.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
