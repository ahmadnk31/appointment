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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        appointmentId: appointment.id,
        tenantId,
        clientId: appointment.clientId,
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
      },
      description: `Payment for ${appointment.service.name} appointment`,
    })

    // Update appointment with payment intent ID
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentAmount: amount,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PENDING',
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
