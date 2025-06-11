import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateWaitlistSchema = z.object({
  status: z.enum(['ACTIVE', 'NOTIFIED', 'BOOKED', 'CANCELLED', 'EXPIRED']).optional(),
  preferredDate: z.string().datetime().optional(),
  preferredTimeSlot: z.string().optional(),
  flexibleDates: z.boolean().optional(),
  flexibleTimes: z.boolean().optional(),
  notes: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
});

// GET /api/waitlist/[id] - Get specific waitlist entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = {
      id: id,
      tenantId: user.tenantId,
    };

    // Role-based access control
    if (user.role === 'PROVIDER') {
      where.providerId = session.user.id;
    } else if (user.role === 'CLIENT') {
      where.clientId = session.user.id;
    }

    const waitlistEntry = await prisma.waitlist.findFirst({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        provider: {
          select: { id: true, name: true, email: true }
        },
        service: {
          select: { id: true, name: true, duration: true, price: true }
        }
      }
    });

    if (!waitlistEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    return NextResponse.json({ waitlistEntry });

  } catch (error) {
    console.error('Error fetching waitlist entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist entry' },
      { status: 500 }
    );
  }
}

// PUT /api/waitlist/[id] - Update waitlist entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateWaitlistSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find existing waitlist entry
    const existingEntry = await prisma.waitlist.findFirst({
      where: {
        id: id,
        tenantId: user.tenantId,
        ...(user.role === 'CLIENT' ? { clientId: session.user.id } : {}),
        ...(user.role === 'PROVIDER' ? { providerId: session.user.id } : {})
      },
      include: {
        client: { select: { name: true, email: true } },
        provider: { select: { name: true, email: true } },
        service: { select: { name: true } }
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.status) {
      updateData.status = data.status;
      
      // Set notificationSent based on status
      if (data.status === 'NOTIFIED' && !existingEntry.notificationSent) {
        updateData.notificationSent = true;
        updateData.notifiedAt = new Date();
      }
    }
    
    if (data.preferredDate) updateData.preferredDate = new Date(data.preferredDate);
    if (data.preferredTimeSlot !== undefined) updateData.preferredTimeSlot = data.preferredTimeSlot;
    if (data.flexibleDates !== undefined) updateData.flexibleDates = data.flexibleDates;
    if (data.flexibleTimes !== undefined) updateData.flexibleTimes = data.flexibleTimes;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.priority) updateData.priority = data.priority;

    // Update waitlist entry
    const updatedEntry = await prisma.waitlist.update({
      where: { id: id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        provider: {
          select: { id: true, name: true, email: true }
        },
        service: {
          select: { id: true, name: true, duration: true, price: true }
        }
      }
    });

    // Create notification for status changes
    if (data.status && data.status !== existingEntry.status) {
      let notificationMessage = '';
      let notificationUserId = '';

      switch (data.status) {
        case 'BOOKED':
          notificationMessage = `${existingEntry.client.name} has booked an appointment from the waitlist for ${existingEntry.service.name}`;
          notificationUserId = existingEntry.providerId || '';
          break;
        case 'CANCELLED':
          notificationMessage = `Waitlist entry for ${existingEntry.service.name} has been cancelled`;
          notificationUserId = user.role === 'CLIENT' ? (existingEntry.providerId || '') : existingEntry.clientId;
          break;
        case 'EXPIRED':
          notificationMessage = `Waitlist entry for ${existingEntry.service.name} has expired`;
          notificationUserId = existingEntry.clientId;
          break;
      }

      if (notificationMessage && notificationUserId) {
        await prisma.notification.create({
          data: {
            type: 'waitlist_status_changed',
            title: 'Waitlist Status Updated',
            message: notificationMessage,
            userId: notificationUserId,
            tenantId: user.tenantId,
            data: JSON.stringify({
              waitlistId: id,
              oldStatus: existingEntry.status,
              newStatus: data.status,
              serviceName: existingEntry.service.name
            })
          }
        });
      }
    }

    return NextResponse.json({ waitlistEntry: updatedEntry });

  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update waitlist entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/waitlist/[id] - Remove from waitlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find existing waitlist entry
    const existingEntry = await prisma.waitlist.findFirst({
      where: {
        id: id,
        tenantId: user.tenantId,
        ...(user.role === 'CLIENT' ? { clientId: session.user.id } : {}),
        ...(user.role === 'PROVIDER' ? { providerId: session.user.id } : {})
      },
      include: {
        client: { select: { name: true, email: true } },
        provider: { select: { name: true, email: true } },
        service: { select: { name: true } }
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    // Delete the waitlist entry
    await prisma.waitlist.delete({
      where: { id: id }
    });

    // Create notification
    const notificationUserId = user.role === 'CLIENT' 
      ? (existingEntry.providerId || '') 
      : existingEntry.clientId;

    if (notificationUserId) {
      await prisma.notification.create({
        data: {
          type: 'waitlist_removed',
          title: 'Waitlist Entry Removed',
          message: `${existingEntry.client.name} has been removed from the waitlist for ${existingEntry.service.name}`,
          userId: notificationUserId,
          tenantId: user.tenantId,
          data: JSON.stringify({
            waitlistId: id,
            serviceName: existingEntry.service.name,
            clientName: existingEntry.client.name
          })
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Waitlist entry removed successfully' 
    });

  } catch (error) {
    console.error('Error removing waitlist entry:', error);
    return NextResponse.json(
      { error: 'Failed to remove waitlist entry' },
      { status: 500 }
    );
  }
}
