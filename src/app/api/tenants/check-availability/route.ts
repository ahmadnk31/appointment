import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/tenants/check-availability - Check if slug/subdomain is available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Check if slug meets requirements
    if (slug.length < 3 || slug.length > 30) {
      return NextResponse.json({
        available: false,
        error: 'Slug must be between 3 and 30 characters'
      })
    }

    if (!/^[a-z0-9\-]+$/.test(slug)) {
      return NextResponse.json({
        available: false,
        error: 'Slug can only contain lowercase letters, numbers, and hyphens'
      })
    }

    // Check if slug is reserved
    const reservedSlugs = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 
      'help', 'support', 'docs', 'status', 'dashboard', 'login', 
      'signup', 'register', 'auth', 'account', 'billing', 'settings'
    ]

    if (reservedSlugs.includes(slug)) {
      return NextResponse.json({
        available: false,
        error: 'This subdomain is reserved'
      })
    }

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { slug }
    })

    return NextResponse.json({
      available: !existingTenant,
      slug
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
