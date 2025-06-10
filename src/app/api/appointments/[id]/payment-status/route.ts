import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/appointments/[id]/payment-status - Get appointment payment status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: { select: { name: true, duration: true } },
        client: { select: { name: true, email: true } },
        provider: { select: { name: true } },
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        paymentMethod: appointment.paymentMethod,
        paymentStatus: appointment.paymentStatus,
        paymentAmount: appointment.paymentAmount,
        service: appointment.service,
        client: appointment.client,
        provider: appointment.provider,
      }
    })

  } catch (error) {
    console.error('Error fetching appointment payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment details' },
      { status: 500 }
    )
  }
}
