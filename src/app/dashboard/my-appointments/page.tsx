'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, MapPin, Phone, Mail } from 'lucide-react'
import { format } from 'date-fns'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  service: {
    name: string
    duration: number
    price: number
  }
  provider: {
    name: string
    email: string
  }
}

export default function MyAppointmentsPage() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filterAppointments = () => {
    const now = new Date()
    
    switch (filter) {
      case 'upcoming':
        return appointments.filter(apt => 
          new Date(apt.startTime) > now && apt.status === 'SCHEDULED'
        )
      case 'past':
        return appointments.filter(apt => 
          new Date(apt.startTime) < now || apt.status !== 'SCHEDULED'
        )
      default:
        return appointments
    }
  }

  const filteredAppointments = filterAppointments()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Appointments</h1>
          <p className="text-gray-600">View and manage your appointments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setFilter('upcoming')}
            size="sm"
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            onClick={() => setFilter('past')}
            size="sm"
          >
            Past
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No {filter === 'all' ? '' : filter} appointments found
              </h3>
              <p className="text-gray-600 mb-4">
                {filter === 'upcoming' 
                  ? "You don't have any upcoming appointments. Book one now!" 
                  : "No appointments to show for this filter."}
              </p>
              {filter === 'upcoming' && (
                <Button>Book New Appointment</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAppointments
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span>{appointment.service.name}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(appointment.startTime), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(appointment.startTime), 'HH:mm')} - 
                          {format(new Date(appointment.endTime), 'HH:mm')}
                        </span>
                      </CardDescription>
                    </div>
                    {appointment.status === 'SCHEDULED' && 
                     new Date(appointment.startTime) > new Date() && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => cancelAppointment(appointment.id)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Provider Details
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{appointment.provider.name}</p>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {appointment.provider.email}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Service Details</h4>
                      <div className="space-y-1 text-sm">
                        <p>Duration: {appointment.service.duration} minutes</p>
                        <p>Price: ${appointment.service.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-1">Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {appointment.notes}
                      </p>
                    </div>
                  )}

                  {/* Appointment Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      {appointment.status === 'SCHEDULED' && new Date(appointment.startTime) > new Date() && (
                        <span className="text-blue-600">
                          {Math.ceil((new Date(appointment.startTime).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {appointment.status === 'SCHEDULED' && (
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          Reschedule
                        </Button>
                      )}
                      {appointment.status === 'COMPLETED' && (
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          Book Again
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  )
}
