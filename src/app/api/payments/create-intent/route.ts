import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// POST /api/payments/create-intent - Create a payment intent for Stripe
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { appointmentId, amount, currency = 'usd' } = body

    if (!appointmentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentId, amount' },
        { status: 400 }
      )
    }

    // Verify the appointment exists and belongs to this tenant
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        service: true,
        client: true,
        provider: true,
        tenant: {
          include: {
            settings: true
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if payment already exists
    if (appointment.stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Payment already exists for this appointment' },
        { status: 400 }
      )
    }

    // Get tenant's Stripe Connect account
    const tenantSettings = appointment.tenant.settings
    if (!tenantSettings?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Business has not set up payment processing yet' },
        { status: 400 }
      )
    }

    // Calculate platform commission
    const commissionRate = tenantSettings.commissionRate || 0.05 // 5% default
    const platformCommission = Math.round(amount * commissionRate * 100) // In cents
    const businessAmount = Math.round(amount * 100) - platformCommission // In cents

    // Create payment intent with application fee (platform commission)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      application_fee_amount: platformCommission,
      transfer_data: {
        destination: tenantSettings.stripeAccountId,
      },
      metadata: {
        appointmentId: appointment.id,
        tenantId,
        clientId: appointment.clientId,
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
        platformCommission: (platformCommission / 100).toString(),
        businessRevenue: (businessAmount / 100).toString(),
      },
      description: `Payment for ${appointment.service.name} appointment`,
    })

    // Update appointment with payment intent ID and commission details
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentAmount: amount,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PENDING',
        platformCommission: platformCommission / 100,
        businessRevenue: businessAmount / 100,
      }
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
