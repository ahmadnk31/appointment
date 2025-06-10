'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { Calendar, Clock, DollarSign, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
}

interface Provider {
  id: string
  name: string
  email: string
}

export default function BookAppointmentPage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<Service[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Available time slots (in a real app, this would be dynamic based on provider availability)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]

  useEffect(() => {
    fetchServices()
    fetchProviders()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data.filter((service: Service) => service))
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/users?role=PROVIDER')
      if (response.ok) {
        const data = await response.json()
        setProviders(data)
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedService || !selectedProvider || !selectedDate || !selectedTime) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const service = services.find(s => s.id === selectedService)
      if (!service) return

      // Create start and end times
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startTime = new Date(selectedDate)
      startTime.setHours(hours, minutes, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + service.duration)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${service.name} - ${session?.user.name}`,
          serviceId: selectedService,
          providerId: selectedProvider,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes,
        }),
      })

      if (response.ok) {
        alert('Appointment booked successfully!')
        // Reset form
        setSelectedService('')
        setSelectedProvider('')
        setSelectedDate(undefined)
        setSelectedTime('')
        setNotes('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to book appointment')
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      alert('Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Book Appointment</h1>
        <p className="text-gray-600">Schedule your next appointment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          <CardDescription>
            Fill in the details to book your appointment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Service Selection */}
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        <span className="text-sm text-gray-500">
                          {service.duration} min - ${service.price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedServiceData && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {selectedServiceData.duration} minutes
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      ${selectedServiceData.price}
                    </span>
                  </div>
                  {selectedServiceData.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedServiceData.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Provider *</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Time *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information or special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedService && selectedDate && selectedTime && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Appointment Summary</h3>
                <div className="space-y-1 text-sm">
                  <div>Service: {selectedServiceData?.name}</div>
                  <div>Date: {format(selectedDate, "PPP")}</div>
                  <div>Time: {selectedTime}</div>
                  <div>Duration: {selectedServiceData?.duration} minutes</div>
                  <div>Price: ${selectedServiceData?.price}</div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Booking...' : 'Book Appointment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
