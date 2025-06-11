import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// POST /api/payments/connect/onboard - Create Stripe Connect account for tenant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'PROVIDER')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or Provider access required.' },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId

    // Check if tenant already has a Stripe account
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      include: { tenant: true }
    })

    if (!tenantSettings) {
      return NextResponse.json(
        { error: 'Tenant settings not found' },
        { status: 404 }
      )
    }

    if (tenantSettings.stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account already exists for this tenant' },
        { status: 400 }
      )
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You can make this configurable
      email: tenantSettings.businessEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      company: {
        name: tenantSettings.businessName,
      },
      metadata: {
        tenantId: tenantId,
        businessName: tenantSettings.businessName,
      }
    })

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=payment&refresh=true`,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=payment&success=true`,
      type: 'account_onboarding',
    })

    // Update tenant settings with Stripe account info
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: 'pending',
        stripeOnboardingUrl: accountLink.url,
      }
    })

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: 'Stripe Connect account created successfully'
    })

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    )
  }
}

// GET /api/payments/connect/onboard - Check Stripe Connect account status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'PROVIDER')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin or Provider access required.' },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId

    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    })

    if (!tenantSettings?.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        status: null,
        message: 'No Stripe account connected'
      })
    }

    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(tenantSettings.stripeAccountId)
    
    const isFullyOnboarded = account.details_submitted && 
                            account.charges_enabled && 
                            account.payouts_enabled

    const status = isFullyOnboarded ? 'active' : 
                   account.details_submitted ? 'restricted' : 'pending'

    // Update status in database if changed
    if (tenantSettings.stripeAccountStatus !== status) {
      await prisma.tenantSettings.update({
        where: { tenantId },
        data: { stripeAccountStatus: status }
      })
    }

    return NextResponse.json({
      connected: true,
      status: status,
      accountId: tenantSettings.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      message: isFullyOnboarded ? 'Account fully set up' : 'Account setup incomplete'
    })

  } catch (error) {
    console.error('Error checking Stripe Connect status:', error)
    return NextResponse.json(
      { error: 'Failed to check account status' },
      { status: 500 }
    )
  }
}
