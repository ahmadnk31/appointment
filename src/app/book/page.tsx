'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar, Clock, DollarSign, User, Mail, Phone, CalendarIcon, CheckCircle, AlertCircle, CreditCard, Banknote } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'
import PaymentForm from '@/components/PaymentForm'


interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  imageUrl?: string
  provider: {
    id: string
    name: string
    email: string
  }
}

function PublicBookingForm() {  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantSlug = searchParams.get('tenant')
  
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  
  // Client form data
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      
      // Construct API URL with tenant parameter if available
      let apiUrl = '/api/services/public'
      if (tenantSlug) {
        apiUrl += `?tenant=${tenantSlug}`
      }
      
      console.log('Fetching services with URL:', apiUrl)
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Services fetched successfully:', data)
        setServices(data)
      } else {
        console.error('Failed to fetch services:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        setError('Failed to load services. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      setError('Failed to load services. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  const handleTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    // Note: Only set state, don't trigger any automatic submission
  }

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId)
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setSelectedProvider(service.provider.id)
    }
    setSelectedTime('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!selectedService || !selectedDate || !selectedTime || !clientData.name || !clientData.email) {
      setError('Please fill in all required fields')
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setSubmitting(true)

    try {
      const service = services.find(s => s.id === selectedService)
      if (!service) return

      // Create start time
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)
      
      // Create end time
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + service.duration)

      // For online payments, don't create appointment yet - just validate and show payment
      if (paymentMethod === 'ONLINE') {
        // Validate availability without creating appointment
        const availabilityResponse = await fetch(`/api/appointments/check-availability?${new URLSearchParams({
          providerId: selectedProvider,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...(tenantSlug && { tenant: tenantSlug })
        })}`)

        if (!availabilityResponse.ok) {
          setError('Time slot is no longer available')
          return
        }

        // Store booking data for after payment completion
        const bookingData = {
          serviceId: selectedService,
          providerId: selectedProvider,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          clientName: clientData.name,
          clientEmail: clientData.email,
          clientPhone: clientData.phone || null,
          notes: clientData.notes || null,
          paymentMethod,
          service: selectedServiceData,
          amount: selectedServiceData?.price || 0,
          tenantSlug: tenantSlug
        }
        sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData))
        setShowPaymentForm(true)
        return
      }

      // For cash payments, create appointment immediately
      // Construct API URL with tenant parameter
      let apiUrl = '/api/appointments/public'
      if (tenantSlug) {
        apiUrl += `?tenant=${tenantSlug}`
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedService,
          providerId: selectedProvider,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          clientName: clientData.name,
          clientEmail: clientData.email,
          clientPhone: clientData.phone || null,
          notes: clientData.notes || null,
          paymentMethod,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // For cash payments, appointment is created immediately
        setSuccess(true)
        // Reset form
        setSelectedService('')
        setSelectedProvider('')
        setSelectedDate(undefined)
        setSelectedTime('')
        setClientData({ name: '', email: '', phone: '', notes: '' })
        setPaymentMethod('CASH')
      } else {
        setError(result.error || 'Failed to book appointment')
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      setError('Failed to book appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-700">Booking Confirmed!</h2>
              <p className="text-gray-600">
                Thank you for your appointment request. You will receive a confirmation email shortly.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setSuccess(false)}>
                  Book Another Appointment
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  Back to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Book an Appointment</h1>
        <p className="text-gray-600">Schedule your appointment by filling out the form below</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Service Selection
              </CardTitle>
              <CardDescription>Choose the service you need</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Selection */}
              <div className="space-y-2">
                <Label>Service *</Label>
                <Select value={selectedService} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center gap-3">
                          {service.imageUrl && (
                            <div className="relative w-12 h-12 overflow-hidden rounded-lg flex-shrink-0">
                              <img 
                                src={service.imageUrl} 
                                alt={service.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-sm text-gray-500">
                              {service.duration} min - ${service.price} - with {service.provider.name}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>              {/* Service Details */}
              {selectedServiceData && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  {selectedServiceData.imageUrl && (
                    <div className="relative w-full h-48 overflow-hidden rounded-lg mb-3">
                      <img 
                        src={selectedServiceData.imageUrl} 
                        alt={selectedServiceData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedServiceData.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{selectedServiceData.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium text-green-600">${selectedServiceData.price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>with {selectedServiceData.provider.name}</span>
                    </div>
                    {selectedServiceData.description && (
                      <p className="text-sm text-gray-600 mt-2">{selectedServiceData.description}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Your Information
              </CardTitle>
              <CardDescription>Please provide your contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={clientData.name}
                  onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={clientData.notes}
                  onChange={(e) => setClientData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information or special requests..."
                  rows={3}
                />
              </div>            </CardContent>
          </Card>
        </div>

        {/* Payment Method Selection - Only show if service is selected */}
        {selectedService && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </CardTitle>
              <CardDescription>Choose how you would like to pay for your appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={(value: 'CASH' | 'ONLINE') => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CASH" id="cash" />
                  <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                    <Banknote className="w-4 h-4" />
                    Pay in shop (Cash)
                    <Badge variant="secondary">Pay when you arrive</Badge>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ONLINE" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="w-4 h-4" />
                    Pay online (Card)
                    <Badge variant="outline">Secure payment with Stripe</Badge>
                  </Label>
                </div>
              </RadioGroup>
              
              {selectedServiceData && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">${selectedServiceData.price}</span>
                  </div>
                  {paymentMethod === 'ONLINE' && (
                    <p className="text-xs text-gray-600 mt-1">
                      Payment will be processed securely through Stripe
                    </p>
                  )}
                  {paymentMethod === 'CASH' && (
                    <p className="text-xs text-gray-600 mt-1">
                      Payment due upon arrival at the appointment
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Availability Calendar - Only show if service is selected */}
        {selectedService && selectedProvider && tenantSlug && (
          <AvailabilityCalendar
            tenantSlug={tenantSlug}
            providerId={selectedProvider}
            onTimeSelect={handleTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        )}

        {/* Booking Summary */}
        {selectedService && selectedDate && selectedTime && clientData.name && clientData.email && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Service Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Service:</strong> {selectedServiceData?.name}</p>
                    <p><strong>Provider:</strong> {selectedServiceData?.provider.name}</p>
                    <p><strong>Duration:</strong> {selectedServiceData?.duration} minutes</p>
                    <p><strong>Price:</strong> ${selectedServiceData?.price}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Appointment Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Date:</strong> {format(selectedDate, "PPPP")}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p><strong>Client:</strong> {clientData.name}</p>
                    <p><strong>Email:</strong> {clientData.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}        {/* Submit Button */}
        <div className="flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            disabled={submitting || !selectedService || !selectedDate || !selectedTime || !clientData.name || !clientData.email}
            className="w-full md:w-auto"
          >
            {submitting ? 'Processing...' : 
             paymentMethod === 'ONLINE' ? 'Continue to Payment' : 'Book Appointment'}
          </Button>
        </div>
      </form>

      {/* Payment Form - Show when online payment is selected and appointment is created */}
      {showPaymentForm && (
        <div className="mt-6">
          <PaymentForm
            bookingData={JSON.parse(sessionStorage.getItem('pendingBooking') || '{}')}
            onSuccess={() => {
              setShowPaymentForm(false)
              setSuccess(true)
              sessionStorage.removeItem('pendingBooking')
            }}
            onError={(error: string) => setError(error)}
          />
        </div>
      )}
    </div>
  )
}

export default function PublicBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PublicBookingForm />
    </Suspense>
  )
}
