'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, Clock, DollarSign, User } from 'lucide-react'
import { format } from 'date-fns'

interface AppointmentDetails {
  id: string
  startTime: string
  endTime: string
  status: string
  paymentStatus: string
  paymentAmount: number
  service: {
    name: string
    duration: number
  }
  client: {
    name: string
    email: string
  }
  provider: {
    name: string
  }
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appointmentId = searchParams.get('appointment_id')
  const paymentIntentId = searchParams.get('payment_intent')

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails()
    } else {
      setError('No appointment ID provided')
      setLoading(false)
    }
  }, [appointmentId])

  const fetchAppointmentDetails = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/payment-status`)
      
      if (response.ok) {
        const data = await response.json()
        setAppointment(data.appointment)
      } else {
        setError('Failed to fetch appointment details')
      }
    } catch (err) {
      console.error('Error fetching appointment:', err)
      setError('An error occurred while fetching appointment details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing payment confirmation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
              <h2 className="text-2xl font-bold text-red-700">Payment Error</h2>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => router.push('/book')} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Appointment Not Found</h2>
              <p className="text-gray-600">We couldn't find the appointment details.</p>
              <Button onClick={() => router.push('/book')} variant="outline">
                Book New Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your appointment has been confirmed and payment processed successfully.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-3">Appointment Confirmed</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="font-medium">Date & Time:</span>
                <span>{format(new Date(appointment.startTime), "PPPP 'at' p")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="font-medium">Duration:</span>
                <span>{appointment.service.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium">Service:</span>
                <span>{appointment.service.name} with {appointment.provider.name}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Amount Paid:</span>
                <span className="text-lg font-bold text-green-600">
                  ${appointment.paymentAmount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Payment Status:</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  {appointment.paymentStatus}
                </span>
              </div>
              {paymentIntentId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Transaction ID:</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {paymentIntentId.slice(0, 20)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You will receive a confirmation email shortly</li>
              <li>• A calendar invite will be sent to your email</li>
              <li>• You can view your appointment in the dashboard</li>
              <li>• Please arrive 5-10 minutes early for your appointment</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/dashboard/my-appointments')}>
              View My Appointments
            </Button>
            <Button variant="outline" onClick={() => router.push('/book')}>
              Book Another Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
