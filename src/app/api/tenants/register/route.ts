import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/tenants/register - Public tenant registration (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      slug, 
      businessName, 
      businessEmail, 
      businessPhone, 
      businessAddress,
      timeZone,
      adminName,
      adminEmail,
      adminPassword,
      marketingOptIn
    } = body

    // Validate required fields
    if (!name || !slug || !businessName || !businessEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }    // Validate slug format
    if (slug.length < 3 || slug.length > 30 || !/^[a-z0-9\-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if slug is available
    const existingTenant = await prisma.tenant.findFirst({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email address is already registered' },
        { status: 400 }
      )
    }    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Create tenant with settings and admin user in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          // Generate default domain as subdomain
          domain: `${slug}.appointmenthub.com`,
        }
      })

      // Create tenant settings with defaults
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
            requireConfirmation: false, // Start with immediate booking for easier onboarding
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

      // Create admin user (email not verified initially)
      await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          tenantId: newTenant.id,
          isActive: true,
          // emailVerified: null - Will be set when user verifies email
        }
      })

      return newTenant
    })

    // TODO: Send welcome email with email verification link
    // await sendWelcomeEmail(adminEmail, adminName, tenant.slug)

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email for verification instructions.',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error registering tenant:', error)
    
    // Check for unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email or subdomain already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
