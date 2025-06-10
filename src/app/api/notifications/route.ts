import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where = {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      ...(unreadOnly && { read: false })
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          read: false
        }
      })
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total: notifications.length
      }
    })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      type, 
      title, 
      message, 
      data, 
      priority = 'medium',
      targetUserId 
    } = await request.json()

    // Only allow admins to send notifications to other users
    const userId = targetUserId && session.user.role === 'ADMIN' 
      ? targetUserId 
      : session.user.id

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        priority,
        userId,
        tenantId: session.user.tenantId,
        read: false
      }
    })

    // In a real implementation, you'd send this via WebSocket
    // For now, we'll just return the created notification
    
    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Notification creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
