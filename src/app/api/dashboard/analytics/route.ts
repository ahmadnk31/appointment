import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subWeeks, subMonths, subQuarters, subYears, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'month'
    const requestedTenantId = searchParams.get('tenantId')
    
    // Determine which tenant to query for
    let tenantId = session.user.tenantId
    if (requestedTenantId && session.user.role === 'ADMIN') {
      tenantId = requestedTenantId
    }
    
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant specified' }, { status: 400 })
    }

    // Calculate date ranges
    const now = new Date()
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    switch (timeRange) {
      case 'week':
        currentStart = startOfWeek(now)
        currentEnd = endOfWeek(now)
        previousStart = startOfWeek(subWeeks(now, 1))
        previousEnd = endOfWeek(subWeeks(now, 1))
        break
      case 'quarter':
        currentStart = startOfQuarter(now)
        currentEnd = endOfQuarter(now)
        previousStart = startOfQuarter(subQuarters(now, 1))
        previousEnd = endOfQuarter(subQuarters(now, 1))
        break
      case 'year':
        currentStart = startOfYear(now)
        currentEnd = endOfYear(now)
        previousStart = startOfYear(subYears(now, 1))
        previousEnd = endOfYear(subYears(now, 1))
        break
      default: // month
        currentStart = startOfMonth(now)
        currentEnd = endOfMonth(now)
        previousStart = startOfMonth(subMonths(now, 1))
        previousEnd = endOfMonth(subMonths(now, 1))
    }

    // Build filters based on user role
    const appointmentFilter: any = { 
      tenantId,
      status: { not: 'CANCELLED' }
    }
    
    if (session.user.role === 'PROVIDER') {
      appointmentFilter.providerId = session.user.id
    } else if (session.user.role === 'CLIENT') {
      appointmentFilter.clientId = session.user.id
    }    // Get current period stats
    const [
      currentAppointments,
      previousAppointments,
      currentRevenue,
      previousRevenue,
      totalClients,
      completedAppointments,
      totalAppointments
    ] = await Promise.all([
      // Current period appointments
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          startTime: { gte: currentStart, lte: currentEnd }
        }
      }),
      
      // Previous period appointments
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          startTime: { gte: previousStart, lte: previousEnd }
        }
      }),
      
      // Current period revenue
      prisma.appointment.aggregate({
        where: {
          ...appointmentFilter,
          startTime: { gte: currentStart, lte: currentEnd },
          paymentStatus: 'PAID'
        },
        _sum: { paymentAmount: true }
      }),
      
      // Previous period revenue
      prisma.appointment.aggregate({
        where: {
          ...appointmentFilter,
          startTime: { gte: previousStart, lte: previousEnd },
          paymentStatus: 'PAID'
        },
        _sum: { paymentAmount: true }
      }),
      
      // Total unique clients
      prisma.appointment.findMany({
        where: appointmentFilter,
        select: { clientId: true },
        distinct: ['clientId']
      }),
      
      // Completed appointments for completion rate
      prisma.appointment.count({
        where: {
          ...appointmentFilter,
          status: 'COMPLETED'
        }
      }),
      
      // Total appointments
      prisma.appointment.count({
        where: appointmentFilter
      })
    ])    // Calculate growth percentages
    const appointmentGrowth = previousAppointments > 0 
      ? Math.round(((currentAppointments - previousAppointments) / previousAppointments) * 100)
      : currentAppointments > 0 ? 100 : 0

    const currentRevenueAmount = currentRevenue._sum.paymentAmount || 0
    const previousRevenueAmount = previousRevenue._sum.paymentAmount || 0
    const revenueGrowth = previousRevenueAmount > 0 
      ? Math.round(((currentRevenueAmount - previousRevenueAmount) / previousRevenueAmount) * 100)
      : currentRevenueAmount > 0 ? 100 : 0

    const completionRate = totalAppointments > 0 
      ? Math.round((completedAppointments / totalAppointments) * 100)
      : 0

    // Get monthly stats for the last 6 months
    const monthlyStats = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))
        const [monthAppointments, monthRevenue, newClients] = await Promise.all([
        prisma.appointment.count({
          where: {
            ...appointmentFilter,
            startTime: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.appointment.aggregate({
          where: {
            ...appointmentFilter,
            startTime: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'PAID'
          },
          _sum: { paymentAmount: true }
        }),
        prisma.user.count({
          where: {
            tenantId,
            role: 'CLIENT',
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ])

      monthlyStats.push({
        month: format(monthStart, 'MMM yyyy'),
        appointments: monthAppointments,
        revenue: monthRevenue._sum.paymentAmount || 0,
        newClients
      })
    }    // Get service performance stats
    const serviceStats = await prisma.service.findMany({
      where: { tenantId, isActive: true },
      include: {
        appointments: {
          where: {
            ...appointmentFilter,
            startTime: { gte: currentStart, lte: currentEnd }
          }
        }
      }
    })

    const servicePerformance = serviceStats.map(service => ({
      serviceName: service.name,
      bookings: service.appointments.length,
      revenue: service.appointments.reduce((sum: number, apt: any) => 
        sum + (apt.paymentAmount || 0), 0),
      avgRating: 0 // No rating system yet
    })).sort((a, b) => b.bookings - a.bookings)

    // Get time slot distribution
    const timeSlotStats = await prisma.appointment.findMany({
      where: {
        ...appointmentFilter,
        startTime: { gte: currentStart, lte: currentEnd }
      },
      select: { startTime: true }
    })

    const hourDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      bookings: timeSlotStats.filter(apt => 
        new Date(apt.startTime).getHours() === hour
      ).length
    })).filter(slot => slot.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings)    // Get top clients (if not a client themselves)
    let topClients: Array<{
      name: string;
      email: string;
      totalAppointments: number;
      totalSpent: number;
    }> = []
    
    if (session.user.role !== 'CLIENT') {
      const clientAppointments = await prisma.appointment.groupBy({
        by: ['clientId'],
        where: {
          ...appointmentFilter,
          status: { not: 'CANCELLED' }
        },
        _count: { id: true },
        _sum: { 
          paymentAmount: true
        },
        orderBy: {
          _count: { id: 'desc' }
        },
        take: 10
      })

      const clientIds = clientAppointments.map(ca => ca.clientId)
      const clients = await prisma.user.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true, email: true }
      })

      topClients = clientAppointments.map(ca => {
        const client = clients.find(c => c.id === ca.clientId)
        return {
          name: client?.name || 'Unknown Client',
          email: client?.email || '',
          totalAppointments: ca._count?.id || 0,
          totalSpent: ca._sum?.paymentAmount || 0
        }
      })
    }    const analytics = {
      overview: {
        totalAppointments: currentAppointments,
        totalRevenue: currentRevenueAmount,
        totalClients: totalClients.length,
        averageRating: 0, // No rating system yet
        appointmentGrowth,
        revenueGrowth,
        clientGrowth: 0, // Could calculate this if needed
        completionRate
      },
      monthlyStats,
      serviceStats: servicePerformance,
      timeSlotStats: hourDistribution,
      topClients
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
