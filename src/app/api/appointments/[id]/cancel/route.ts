import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EmailService } from '@/lib/email'

interface CancellationSettings {
  allowCancellation?: boolean
  cancellationDeadlineHours?: number
  refundPolicy?: 'full' | 'partial' | 'none'
  partialRefundPercentage?: number
}

// POST /api/appointments/[id]/cancel - Cancel an appointment with time restrictions
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const session = await getServerSession(authOptions)
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { reason } = body
    const appointmentId = id

    // Find the appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        service: true,
        client: true,
        provider: true,
        tenant: {
          include: {
            settings: true
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      )
    }

    // Check if appointment is in the past
    if (appointment.startTime <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot cancel past appointments' },
        { status: 400 }
      )
    }

    // Get cancellation settings
    const cancellationSettings = appointment.tenant.settings?.cancellationSettings as CancellationSettings || {}
    
    if (!cancellationSettings.allowCancellation) {
      return NextResponse.json(
        { error: 'Cancellation is not allowed for this business' },
        { status: 403 }
      )
    }

    // Check cancellation deadline
    const deadlineHours = cancellationSettings.cancellationDeadlineHours || 24
    const deadlineTime = new Date(appointment.startTime.getTime() - (deadlineHours * 60 * 60 * 1000))
    
    if (new Date() > deadlineTime) {
      return NextResponse.json(
        { error: `Cancellation must be made at least ${deadlineHours} hours before the appointment` },
        { status: 400 }
      )
    }

    // Authorization check - only client, provider, or admin can cancel
    if (session?.user) {
      const canCancel = 
        session.user.id === appointment.clientId ||
        session.user.id === appointment.providerId ||
        session.user.role === 'ADMIN'

      if (!canCancel) {
        return NextResponse.json(
          { error: 'Not authorized to cancel this appointment' },
          { status: 403 }
        )
      }
    }

    // Handle refund if payment was made online
    let refundAmount = 0
    let refundStatus = 'none'

    if (appointment.paymentMethod === 'ONLINE' && 
        appointment.paymentStatus === 'PAID' && 
        appointment.stripeChargeId) {
      
      const refundPolicy = cancellationSettings.refundPolicy || 'full'
      
      if (refundPolicy === 'full') {
        refundAmount = appointment.paymentAmount || 0
      } else if (refundPolicy === 'partial') {
        const percentage = cancellationSettings.partialRefundPercentage || 50
        refundAmount = (appointment.paymentAmount || 0) * (percentage / 100)
      }

      if (refundAmount > 0) {
        try {
          await stripe.refunds.create({
            charge: appointment.stripeChargeId,
            amount: Math.round(refundAmount * 100), // Convert to cents
            metadata: {
              appointmentId: appointment.id,
              reason: reason || 'Appointment cancelled',
            }
          })
          refundStatus = refundPolicy
        } catch (stripeError) {
          console.error('Stripe refund failed:', stripeError)
          // Continue with cancellation even if refund fails
          refundAmount = 0
          refundStatus = 'failed'
        }
      }
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        paymentStatus: refundAmount > 0 ? 'REFUNDED' : appointment.paymentStatus,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        refundReason: refundAmount > 0 ? reason : undefined,
      },
      include: {
        service: true,
        client: true,
        provider: true,
      }
    })    // Send cancellation email notification
    try {
      const emailService = EmailService.getInstance()
      await emailService.sendAppointmentCancellationWithRefund(
        updatedAppointment.client.email,
        updatedAppointment.client.name,
        {
          serviceName: updatedAppointment.service.name,
          providerName: updatedAppointment.provider.name,
          startTime: updatedAppointment.startTime,
          tenantName: appointment.tenant.name,
          refundAmount,
          refundStatus,
        }
      )
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        cancelledAt: updatedAppointment.cancelledAt,
        refundAmount,
        refundStatus,
      }
    })

  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    )
  }
}
