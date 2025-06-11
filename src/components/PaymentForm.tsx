'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react'

interface PaymentFormProps {
  bookingData: {
    serviceId: string
    providerId: string
    startTime: string
    endTime: string
    clientName: string
    clientEmail: string
    clientPhone: string | null
    notes: string | null
    paymentMethod: string
    service: {
      name: string
      price: number
    }
    amount: number
    tenantSlug?: string
  }
  onSuccess: () => void
  onError: (error: string) => void
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PaymentForm({ bookingData, onSuccess, onError }: PaymentFormProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!stripePromise) {
      onError('Stripe is not configured properly')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // First create the appointment
      let createAppointmentUrl = '/api/appointments/public'
      if (bookingData.tenantSlug) {
        createAppointmentUrl += `?tenant=${bookingData.tenantSlug}`
      }

      const appointmentResponse = await fetch(createAppointmentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: bookingData.serviceId,
          providerId: bookingData.providerId,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          clientName: bookingData.clientName,
          clientEmail: bookingData.clientEmail,
          clientPhone: bookingData.clientPhone,
          notes: bookingData.notes,
          paymentMethod: 'ONLINE',
        }),
      })

      if (!appointmentResponse.ok) {
        const appointmentError = await appointmentResponse.json()
        setError(appointmentError.error || 'Failed to create appointment')
        return
      }

      const appointmentResult = await appointmentResponse.json()
      const appointment = appointmentResult.appointment

      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: bookingData.amount,
        }),
      })

      const { clientSecret, error: apiError } = await response.json()

      if (apiError) {
        setError(apiError)
        return
      }

      const stripe = await stripePromise
      if (!stripe) {
        setError('Stripe failed to load')
        return
      }

      // Redirect to Stripe payment
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?appointment_id=${appointment.id}`,
        },
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
      }

    } catch (err) {
      console.error('Payment error:', err)
      setError('An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Complete payment to confirm your appointment for {bookingData.service.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Service:</span>
            <span>{bookingData.service.name}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-medium">Total Amount:</span>
            <span className="text-xl font-bold text-green-600">
              ${bookingData.amount}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Complete your payment to confirm and book your appointment. Your appointment will be automatically created after successful payment.
          </p>
          <div className="flex gap-2 text-xs text-gray-500">
            <CheckCircle className="w-4 h-4" />
            <span>256-bit SSL encryption</span>
          </div>
        </div>

        <Button 
          onClick={handlePayment}
          disabled={processing}
          className="w-full"
          size="lg"
        >
          {processing ? 'Processing...' : `Pay $${bookingData.amount} & Book Appointment`}
        </Button>

        <p className="text-xs text-center text-gray-500">
          By clicking "Pay", you agree to complete this payment and confirm your appointment.
        </p>
      </CardContent>
    </Card>
  )
}
