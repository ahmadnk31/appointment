import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Type definitions for settings
interface BookingSettings {
  enableOnlineBooking?: boolean
  requireConfirmation?: boolean
  allowCancellation?: boolean
  cancellationDeadline?: number
  bufferTime?: number
  maxAdvanceBooking?: number
}

interface WorkingHours {
  [key: string]: {
    start: string
    end: string
    enabled: boolean
  }
}

// GET /api/appointments/availability - Get available time slots for a provider on a specific date
export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const date = searchParams.get('date')

    if (!providerId || !date) {
      return NextResponse.json(
        { error: 'Provider ID and date are required' },
        { status: 400 }
      )
    }

    // Validate date format
    const selectedDate = new Date(date)
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Get tenant settings for working hours
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    })

    if (!tenantSettings) {
      return NextResponse.json(
        { error: 'Tenant settings not found' },
        { status: 404 }
      )
    }    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[selectedDate.getDay()]
    
    const workingHours = tenantSettings.workingHours as WorkingHours || {}
    const dayHours = workingHours[dayName]

    if (!dayHours || !dayHours.enabled) {
      return NextResponse.json([]) // No availability for this day
    }// Generate time slots based on working hours
    const [startHour, startMinute] = dayHours.start.split(':').map(Number)
    const [endHour, endMinute] = dayHours.end.split(':').map(Number)
    
    const slots = []
    const slotDuration = 30 // 30-minute slots
    const bookingSettings = tenantSettings.bookingSettings as BookingSettings || {}
    const bufferTime = bookingSettings.bufferTime || 0

    let currentTime = new Date(selectedDate)
    currentTime.setHours(startHour, startMinute, 0, 0)
    
    const endTime = new Date(selectedDate)
    endTime.setHours(endHour, endMinute, 0, 0)

    // Get existing appointments for this provider on this date
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        providerId,
        tenantId,
        status: { notIn: ['CANCELLED'] },
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        startTime: true,
        endTime: true
      }
    })

    // Generate available slots
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
      
      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.startTime)
        const appointmentEnd = new Date(appointment.endTime)
        
        // Add buffer time to existing appointments
        appointmentStart.setMinutes(appointmentStart.getMinutes() - bufferTime)
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + bufferTime)
        
        return (
          (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
          (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
          (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
        )
      })

      // Check if slot is in the past
      const now = new Date()
      const isPast = currentTime <= now

      slots.push({
        time: currentTime.toTimeString().slice(0, 5), // HH:MM format
        available: !hasConflict && !isPast,
        datetime: currentTime.toISOString()
      })

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + slotDuration * 60000)
    }

    return NextResponse.json(slots)
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
