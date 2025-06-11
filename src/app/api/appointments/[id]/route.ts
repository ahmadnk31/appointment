import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email'
import { calendarService } from '@/lib/calendar'

// PUT /api/appointments/[id] - Update appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    const body = await request.json()
    const { status, notes, startTime, endTime, serviceId, clientId, providerId } = body

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: id },
      include: {
        client: true,
        provider: true,
        service: true,
        tenant: true,
      },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const canUpdate =
      session.user.role === 'ADMIN' ||
      (session.user.role === 'PROVIDER' && existingAppointment.providerId === session.user.id) ||
      (session.user.role === 'CLIENT' && existingAppointment.clientId === session.user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get service info (either new or existing)
    let service = existingAppointment.service
    if (serviceId && serviceId !== existingAppointment.serviceId) {
      const newService = await prisma.service.findUnique({
        where: { id: serviceId, tenantId: session.user.tenantId },
      })
      if (!newService) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }
      service = newService
    }

    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (serviceId) updateData.serviceId = serviceId
    if (clientId) updateData.clientId = clientId
    if (providerId) updateData.providerId = providerId
    
    // Handle time updates
    if (startTime && endTime) {
      const startDateTime = new Date(startTime)
      const endDateTime = new Date(endTime)
      
      // Validate times
      if (startDateTime >= endDateTime) {
        return NextResponse.json(
          { error: 'Start time must be before end time' },
          { status: 400 }
        )
      }
      
      // Check for conflicts if time, provider, or service is changing
      const checkProviderId = providerId || existingAppointment.providerId
      if (startDateTime.getTime() !== existingAppointment.startTime.getTime() || 
          endDateTime.getTime() !== existingAppointment.endTime.getTime() ||
          checkProviderId !== existingAppointment.providerId) {
        
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            id: { not: id },
            providerId: checkProviderId,
            tenantId: session.user.tenantId,
            status: { notIn: ['CANCELLED'] },
            OR: [
              {
                startTime: { lte: startDateTime },
                endTime: { gt: startDateTime },
              },
              {
                startTime: { lt: endDateTime },
                endTime: { gte: endDateTime },
              },
              {
                startTime: { gte: startDateTime },
                endTime: { lte: endDateTime },
              },
            ],
          },
        })

        if (conflictingAppointment) {
          return NextResponse.json(
            { error: 'Time slot is already booked' },
            { status: 409 }
          )
        }
      }
      
      updateData.startTime = startDateTime
      updateData.endTime = endDateTime
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
        tenant: { select: { name: true } },
      },
    })    // Send cancellation email if status changed to cancelled
    if (status === 'CANCELLED' && existingAppointment.status !== 'CANCELLED') {
      try {
        const emailService = EmailService.getInstance()
        await emailService.sendAppointmentCancellation(
          updatedAppointment.client.email,
          updatedAppointment.client.name,
          {
            serviceName: updatedAppointment.service.name,
            providerName: updatedAppointment.provider.name,
            startTime: updatedAppointment.startTime,
            tenantName: updatedAppointment.tenant.name,
          }
        )
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
      }
    }

    // Update Google Calendar event
    try {
      // If appointment was cancelled, delete the calendar event
      if (status === 'CANCELLED' && existingAppointment.calendarEventId) {
        await calendarService.deleteAppointmentEvent(existingAppointment.calendarEventId)
        
        // Clear the calendar event ID from the appointment
        await prisma.appointment.update({
          where: { id: id },
          data: { calendarEventId: null },
        })
      }
      // If appointment details changed (time, service, etc.), update the calendar event
      else if (existingAppointment.calendarEventId && (
        startTime || endTime || serviceId || 
        existingAppointment.startTime.getTime() !== updatedAppointment.startTime.getTime() ||
        existingAppointment.endTime.getTime() !== updatedAppointment.endTime.getTime()
      )) {
        await calendarService.updateAppointmentEvent(existingAppointment.calendarEventId, {
          title: `${updatedAppointment.service.name} - ${updatedAppointment.client.name}`,
          description: `Appointment with ${updatedAppointment.provider.name}\n\nService: ${updatedAppointment.service.name}\nClient: ${updatedAppointment.client.name}\nEmail: ${updatedAppointment.client.email}\nPhone: ${updatedAppointment.client.phone || 'N/A'}\n\nNotes: ${updatedAppointment.notes || 'No notes provided'}`,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          attendees: [updatedAppointment.client.email, updatedAppointment.provider.email],
          location: updatedAppointment.tenant.name,
        })
      }
      // If no calendar event exists but appointment is confirmed, create one
      else if (!existingAppointment.calendarEventId && updatedAppointment.status === 'CONFIRMED') {
        const calendarEventId = await calendarService.createAppointmentEvent({
          title: `${updatedAppointment.service.name} - ${updatedAppointment.client.name}`,
          description: `Appointment with ${updatedAppointment.provider.name}\n\nService: ${updatedAppointment.service.name}\nClient: ${updatedAppointment.client.name}\nEmail: ${updatedAppointment.client.email}\nPhone: ${updatedAppointment.client.phone || 'N/A'}\n\nNotes: ${updatedAppointment.notes || 'No notes provided'}`,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          attendees: [updatedAppointment.client.email, updatedAppointment.provider.email],
          location: updatedAppointment.tenant.name,
        })

        // Update the appointment with the calendar event ID if creation was successful
        if (calendarEventId) {
          await prisma.appointment.update({
            where: { id: id },
            data: { calendarEventId },
          })
        }
      }
    } catch (calendarError) {
      console.error('Error updating calendar event:', calendarError)
      // Don't fail the appointment update if calendar event fails
    }

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/appointments/[id] - Update appointment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: id },
      include: {
        client: true,
        provider: true,
        service: true,
        tenant: true,
      },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const canUpdate =
      session.user.role === 'ADMIN' ||
      (session.user.role === 'PROVIDER' && existingAppointment.providerId === session.user.id) ||
      (session.user.role === 'CLIENT' && existingAppointment.clientId === session.user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: id },
      data: { status },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
        tenant: { select: { name: true } },
      },
    })    // Send email notifications based on status change
    try {
      const emailService = EmailService.getInstance()
      
      if (status === 'CONFIRMED' && existingAppointment.status !== 'CONFIRMED') {
        await emailService.sendAppointmentConfirmation(
          updatedAppointment.client.email,
          updatedAppointment.client.name,
          {
            serviceName: updatedAppointment.service.name,
            providerName: updatedAppointment.provider.name,
            startTime: updatedAppointment.startTime,
            endTime: updatedAppointment.endTime,
            tenantName: updatedAppointment.tenant.name,
          }
        )
      } else if (status === 'CANCELLED' && existingAppointment.status !== 'CANCELLED') {
        await emailService.sendAppointmentCancellation(
          updatedAppointment.client.email,
          updatedAppointment.client.name,
          {
            serviceName: updatedAppointment.service.name,
            providerName: updatedAppointment.provider.name,
            startTime: updatedAppointment.startTime,
            tenantName: updatedAppointment.tenant.name,
          }
        )
      }
    } catch (emailError) {
      console.error('Error sending status update email:', emailError)
      // Don't fail the status update if email fails
    }

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Error updating appointment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/appointments/[id] - Delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: id },
      include: {
        client: true,
        provider: true,
        service: true,
        tenant: true,
      },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check authorization - only admin can delete
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }    // Delete Google Calendar event first (before deleting the appointment)
    if (existingAppointment.calendarEventId) {
      try {
        await calendarService.deleteAppointmentEvent(existingAppointment.calendarEventId)
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError)
        // Continue with appointment deletion even if calendar deletion fails
      }
    }

    // Delete appointment
    await prisma.appointment.delete({
      where: { id: id },
    })

    // Send cancellation email
    try {
      const emailService = EmailService.getInstance()
      await emailService.sendAppointmentCancellation(
        existingAppointment.client.email,
        existingAppointment.client.name,
        {
          serviceName: existingAppointment.service.name,
          providerName: existingAppointment.provider.name,
          startTime: existingAppointment.startTime,
          tenantName: existingAppointment.tenant.name,
        }
      )
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    return NextResponse.json({ message: 'Appointment deleted successfully' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
