import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tenants/[id] - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const {id:tenantId}=await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    

    // Admin can view any tenant, others can only view their own
    if (session.user.role !== 'ADMIN' && session.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true
          }
        },
        _count: {
          select: {
            users: true,
            services: true,
            appointments: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/tenants/[id] - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = id
    
    // Admin can update any tenant, others can only update their own
    if (session.user.role !== 'ADMIN' && session.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, domain, settings } = body

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Update tenant and settings in transaction
    const updatedTenant = await prisma.$transaction(async (tx) => {
      // Update tenant basic info
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          ...(name && { name }),
          ...(domain !== undefined && { domain: domain || null })
        }
      })

      // Update settings if provided
      if (settings) {
        await tx.tenantSettings.upsert({
          where: { tenantId },
          update: settings,
          create: {
            tenantId,
            businessName: settings.businessName || name,
            businessEmail: settings.businessEmail,
            ...settings
          }
        })
      }

      return tenant
    })

    // Fetch complete updated tenant
    const completeTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
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

    return NextResponse.json(completeTenant)
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenants/[id] - Delete tenant (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can delete tenants
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const tenantId = id

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            appointments: true
          }
        }
      }
    })

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Prevent deletion if tenant has active data
    if (existingTenant._count.users > 0 || existingTenant._count.appointments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tenant with existing users or appointments' },
        { status: 400 }
      )
    }

    // Delete tenant (cascade will handle related records)
    await prisma.tenant.delete({
      where: { id: tenantId }
    })

    return NextResponse.json({ message: 'Tenant deleted successfully' })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
