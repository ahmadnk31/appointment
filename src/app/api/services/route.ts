import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/services - Get services
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const requestedTenantId = searchParams.get('tenantId')

    // Determine which tenant to query for
    let tenantId = session.user.tenantId
    
    // Allow admin users to query specific tenants
    if (requestedTenantId && session.user.role === 'ADMIN') {
      tenantId = requestedTenantId
    }

    const where: any = {
      tenantId: tenantId,
      isActive: true,
    }

    if (providerId) {
      where.providerId = providerId
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only providers and admins can create services
    if (!['PROVIDER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }    const body = await request.json()
    const { name, description, duration, price, providerId, imageUrl, imageKey } = body

    // Validate required fields
    if (!name || !duration || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // If user is a provider, they can only create services for themselves
    let finalProviderId = providerId
    if (session.user.role === 'PROVIDER') {
      finalProviderId = session.user.id
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        duration: parseInt(duration),
        price: parseFloat(price),
        tenantId: session.user.tenantId,
        providerId: finalProviderId,
        imageUrl: imageUrl || null,
        imageKey: imageKey || null,
      },
      include: {
        provider: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
