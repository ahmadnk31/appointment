import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, role } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 409 }
        )
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Update user status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admin from deactivating themselves
    if (params.id === session.user.id && !isActive) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admin from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user and related appointments
    await prisma.$transaction(async (tx) => {
      // Delete appointments where user is client or provider
      await tx.appointment.deleteMany({
        where: {
          OR: [
            { clientId: params.id },
            { providerId: params.id }
          ]
        }
      })

      // Delete the user
      await tx.user.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
