import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant parameter from query string (for admin/multi-tenant scenarios)
    const { searchParams } = new URL(request.url)
    const requestedTenantId = searchParams.get('tenantId')
    
    // Determine which tenant to query for
    let tenantId = session.user.tenantId
    
    // Allow admin users to query specific tenants
    if (requestedTenantId && session.user.role === 'ADMIN') {
      tenantId = requestedTenantId
    }
    
    // For non-admin users, always use their own tenant
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant specified' }, { status: 400 })
    }    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    console.log('Dashboard stats debug:', {
      today: today.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      tenantId,
      userRole: session.user.role
    })

    // Build filters based on user role
    const appointmentFilter: any = { tenantId }
    const clientFilter: any = { tenantId }
    
    if (session.user.role === 'PROVIDER') {
      appointmentFilter.providerId = session.user.id
    } else if (session.user.role === 'CLIENT') {
      appointmentFilter.clientId = session.user.id
      // Clients can only see their own stats
      clientFilter.id = session.user.id
    }    // Get statistics in parallel
    const [
      totalAppointments,
      todayAppointments,
      totalClients,
      totalServices,
      thisMonthAppointments,
      lastMonthAppointments,
      recentAppointments
    ] = await Promise.all([
      // Total appointments
      prisma.appointment.count({
        where: appointmentFilter
      }),
      
      // Today's appointments
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          startTime: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      
      // Total clients (only for admin/provider)
      session.user.role === 'CLIENT' ? 1 : prisma.user.count({
        where: {
          ...clientFilter,
          role: 'CLIENT'
        }
      }),
      
      // Total services
      prisma.service.count({
        where: { tenantId }
      }),
      
      // This month's appointments for growth calculation
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          startTime: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
          }
        }
      }),
        // Last month's appointments for growth calculation
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          startTime: {
            gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            lt: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      }),

      // Recent appointments for activity feed
      prisma.appointment.findMany({
        where: appointmentFilter,
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { name: true } },
          service: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ])

    console.log('Dashboard stats results:', {
      totalAppointments,
      todayAppointments,
      totalClients,
      totalServices,
      recentAppointmentsCount: recentAppointments.length
    })

    // Calculate growth percentage
    const growthPercentage = lastMonthAppointments > 0 
      ? ((thisMonthAppointments - lastMonthAppointments) / lastMonthAppointments * 100).toFixed(1)
      : thisMonthAppointments > 0 ? '100.0' : '0.0'

    return NextResponse.json({
      totalAppointments,
      todayAppointments,
      totalClients,
      totalServices,
      growthPercentage: `${growthPercentage}%`,
      thisMonthAppointments,
      lastMonthAppointments,
      recentActivity: recentAppointments.map(apt => ({
        id: apt.id,
        type: 'appointment',
        title: `${apt.service.name} with ${apt.client.name}`,
        subtitle: `Provider: ${apt.provider.name}`,
        time: apt.createdAt,
        status: apt.status
      }))
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
