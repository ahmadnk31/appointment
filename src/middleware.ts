import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl
  
  // Get the hostname (remove port if present)
  const hostname = host.split(':')[0]  // Skip middleware for static files, auth API routes, tenant resolve API (to prevent circular calls), and special Next.js paths
  // But allow public API routes to get tenant context
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/tenants/resolve') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    (pathname.includes('.') && !pathname.startsWith('/api/'))
  ) {
    return NextResponse.next()
  }
  // Check for tenant parameter in development
  const tenantSlug = request.nextUrl.searchParams.get('tenant')
  
  // Check if this is a custom domain or subdomain
  const isCustomDomain = !hostname.includes('localhost') && !hostname.includes('vercel.app')
    if (isCustomDomain || tenantSlug) {
    console.log('Middleware: Resolving tenant', { hostname, tenantSlug, isCustomDomain })
    
    // For custom domains or tenant parameter, we need to resolve the tenant
    const tenantResponse = await fetch(`${request.nextUrl.origin}/api/tenants/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        domain: isCustomDomain ? hostname : null,
        slug: tenantSlug 
      })
    })

    console.log('Middleware: Tenant response status', tenantResponse.status)

    if (tenantResponse.ok) {
      const tenant = await tenantResponse.json()
      console.log('Middleware: Found tenant', tenant.slug)
        // Add tenant info to headers for the request
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-tenant-id', tenant.id)
      requestHeaders.set('x-tenant-slug', tenant.slug)
      requestHeaders.set('x-tenant-domain', hostname)

      // For API routes, just add headers and continue without rewriting URL
      if (pathname.startsWith('/api/')) {
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          }
        })
      }

      // Rewrite the URL to include tenant context
      const url = request.nextUrl.clone()
      
      // If accessing root domain, redirect to appropriate landing or dashboard
      if (pathname === '/') {
        // Check if user is authenticated
        const token = await getToken({ req: request })
        
        if (token) {
          // Redirect authenticated users to dashboard
          url.pathname = '/dashboard'
        } else {
          // Show tenant-specific landing page
          url.pathname = '/tenant-landing'
        }
      }      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        }
      })
    } else {
      console.log('Middleware: Tenant not found, creating error response')
      const errorResponse = await tenantResponse.text()
      console.log('Middleware: Error details', errorResponse)
      
      // Create a simple error page instead of redirecting
      return new NextResponse(`
        <html>
          <body>
            <h1>Domain Not Found</h1>
            <p>This domain is not associated with any active business.</p>
            <p>Debug info: ${tenantSlug ? `slug: ${tenantSlug}` : `domain: ${hostname}`}</p>
            <p>Error: ${errorResponse}</p>
            <a href="http://localhost:3000">Go to main site</a>
          </body>
        </html>
      `, {
        status: 404,
        headers: { 'content-type': 'text/html' }
      })
    }
  }

  // For localhost and main domain, continue normally
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
