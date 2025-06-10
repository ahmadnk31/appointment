import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/services/public - Get public services for tenant (no auth required)
export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    const where: any = {
      tenantId,
      isActive: true,
    }

    if (providerId) {
      where.providerId = providerId
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching public services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
