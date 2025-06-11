import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/appointments/check-availability - Check if time slot is available
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
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')

    if (!providerId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: providerId, startTime, endTime' },
        { status: 400 }
      )
    }

    const startDateTime = new Date(startTime)
    const endDateTime = new Date(endTime)

    // Check for conflicting appointments
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        providerId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        },
        OR: [
          {
            // New appointment starts during existing appointment
            startTime: {
              lte: startDateTime
            },
            endTime: {
              gt: startDateTime
            }
          },
          {
            // New appointment ends during existing appointment
            startTime: {
              lt: endDateTime
            },
            endTime: {
              gte: endDateTime
            }
          },
          {
            // New appointment completely contains existing appointment
            startTime: {
              gte: startDateTime
            },
            endTime: {
              lte: endDateTime
            }
          }
        ]
      }
    })

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      available: true,
      message: 'Time slot is available'
    })

  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}
