import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email'
import { calendarService } from '@/lib/calendar'

// Type definitions for settings
interface BookingSettings {
  enableOnlineBooking?: boolean
  requireConfirmation?: boolean
  allowCancellation?: boolean
  cancellationDeadline?: number
  bufferTime?: number
  maxAdvanceBooking?: number
}

// POST /api/appointments/public - Create appointment without authentication (public booking)
export async function POST(request: NextRequest) {
  try {
    // Get tenant ID from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }    const body = await request.json()
    const { 
      serviceId, 
      providerId,
      startTime, 
      endTime,
      clientName,
      clientEmail,
      clientPhone,
      notes,
      paymentMethod = 'CASH' // Default to cash payment
    } = body

    // Validate required fields
    if (!serviceId || !providerId || !startTime || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!['CASH', 'ONLINE'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be CASH or ONLINE' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get service details to calculate end time if not provided
    const service = await prisma.service.findFirst({
      where: { 
        id: serviceId,
        tenantId,
        isActive: true
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found or not available' },
        { status: 404 }
      )
    }

    // Validate provider exists in this tenant
    const provider = await prisma.user.findFirst({
      where: {
        id: providerId,
        tenantId,
        role: { in: ['PROVIDER', 'ADMIN'] },
        isActive: true
      }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found or not available' },
        { status: 404 }
      )
    }

    const startDateTime = new Date(startTime)
    const endDateTime = endTime ? new Date(endTime) : new Date(startDateTime.getTime() + service.duration * 60000)

    // Validate appointment time is in the future
    if (startDateTime <= new Date()) {
      return NextResponse.json(
        { error: 'Appointment time must be in the future' },
        { status: 400 }
      )
    }

    // Check for scheduling conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        providerId,
        tenantId,
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
        { error: 'Time slot is already booked. Please choose a different time.' },
        { status: 409 }
      )
    }    // Get tenant settings to check booking rules
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    })

    // Cast booking settings from JSON
    const bookingSettings = tenantSettings?.bookingSettings as BookingSettings || {}

    if (!bookingSettings.enableOnlineBooking) {
      return NextResponse.json(
        { error: 'Online booking is not enabled for this business' },
        { status: 403 }
      )
    }

    // Check max advance booking setting
    if (bookingSettings.maxAdvanceBooking) {
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + bookingSettings.maxAdvanceBooking)
      
      if (startDateTime > maxDate) {
        return NextResponse.json(
          { error: `Appointments can only be booked up to ${bookingSettings.maxAdvanceBooking} days in advance` },
          { status: 400 }
        )
      }
    }    // Find or create client user
    let client = await prisma.user.findUnique({
      where: {
        email: clientEmail
      }
    })

    if (!client) {
      // Create new client user with a default password
      try {
        client = await prisma.user.create({
          data: {
            email: clientEmail,
            name: clientName,
            phone: clientPhone || null,
            role: 'CLIENT',
            tenantId,
            isActive: true,
            password: 'temp_password_' + Math.random().toString(36).substring(7), // Temp password
          }
        })
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Email already exists, find the user
          client = await prisma.user.findUnique({
            where: { email: clientEmail }
          })
          
          if (!client) {
            return NextResponse.json(
              { error: 'Email already exists but user not found' },
              { status: 500 }
            )
          }
        } else {
          throw error
        }
      }
    }

    // Update client info if provided and user belongs to this tenant or is a CLIENT
    if (client && (client.tenantId === tenantId || client.role === 'CLIENT')) {
      if (clientPhone && client.phone !== clientPhone) {
        await prisma.user.update({
          where: { id: client.id },
          data: { phone: clientPhone }
        })
      }
    }    // Determine appointment status based on tenant settings and payment method
    let appointmentStatus: 'PENDING' | 'CONFIRMED' = bookingSettings.requireConfirmation ? 'PENDING' : 'CONFIRMED'
    
    // For online payments, keep as PENDING until payment is confirmed
    if (paymentMethod === 'ONLINE') {
      appointmentStatus = 'PENDING'
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        startTime: startDateTime,
        endTime: endDateTime,
        notes,
        tenantId,
        clientId: client.id,
        providerId,
        serviceId,
        status: appointmentStatus,
        paymentMethod,
        paymentAmount: service.price,
        paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
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
        description: `Appointment with ${appointment.provider.name}\n\nService: ${appointment.service.name}\nClient: ${appointment.client.name}\nEmail: ${appointment.client.email}\nPhone: ${appointment.client.phone || 'N/A'}\n\nNotes: ${appointment.notes || 'No notes provided'}\n\nPayment Method: ${appointment.paymentMethod}`,
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
    }return NextResponse.json({
      success: true,
      message: paymentMethod === 'ONLINE' 
        ? 'Appointment created! Please complete payment to confirm your booking.'
        : bookingSettings.requireConfirmation 
          ? 'Appointment request submitted! You will receive a confirmation email once approved.'
          : 'Appointment booked successfully! You will receive a confirmation email shortly.',
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        paymentMethod: appointment.paymentMethod,
        paymentStatus: appointment.paymentStatus,
        paymentAmount: appointment.paymentAmount,
        service: {
          name: appointment.service.name,
          duration: appointment.service.duration,
          price: appointment.service.price
        },
        provider: {
          name: appointment.provider.name
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating public appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment. Please try again.' },
      { status: 500 }
    )
  }
}
