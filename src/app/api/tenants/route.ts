import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/tenants - List all tenants (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can view all tenants
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            services: true,
            appointments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(tenants)
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Create new tenant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can create tenants
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      slug, 
      domain, 
      businessName, 
      businessEmail, 
      businessPhone, 
      businessAddress,
      timeZone,
      adminName,
      adminEmail,
      adminPassword
    } = body

    // Validate required fields
    if (!name || !slug || !businessName || !businessEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if slug or domain already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug },
          ...(domain ? [{ domain }] : [])
        ]
      }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Tenant slug or domain already exists' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Admin email already exists' },
        { status: 400 }
      )
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Create tenant with settings and admin user in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          domain: domain || null,
        }
      })

      // Create tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: newTenant.id,
          businessName,
          businessEmail,
          businessPhone: businessPhone || null,
          businessAddress: businessAddress || null,
          timeZone: timeZone || 'UTC',
          workingHours: {
            monday: { start: '09:00', end: '17:00', enabled: true },
            tuesday: { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday: { start: '09:00', end: '17:00', enabled: true },
            friday: { start: '09:00', end: '17:00', enabled: true },
            saturday: { start: '09:00', end: '13:00', enabled: false },
            sunday: { start: '09:00', end: '17:00', enabled: false }
          },
          bookingSettings: {
            enableOnlineBooking: true,
            requireConfirmation: true,
            allowCancellation: true,
            cancellationDeadline: 24, // hours
            bufferTime: 15, // minutes
            maxAdvanceBooking: 30 // days
          },          emailSettings: {
            sendConfirmation: true,
            sendReminder: true,
            reminderTime: 24, // hours before appointment
            fromName: businessName,
            fromEmail: businessEmail
          },
          paymentSettings: {
            enablePayments: true,
            acceptCash: true,
            acceptOnline: false, // Start with cash only for simplicity
            currency: 'USD',
            requirePaymentUpfront: false,
            stripeSettings: {
              publicKey: '',
              secretKey: '',
              webhookSecret: ''
            }
          },
          cancellationSettings: {
            allowCancellation: true,
            cancellationDeadlineHours: 24,
            refundPolicy: 'full',
            partialRefundPercentage: 50,
            requireReason: true,
            notifyProvider: true,
            notifyClient: true
          }
        }
      })

      // Create admin user
      await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          tenantId: newTenant.id,
          isActive: true,
          emailVerified: new Date()
        }
      })

      return newTenant
    })

    // Fetch complete tenant data to return
    const completeTenant = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            services: true,
            appointments: true
          }
        }
      }
    })

    return NextResponse.json(completeTenant, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
