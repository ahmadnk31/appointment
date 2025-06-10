'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarX, AlertTriangle, DollarSign, Clock } from 'lucide-react'
import { differenceInHours, format } from 'date-fns'

interface CancelAppointmentButtonProps {
  appointment: {
    id: string
    startTime: string
    status: string
    paymentMethod?: string
    paymentStatus?: string
    paymentAmount?: number
    service: {
      name: string
      price: number
    }
  }
  onCancel: () => void
  cancellationSettings?: {
    allowCancellation: boolean
    cancellationDeadlineHours: number
    refundPolicy: 'full' | 'partial' | 'none'
    partialRefundPercentage?: number
  }
}

export default function CancelAppointmentButton({ 
  appointment, 
  onCancel, 
  cancellationSettings = {
    allowCancellation: true,
    cancellationDeadlineHours: 24,
    refundPolicy: 'full'
  }
}: CancelAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startTime = new Date(appointment.startTime)
  const hoursUntilAppointment = differenceInHours(startTime, new Date())
  
  // Check if cancellation is allowed
  const canCancel = 
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'COMPLETED' &&
    startTime > new Date() &&
    cancellationSettings.allowCancellation &&
    hoursUntilAppointment >= cancellationSettings.cancellationDeadlineHours

  // Calculate potential refund
  const calculateRefund = () => {
    if (appointment.paymentMethod !== 'ONLINE' || appointment.paymentStatus !== 'PAID') {
      return 0
    }

    const amount = appointment.paymentAmount || appointment.service.price
    
    switch (cancellationSettings.refundPolicy) {
      case 'full':
        return amount
      case 'partial':
        return amount * ((cancellationSettings.partialRefundPercentage || 50) / 100)
      default:
        return 0
    }
  }

  const refundAmount = calculateRefund()

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    setCancelling(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsOpen(false)
        onCancel()
      } else {
        setError(result.error || 'Failed to cancel appointment')
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err)
      setError('An unexpected error occurred')
    } finally {
      setCancelling(false)
    }
  }

  if (!canCancel) {
    const getCancelRestrictionMessage = () => {
      if (appointment.status === 'CANCELLED') return 'Already cancelled'
      if (appointment.status === 'COMPLETED') return 'Already completed'
      if (startTime <= new Date()) return 'Cannot cancel past appointments'
      if (!cancellationSettings.allowCancellation) return 'Cancellation not allowed'
      if (hoursUntilAppointment < cancellationSettings.cancellationDeadlineHours) {
        return `Must cancel at least ${cancellationSettings.cancellationDeadlineHours} hours before appointment`
      }
      return 'Cannot cancel'
    }

    return (
      <Button variant="outline" disabled size="sm">
        <CalendarX className="w-4 h-4 mr-2" />
        {getCancelRestrictionMessage()}
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <CalendarX className="w-4 h-4 mr-2" />
          Cancel Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service:</span>
                <span className="font-medium">{appointment.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="font-medium">{format(startTime, "PPP 'at' p")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hours until appointment:</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{hoursUntilAppointment}h</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Information */}
          {appointment.paymentMethod === 'ONLINE' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Refund Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">Online (Card)</span>
                </div>
                <div className="flex justify-between">
                  <span>Refund Policy:</span>
                  <span className="font-medium capitalize">{cancellationSettings.refundPolicy}</span>
                </div>
                {refundAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Refund Amount:</span>
                    <span className="font-medium text-green-600">${refundAmount.toFixed(2)}</span>
                  </div>
                )}
                {refundAmount === 0 && cancellationSettings.refundPolicy === 'none' && (
                  <div className="text-red-600 text-xs">
                    No refund will be issued for this cancellation
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a brief reason for cancelling..."
              rows={3}
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. {refundAmount > 0 && 'A refund will be processed to your original payment method.'}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Keep Appointment
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={cancelling || !reason.trim()}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
