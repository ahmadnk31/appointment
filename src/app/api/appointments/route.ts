import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email'
import { calendarService } from '@/lib/calendar'

// GET /api/appointments - Get appointments for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const clientId = searchParams.get('clientId')
    const requestedTenantId = searchParams.get('tenantId')

    // Determine which tenant to query for
    let tenantId = session.user.tenantId
    
    // Allow admin users to query specific tenants
    if (requestedTenantId && session.user.role === 'ADMIN') {
      tenantId = requestedTenantId
    }

    const where: any = {
      tenantId: tenantId,
    }

    // Filter by specific client if provided (for admin/provider viewing client appointments)
    if (clientId && (session.user.role === 'ADMIN' || session.user.role === 'PROVIDER')) {
      where.clientId = clientId
    }
    // Filter by user role
    else if (session.user.role === 'CLIENT') {
      where.clientId = session.user.id
    } else if (session.user.role === 'PROVIDER') {
      where.providerId = session.user.id
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    const body = await request.json()
    const { serviceId, providerId, clientId, startTime, endTime, notes } = body

    // Validate required fields
    if (!serviceId || !providerId || !clientId || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get service details to calculate end time
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }    const startDateTime = new Date(startTime)
    const endDateTime = endTime ? new Date(endTime) : new Date(startDateTime.getTime() + service.duration * 60000)

    // Check for scheduling conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        providerId,
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
    }    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        startTime: startDateTime,
        endTime: endDateTime,
        notes,
        tenantId: session.user.tenantId,
        clientId,
        providerId,
        serviceId,
        status: 'PENDING',
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
        tenant: { select: { name: true } },
      },
    })    // Send confirmation email
    try {
      const emailService = EmailService.getInstance()
      await emailService.sendAppointmentConfirmation(
        appointment.client.email,
        appointment.client.name,
        {
          serviceName: appointment.service.name,
          providerName: appointment.provider.name,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          tenantName: appointment.tenant.name,
        }
      )
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the appointment creation if email fails
    }

    // Create Google Calendar event
    try {
      const calendarEventId = await calendarService.createAppointmentEvent({
        title: `${appointment.service.name} - ${appointment.client.name}`,
        description: `Appointment with ${appointment.provider.name}\n\nService: ${appointment.service.name}\nClient: ${appointment.client.name}\nEmail: ${appointment.client.email}\nPhone: ${appointment.client.phone || 'N/A'}\n\nNotes: ${appointment.notes || 'No notes provided'}`,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        attendees: [appointment.client.email, appointment.provider.email],
        location: appointment.tenant.name,
      })

      // Update the appointment with the calendar event ID if creation was successful
      if (calendarEventId) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { calendarEventId },
        })
      }
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError)
      // Don't fail the appointment creation if calendar event fails
    }

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
