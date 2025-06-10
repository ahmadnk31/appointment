import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/tenants/resolve - Resolve tenant by domain or slug
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, slug } = body

    if (!domain && !slug) {
      return NextResponse.json(
        { error: 'Domain or slug is required' },
        { status: 400 }
      )
    }

    // Find tenant by domain or slug
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          // Domain matching
          ...(domain ? [
            { domain: domain },
            { domain: `https://${domain}` },
            { domain: `http://${domain}` },
            // Handle subdomain matching
            { slug: domain.split('.')[0] }
          ] : []),
          // Slug matching
          ...(slug ? [{ slug: slug }] : [])
        ]      },
      include: {
        settings: true
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: `Tenant not found for ${domain ? `domain: ${domain}` : `slug: ${slug}`}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      settings: tenant.settings
    })
  } catch (error) {
    console.error('Error resolving tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/tenants/resolve - Resolve tenant by domain or slug (via query params)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const slug = searchParams.get('slug')

    if (!domain && !slug) {
      return NextResponse.json(
        { error: 'Domain or slug is required' },
        { status: 400 }
      )
    }

    // Find tenant by domain or slug
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          // Domain matching
          ...(domain ? [
            { domain: domain },
            { domain: `https://${domain}` },
            { domain: `http://${domain}` },
            // Handle subdomain matching
            { slug: domain.split('.')[0] }
          ] : []),
          // Slug matching
          ...(slug ? [{ slug: slug }] : [])
        ]      },
      include: {
        settings: true
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: `Tenant not found for ${domain ? `domain: ${domain}` : `slug: ${slug}`}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      settings: tenant.settings
    })
  } catch (error) {
    console.error('Error resolving tenant (GET):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
