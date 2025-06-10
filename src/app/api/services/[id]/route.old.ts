import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/services/[id] - Get a specific service
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        provider: { select: { id: true, name: true, email: true } },
      },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/services/[id] - Update a service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only providers and admins can update services
    if (!['PROVIDER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, duration, price } = await request.json()

    // Validate required fields
    if (!name || !duration || price === undefined) {
      return NextResponse.json(
        { error: 'Name, duration, and price are required' },
        { status: 400 }
      )
    }

    // Check if service exists and belongs to the user's tenant
    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // For providers, ensure they can only update their own services
    if (session.user.role === 'PROVIDER' && existingService.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: {
        name,
        description,
        duration: parseInt(duration),
        price: parseFloat(price),
      },
      include: {
        provider: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/services/[id] - Partially update a service (e.g., toggle active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {id}=await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only providers and admins can update services
    if (!['PROVIDER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = await request.json()

    // Check if service exists and belongs to the user's tenant
    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // For providers, ensure they can only update their own services
    if (session.user.role === 'PROVIDER' && existingService.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: updates,
      include: {
        provider: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/services/[id] - Delete a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only providers and admins can delete services
    if (!['PROVIDER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if service exists and belongs to the user's tenant
    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // For providers, ensure they can only delete their own services
    if (session.user.role === 'PROVIDER' && existingService.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if there are any appointments associated with this service
    const appointmentsCount = await prisma.appointment.count({
      where: {
        serviceId: params.id,
        status: 'PENDING',
      },
    })

    if (appointmentsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with scheduled appointments' },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
