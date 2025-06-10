import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { EmailService } from '@/lib/email'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// POST /api/payments/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
          // Find and update appointment payment status
        const appointment = await prisma.appointment.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id
          },
          include: {
            client: { select: { id: true, name: true, email: true } },
            provider: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
            tenant: { select: { name: true } },
          }
        })

        if (appointment) {
          await prisma.appointment.update({
            where: {
              id: appointment.id
            },
            data: {
              paymentStatus: 'PAID',
              stripeChargeId: paymentIntent.latest_charge as string,
              status: 'CONFIRMED', // Auto-confirm on successful payment
            }
          })

          // Send payment confirmation email
          try {
            const emailService = EmailService.getInstance()
            await emailService.sendPaymentConfirmation(
              appointment.client.email,
              appointment.client.name,
              {
                serviceName: appointment.service.name,
                providerName: appointment.provider.name,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                tenantName: appointment.tenant.name,
                paymentAmount: appointment.paymentAmount || 0,
              }
            )
          } catch (emailError) {
            console.error('Error sending payment confirmation email:', emailError)
          }
        }console.log('Payment succeeded for payment intent:', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object
          // Find and update appointment payment status to failed
        const failedAppointment = await prisma.appointment.findFirst({
          where: {
            stripePaymentIntentId: failedPayment.id
          },
          include: {
            client: { select: { id: true, name: true, email: true } },
            provider: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
            tenant: { select: { name: true } },
          }
        })

        if (failedAppointment) {
          await prisma.appointment.update({
            where: {
              id: failedAppointment.id
            },
            data: {
              paymentStatus: 'FAILED',
            }
          })

          // Send payment failure email
          try {
            const emailService = EmailService.getInstance()
            await emailService.sendPaymentFailure(
              failedAppointment.client.email,
              failedAppointment.client.name,
              {
                serviceName: failedAppointment.service.name,
                providerName: failedAppointment.provider.name,
                startTime: failedAppointment.startTime,
                tenantName: failedAppointment.tenant.name,
                paymentAmount: failedAppointment.paymentAmount || 0,
              }
            )
          } catch (emailError) {
            console.error('Error sending payment failure email:', emailError)
          }
        }console.log('Payment failed for payment intent:', failedPayment.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
